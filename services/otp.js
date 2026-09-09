const crypto = require('node:crypto');
const db = require('../config/db');
const env = require('../config/env');
const mail = require('./email');
const { AppError, badRequest } = require('../utils/errors');

const digest = (value) => crypto.createHmac('sha256', env.jwt.secret).update(value).digest('hex');
const invalid = () => badRequest('The code is invalid, expired or has reached its attempt limit. Request a new code.');

exports.issue = async (email, purpose, payload, deliver = true) => {
    const id = crypto.randomUUID();
    const code = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
    await db.withTransaction(async (client) => {
        // Persistent recipient throttling survives restarts and multiple instances.
        const key = digest('email:' + email);
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [key]);
        const { rows } = await client.query('SELECT * FROM auth_delivery_limits WHERE email_key=$1 FOR UPDATE', [key]);
        const limit = rows[0];
        const now = Date.now();
        // A consumed login code must not block the next password-authenticated login.
        // Outstanding challenges still require the resend cooldown. Hourly limits always apply.
        const pending = purpose === 'login'
            ? await client.query('SELECT id FROM auth_challenges WHERE email=$1 AND purpose=$2 LIMIT 1', [email,purpose])
            : null;
        const freshLogin = purpose === 'login' && payload.user_id && pending.rows.length === 0;
        const cooldown = limit && !freshLogin ? 60000 - (now - new Date(limit.last_sent_at).getTime()) : 0;
        const hourly = limit && limit.sends >= 5 ? 3600000 - (now - new Date(limit.window_start).getTime()) : 0;
        const retryAfter = Math.ceil(Math.max(cooldown, hourly, 0) / 1000);
        if (retryAfter > 0) {
            throw new AppError(429, `Please wait ${retryAfter} seconds before requesting another code.`, { retry_after: retryAfter });
        }
        await client.query(`INSERT INTO auth_delivery_limits(email_key,sends) VALUES($1,1)
            ON CONFLICT(email_key) DO UPDATE SET
            sends=CASE WHEN auth_delivery_limits.window_start < NOW()-INTERVAL '1 hour' THEN 1 ELSE auth_delivery_limits.sends+1 END,
            window_start=CASE WHEN auth_delivery_limits.window_start < NOW()-INTERVAL '1 hour' THEN NOW() ELSE auth_delivery_limits.window_start END,
            last_sent_at=NOW()`, [key]);
        await client.query('DELETE FROM auth_challenges WHERE (email=$1 AND purpose=$2) OR expires_at < NOW()', [email,purpose]);
        await client.query("DELETE FROM auth_delivery_limits WHERE last_sent_at < NOW()-INTERVAL '1 day'");
        await client.query(`INSERT INTO auth_challenges(id,email,purpose,code_hash,payload,expires_at)
            VALUES($1,$2,$3,$4,$5,NOW()+INTERVAL '10 minutes')`, [id,email,purpose,digest(id+':'+code),JSON.stringify(payload)]);
        if (deliver) await mail.sendCode(email,code,purpose);
    });
    return { requires_otp: true, challenge_id: id, purpose, expires_in: 600, resend_after: 60 };
};

exports.consume = async (id, code, action) => {
    if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id) || typeof code !== 'string' || !/^\d{6}$/.test(code)) throw invalid();
    const result = await db.withTransaction(async (client) => {
        const { rows } = await client.query('SELECT * FROM auth_challenges WHERE id=$1 FOR UPDATE', [id]);
        const challenge = rows[0];
        if (!challenge || new Date(challenge.expires_at).getTime() <= Date.now() || challenge.attempts >= 5) return null;
        const correct = crypto.timingSafeEqual(Buffer.from(challenge.code_hash,'hex'), Buffer.from(digest(id+':'+code),'hex'));
        if (!correct) {
            await client.query('UPDATE auth_challenges SET attempts=attempts+1 WHERE id=$1',[id]);
            return null; // Commit failed attempts rather than rolling them back.
        }
        const value = await action(client,challenge);
        await client.query('DELETE FROM auth_challenges WHERE id=$1',[id]);
        return value;
    });
    if (!result) throw invalid();
    return result;
};
