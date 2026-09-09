const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const db = require('../config/db');
const User = require('../models/userModel');
const otp = require('../services/otp');
const { badRequest, conflict, AppError } = require('../utils/errors');
const validation = require('../utils/validation');

const publicUser = (u) => ({ id:u.id, email:u.email, full_name:u.full_name, phone:u.phone, role:u.role, created_at:u.created_at, email_verified_at:u.email_verified_at });
const session = (u) => ({ user:publicUser(u), token:jwt.sign(
    { id:u.id, sv:u.session_version },env.jwt.secret,
    { algorithm:'HS256', expiresIn:env.jwt.expiresIn, issuer:env.jwt.issuer, audience:env.jwt.audience }
) });
const newPassword = (value) => {
    const password = validation.password(value,{ min:8,max:72 });
    if (Buffer.byteLength(password,'utf8') > 72) throw badRequest('Password must be at most 72 UTF-8 bytes.');
    if (/^(.)\1+$/.test(password) || /^(password|123456|qwerty|letmein)/i.test(password)) throw badRequest('Choose a less predictable password or a unique passphrase.');
    return password;
};
const checkPassword = async (id,password) => {
    const { rows } = await db.query('SELECT * FROM users WHERE id=$1',[id]);
    const user=rows[0];
    if (!user || typeof password !== 'string' || password.length>128 || !(await bcrypt.compare(password,user.password_hash))) throw new AppError(401,'Current password is incorrect.');
    return user;
};
exports.register = async (req,res) => {
    const email=validation.email(req.body.email);
    const full_name=validation.requiredString(req.body.full_name,'Full name',{min:2,max:120});
    const phone=validation.southAfricanPhone(req.body.phone);
    const password_hash=await bcrypt.hash(newPassword(req.body.password),env.bcryptRounds);
    if (await User.findAuthByEmail(email)) throw conflict('This email is already registered. Sign in or reset your password.');
    res.status(202).json(await otp.issue(email,'register',{full_name,phone,password_hash}));
};
// Constant-cost comparison even for an unknown email.
const dummyHash=bcrypt.hashSync('unused comparison password',env.bcryptRounds);
exports.login = async (req,res) => {
    const email=validation.email(req.body.email);
    const password=validation.password(req.body.password,{min:1,max:128});
    const user=await User.findAuthByEmail(email);
    const valid=await bcrypt.compare(password,user?.password_hash || dummyHash);
    if (!user || !valid) throw new AppError(401,'Invalid email or password');
    res.status(202).json(await otp.issue(email,'login',{user_id:user.id,sv:user.session_version}));
};
exports.forgotPassword = async (req,res) => {
    const email=validation.email(req.body.email);
    const user=await User.findAuthByEmail(email);
    const challenge=await otp.issue(email,'reset',user ? {user_id:user.id,sv:user.session_version} : {},Boolean(user));
    res.status(202).json({...challenge,message:'If this email has an account, a verification code has been sent.'});
};
exports.verify = async (req,res) => {
    // Hash outside the transaction; required only for password recovery.
    const resetHash=req.body.new_password === undefined ? null : await bcrypt.hash(newPassword(req.body.new_password),env.bcryptRounds);
    const user=await otp.consume(req.body.challenge_id,req.body.code,async (client,c) => {
        const p=c.payload;
        if (c.purpose === 'register') {
            const {rows}=await client.query(`INSERT INTO users(email,password_hash,full_name,phone,email_verified_at)
                VALUES($1,$2,$3,$4,NOW()) RETURNING *`,[c.email,p.password_hash,p.full_name,p.phone]);
            return rows[0];
        }
        const {rows}=await client.query('SELECT * FROM users WHERE id=$1 FOR UPDATE',[p.user_id || null]);
        const u=rows[0];
        if (!u || u.session_version!==p.sv || (c.purpose!=='email' && u.email!==c.email)) throw badRequest('This request is no longer valid. Please start again.');
        if (c.purpose==='reset') {
            if (!resetHash) throw badRequest('Enter a new password.');
            const result=await client.query('UPDATE users SET password_hash=$1,session_version=session_version+1,email_verified_at=NOW() WHERE id=$2 RETURNING *',[resetHash,u.id]);
            return result.rows[0];
        }
        if (c.purpose==='email') {
            const result=await client.query('UPDATE users SET email=$1,email_verified_at=NOW(),session_version=session_version+1 WHERE id=$2 RETURNING *',[c.email,u.id]);
            return result.rows[0];
        }
        const result=await client.query('UPDATE users SET email_verified_at=COALESCE(email_verified_at,NOW()) WHERE id=$1 RETURNING *',[u.id]);
        return result.rows[0];
    });
    res.json(session(user));
};
exports.getProfile = async (req,res) => res.json(publicUser(await User.findById(req.user.id)));
exports.updateProfile = async (req,res) => {
    if (Object.hasOwn(req.body,'email')) throw badRequest('Use the verified email-change form to change your email.');
    const updates={};
    if (Object.hasOwn(req.body,'full_name')) updates.full_name=validation.requiredString(req.body.full_name,'Full name',{min:2,max:120});
    if (Object.hasOwn(req.body,'phone')) updates.phone=validation.southAfricanPhone(req.body.phone);
    if (!Object.keys(updates).length) throw badRequest('Provide your name or mobile number.');
    await User.update(req.user.id,updates);
    res.json(publicUser(await User.findById(req.user.id)));
};
exports.changeEmail = async (req,res) => {
    const u=await checkPassword(req.user.id,req.body.current_password);
    const email=validation.email(req.body.email);
    if (await User.findAuthByEmail(email)) throw conflict('Choose a different email address.');
    res.status(202).json(await otp.issue(email,'email',{user_id:u.id,sv:u.session_version}));
};
exports.changePassword = async (req,res) => {
    const u=await checkPassword(req.user.id,req.body.current_password);
    const hash=await bcrypt.hash(newPassword(req.body.new_password),env.bcryptRounds);
    const {rows}=await db.query('UPDATE users SET password_hash=$1,session_version=session_version+1 WHERE id=$2 AND session_version=$3 RETURNING *',[hash,u.id,u.session_version]);
    if (!rows[0]) throw new AppError(401,'Your session changed. Please sign in again.');
    res.json(session(rows[0]));
};
exports.logout = async (req,res) => {
    await db.query('UPDATE users SET session_version=session_version+1 WHERE id=$1',[req.user.id]);
    res.status(204).end();
};
