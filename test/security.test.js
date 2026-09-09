const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');

test('account security flows use real PostgreSQL semantics and a stub email transport',async t=>{
    process.env.NODE_ENV='test'; process.env.BCRYPT_ROUNDS='10';
    const {PGlite}=await import('@electric-sql/pglite');
    const database=new PGlite();
    await database.exec(await fs.readFile(path.join(__dirname,'../database/schema.sql'),'utf8'));
    // PGlite has one connection. Serialize transactions like a single pool client.
    let queue=Promise.resolve();
    const db={query:(...a)=>database.query(...a),ping:()=>database.query('SELECT 1'),withTransaction:fn=>{
        const task=queue.then(async()=>{await database.exec('BEGIN');try{const r=await fn(database);await database.exec('COMMIT');return r;}catch(e){await database.exec('ROLLBACK');throw e;}});
        queue=task.catch(()=>{});return task;
    }};
    const dbPath=require.resolve('../config/db');
    require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:db};
    const mail=require('../services/email'); const sent=[];
    mail.sendCode=async(email,code,purpose)=>{sent.push({email,code,purpose});};
    const otp=require('../services/otp');
    const app=require('../app');
    const server=app.listen(0); await new Promise(r=>server.once('listening',r));
    t.after(async()=>{await new Promise(r=>server.close(r));await database.close();});
    const base='http://127.0.0.1:'+server.address().port+'/api';
    const req=async(route,body,token,method=body?'POST':'GET')=>{
        const response=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});
        return {status:response.status,body:response.status===204?null:await response.json(),headers:response.headers};
    };
    const resetLimits=async()=>{await database.exec('DELETE FROM auth_delivery_limits');require('../middleware/rateLimiters').authLimiter.resetKey('127.0.0.1');};
    const password='orchid river bronze constellation';
    const details={email:'one@example.com',full_name:'First Collector',phone:'0821234567',password};
    let first, second;
    await t.test('registration cannot authenticate before OTP and ignores a supplied admin role',async()=>{
        const start=await req('/auth/register',{...details,role:'admin'});
        assert.equal(start.status,202);assert.equal(start.body.token,undefined);
        assert.equal((await database.query('SELECT * FROM users')).rows.length,0);
        const record=(await database.query('SELECT * FROM auth_challenges')).rows[0];
        assert.equal(record.code_hash.length,64);assert.notEqual(record.code_hash,sent.at(-1).code);
        assert.equal(record.payload.password,undefined);
        first=await req('/auth/verify',{challenge_id:start.body.challenge_id,code:sent.at(-1).code});
        assert.equal(first.status,200);assert.equal(first.body.user.role,'customer');assert.ok(first.body.user.email_verified_at);
        assert.equal(first.body.user.password_hash,undefined);assert.equal(first.headers.get('cache-control'),'no-store');
        assert.equal((await req('/auth/verify',{challenge_id:start.body.challenge_id,code:sent.at(-1).code})).status,400);
    });
    await t.test('logout followed by immediate login sends a fresh code without bypassing the hourly limit',async()=>{
        // Do not clear delivery limits: this reproduces the real consecutive login flow.
        assert.equal((await req('/auth/logout',{},first.body.token)).status,204);
        const count=sent.length;
        const login=await req('/auth/login',{email:details.email,password});
        assert.equal(login.status,202);assert.equal(sent.length,count+1);
        const code=sent.at(-1).code;
        const repeated=await req('/auth/login',{email:details.email,password});
        assert.equal(repeated.status,429);assert.ok(Number(repeated.headers.get('retry-after'))>0);
        first=await req('/auth/verify',{challenge_id:login.body.challenge_id,code});
        assert.equal(first.status,200);
        await database.exec('UPDATE auth_delivery_limits SET sends=5');
        const hourly=await req('/auth/login',{email:details.email,password});
        assert.equal(hourly.status,429);
    });
    await t.test('eight-character passwords are accepted and seven-character passwords are rejected',async()=>{
        await resetLimits();
        const short=await req('/auth/register',{...details,email:'short@example.com',password:'Abc123!'});
        assert.equal(short.status,400);
        const eight=await req('/auth/register',{...details,email:'eight@example.com',password:'Abc123!?'});
        assert.equal(eight.status,202);
    });
    await t.test('codes expire and five wrong attempts permanently exhaust a challenge',async()=>{
        await resetLimits();
        let challenge=await otp.issue('expired@example.com','reset',{});
        await database.query("UPDATE auth_challenges SET expires_at=NOW()-INTERVAL '1 minute' WHERE id=$1",[challenge.challenge_id]);
        await assert.rejects(()=>otp.consume(challenge.challenge_id,sent.at(-1).code,()=>({ok:true})),/invalid/);
        challenge=await otp.issue('wrong@example.com','reset',{});const correct=sent.at(-1).code;
        const wrong=correct==='000000'?'111111':'000000';
        for(let i=0;i<5;i++) await assert.rejects(()=>otp.consume(challenge.challenge_id,wrong,()=>({ok:true})),/invalid/);
        await assert.rejects(()=>otp.consume(challenge.challenge_id,correct,()=>({ok:true})),/invalid/);
        assert.equal((await database.query('SELECT attempts FROM auth_challenges WHERE id=$1',[challenge.challenge_id])).rows[0].attempts,5);
    });
    await t.test('recipient cooldown, hourly quota, resend invalidation and email failure rollback',async()=>{
        await resetLimits();const challenge=await otp.issue('limit@example.com','reset',{});const oldCode=sent.at(-1).code;
        await assert.rejects(()=>otp.issue('limit@example.com','reset',{}),e=>e.statusCode===429);
        for(let i=0;i<4;i++){
            await database.exec("UPDATE auth_delivery_limits SET last_sent_at=NOW()-INTERVAL '61 seconds'");
            await otp.issue('limit@example.com','reset',{});
        }
        await database.exec("UPDATE auth_delivery_limits SET last_sent_at=NOW()-INTERVAL '61 seconds'");
        await assert.rejects(()=>otp.issue('limit@example.com','reset',{}),e=>e.statusCode===429);
        await assert.rejects(()=>otp.consume(challenge.challenge_id,oldCode,()=>({ok:true})),/invalid/);
        const original=mail.sendCode;mail.sendCode=async()=>{throw new Error('transport unavailable');};
        await assert.rejects(()=>otp.issue('failure@example.com','register',{}),/transport/);
        mail.sendCode=original;
        assert.equal((await database.query("SELECT * FROM auth_challenges WHERE email='failure@example.com'")).rows.length,0);
    });
    await t.test('concurrent verification consumes a code only once',async()=>{
        const c=await otp.issue('concurrent@example.com','reset',{});const code=sent.at(-1).code;
        const results=await Promise.allSettled([otp.consume(c.challenge_id,code,()=>({ok:true})),otp.consume(c.challenge_id,code,()=>({ok:true}))]);
        assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    });
    await t.test('login requires a second step and pre-upgrade JWTs cannot bypass it',async()=>{
        await resetLimits();const start=await req('/auth/login',{email:details.email,password});
        assert.equal(start.status,202);assert.equal(start.body.token,undefined);
        const env=require('../config/env');const jwt=require('jsonwebtoken');
        const old=jwt.sign({id:first.body.user.id,role:'admin'},env.jwt.secret,{issuer:env.jwt.issuer,audience:env.jwt.audience});
        assert.equal((await req('/auth/me',null,old)).status,401);
        const finish=await req('/auth/verify',{challenge_id:start.body.challenge_id,code:sent.at(-1).code});
        assert.equal(finish.status,200);
    });
    await t.test('profile mass assignment and unverified email changes are rejected',async()=>{
        await resetLimits();const token=first.body.token;
        const changed=await req('/auth/me',{full_name:'Updated Collector',role:'admin',id:900},token,'PATCH');
        assert.equal(changed.status,200);assert.equal(changed.body.role,'customer');assert.equal(changed.body.id,first.body.user.id);
        assert.equal((await req('/auth/me',{email:'attack@example.com'},token,'PATCH')).status,400);
        assert.equal((await req('/auth/me',{phone:'123'},token,'PATCH')).status,400);
        assert.equal((await req('/auth/me',null)).status,401);
        assert.equal((await req('/artworks',{title:'Unauthorized'},token)).status,403);
    });
    await t.test('wishlists persist, deduplicate and cannot read or delete another account’s works',async()=>{
        await resetLimits();let start=await req('/auth/register',{...details,email:'two@example.com'});
        second=await req('/auth/verify',{challenge_id:start.body.challenge_id,code:sent.at(-1).code});
        assert.equal(second.status,200);
        assert.equal((await req('/wishlist/a-saved-work',{},first.body.token,'PUT')).status,204);
        assert.equal((await req('/wishlist/a-saved-work',{},first.body.token,'PUT')).status,204);
        assert.deepEqual((await req('/wishlist',null,first.body.token)).body,['a-saved-work']);
        assert.deepEqual((await req('/wishlist?user_id='+first.body.user.id,null,second.body.token)).body,[]);
        await req('/wishlist/a-saved-work',null,second.body.token,'DELETE');
        assert.deepEqual((await req('/wishlist',null,first.body.token)).body,['a-saved-work']);
        assert.equal((await req('/wishlist',null)).status,401);
    });
    await t.test('password change checks the old password, limits bcrypt bytes and revokes old sessions and pending codes',async()=>{
        await resetLimits();const start=await req('/auth/login',{email:details.email,password});const code=sent.at(-1).code;
        assert.equal((await req('/auth/change-password',{current_password:'wrong',new_password:'another unique amber passphrase'},first.body.token)).status,401);
        assert.equal((await req('/auth/change-password',{current_password:password,new_password:'é'.repeat(40)},first.body.token)).status,400);
        const change=await req('/auth/change-password',{current_password:password,new_password:'another unique amber passphrase'},first.body.token);
        assert.equal(change.status,200);
        assert.equal((await req('/auth/me',null,first.body.token)).status,401);
        assert.equal((await req('/auth/me',null,change.body.token)).status,200);
        assert.equal((await req('/auth/verify',{challenge_id:start.body.challenge_id,code})).status,400);
        first=change;
    });
    await t.test('email change requires current password and verifies the new address before updating',async()=>{
        await resetLimits();
        assert.equal((await req('/auth/change-email',{email:'new@example.com',current_password:'wrong'},first.body.token)).status,401);
        const start=await req('/auth/change-email',{email:'new@example.com',current_password:'another unique amber passphrase'},first.body.token);
        assert.equal(start.status,202);assert.equal((await req('/auth/me',null,first.body.token)).body.email,details.email);
        const verified=await req('/auth/verify',{challenge_id:start.body.challenge_id,code:sent.at(-1).code});
        assert.equal(verified.status,200);assert.equal(verified.body.user.email,'new@example.com');
        assert.equal((await req('/auth/me',null,first.body.token)).status,401);first=verified;
    });
    await t.test('password recovery is non-enumerating and revokes sessions; logout also revokes tokens',async()=>{
        await resetLimits();const count=sent.length;
        const missing=await req('/auth/forgot-password',{email:'missing@example.com'});
        assert.equal(missing.status,202);assert.equal(sent.length,count);
        const start=await req('/auth/forgot-password',{email:'new@example.com'});
        assert.equal(start.status,202);assert.equal(start.body.message,missing.body.message);
        const recovered=await req('/auth/verify',{challenge_id:start.body.challenge_id,code:sent.at(-1).code,new_password:'recovered lunar violet passphrase'});
        assert.equal(recovered.status,200);assert.equal((await req('/auth/me',null,first.body.token)).status,401);
        assert.equal((await req('/auth/logout',{},recovered.body.token)).status,204);
        assert.equal((await req('/auth/me',null,recovered.body.token)).status,401);
    });
    await t.test('additive security migration is repeatable and preserves existing accounts and wishlists',async()=>{
        const migration=await fs.readFile(path.join(__dirname,'../database/security.sql'),'utf8');
        await database.exec(migration);await database.exec(migration);
        assert.equal((await database.query('SELECT COUNT(*)::int AS n FROM users')).rows[0].n,2);
        assert.equal((await database.query('SELECT COUNT(*)::int AS n FROM wishlists')).rows[0].n,1);
    });
});
