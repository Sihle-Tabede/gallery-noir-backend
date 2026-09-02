const dotenv = require('dotenv');

dotenv.config({ quiet: true });

const isProduction = process.env.NODE_ENV === 'production';

const readInteger = (name, fallback, minimum, maximum) => {
    const raw = process.env[name];
    const value = raw === undefined ? fallback : Number(raw);

    if (!Number.isInteger(value) || value < minimum || value > maximum) {
        throw new Error(name + ' must be an integer between ' + minimum + ' and ' + maximum);
    }

    return value;
};

const readBoolean = (name, fallback = false) => {
    const raw = process.env[name];
    if (raw === undefined) return fallback;
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    throw new Error(name + ' must be either true or false');
};

const splitList = (value) => (
    value
        ? value.split(',').map((entry) => entry.trim()).filter(Boolean)
        : []
);

const defaultDevelopmentOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173'
];

const corsOrigins = splitList(process.env.CORS_ORIGINS);

if (isProduction && corsOrigins.length === 0) {
    throw new Error('CORS_ORIGINS is required in production');
}

if (isProduction && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
    throw new Error('JWT_SECRET must contain at least 32 characters in production');
}

const env = Object.freeze({
    nodeEnv: process.env.NODE_ENV || 'development',
    isProduction,
    port: readInteger('PORT', 5000, 1, 65535),
    corsOrigins: corsOrigins.length > 0 ? corsOrigins : defaultDevelopmentOrigins,
    database: {
        url: process.env.DATABASE_URL || '',
        host: process.env.DB_HOST || '127.0.0.1',
        port: readInteger('DB_PORT', 5432, 1, 65535),
        user: process.env.DB_USER || 'gallery_noir',
        password: process.env.DB_PASSWORD || '',
        name: process.env.DB_NAME || 'gallery_noir',
        connectionLimit: readInteger('DB_CONNECTION_LIMIT', 10, 1, 50),
        connectionTimeoutMs: readInteger('DB_CONNECTION_TIMEOUT_MS', 10000, 1000, 60000),
        idleTimeoutMs: readInteger('DB_IDLE_TIMEOUT_MS', 30000, 1000, 300000),
        ssl: readBoolean('DB_SSL', false),
        sslRejectUnauthorized: readBoolean('DB_SSL_REJECT_UNAUTHORIZED', true)
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'development-only-secret-change-before-deploying',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        issuer: process.env.JWT_ISSUER || 'gallery-noir-api',
        audience: process.env.JWT_AUDIENCE || 'gallery-noir-web'
    },
    bcryptRounds: readInteger('BCRYPT_ROUNDS', 12, 10, 15)
});

module.exports = env;
