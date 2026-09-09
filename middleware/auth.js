const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/userModel');
const decodeToken = async (req) => {
    const match=req.get('authorization')?.match(/^Bearer\s+(.+)$/i);
    if (!match) return null;
    let decoded;
    try { decoded=jwt.verify(match[1],env.jwt.secret,{algorithms:['HS256'],issuer:env.jwt.issuer,audience:env.jwt.audience}); }
    catch { return null; }
    if (!Number.isInteger(decoded.sv)) return null;
    const user=await User.findById(decoded.id);
    if (!user || !user.email_verified_at || user.session_version!==decoded.sv) return null;
    return {id:user.id,email:user.email,role:user.role};
};
const auth=async (req,res,next) => {
    try {
        req.user=await decodeToken(req);
        if (!req.user) return res.status(401).json({code:'SESSION_EXPIRED',message:'Your session is invalid or has expired. Please sign in.'});
        next();
    } catch (error) { next(error); }
};
const optionalAuth=async (req,_res,next) => {
    try { req.user=await decodeToken(req) || undefined; next(); }
    catch (error) { next(error); }
};
module.exports=auth;
module.exports.optionalAuth=optionalAuth;
