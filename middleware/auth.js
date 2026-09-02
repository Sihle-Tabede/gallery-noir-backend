const jwt = require('jsonwebtoken');
const env = require('../config/env');

const decodeToken = (req) => {
    const match = req.get('authorization')?.match(/^Bearer\s+(.+)$/i);
    if (!match) return null;

    return jwt.verify(match[1], env.jwt.secret, {
        algorithms: ['HS256'],
        issuer: env.jwt.issuer,
        audience: env.jwt.audience
    });
};

const auth = (req, res, next) => {
    try {
        const decoded = decodeToken(req);
        if (!decoded) {
            return res.status(401).json({ message: 'Authentication is required' });
        }
        req.user = decoded;
        return next();
    } catch (_error) {
        return res.status(401).json({ message: 'Your session is invalid or has expired' });
    }
};

const optionalAuth = (req, _res, next) => {
    try {
        req.user = decodeToken(req) || undefined;
    } catch (_error) {
        req.user = undefined;
    }
    next();
};

module.exports = auth;
module.exports.optionalAuth = optionalAuth;
