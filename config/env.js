const dotenv = require('dotenv');

// Resolve from the backend folder, regardless of the terminal working directory.
const path = require('node:path');
dotenv.config({ path: path.join(__dirname, '..', '.env'), quiet: true });

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

// Fail closed: production must never fall back to the local DB defaults.
if (isProduction) {
    let databaseUrl;
    try { databaseUrl = new URL(process.env.DATABASE_URL); } catch {
        throw new Error('DATABASE_URL is required and must be a PostgreSQL URL in production');
    }
    if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol)
        || !databaseUrl.hostname || databaseUrl.pathname.length < 2
        || /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(databaseUrl.hostname)
        || databaseUrl.hostname.endsWith('.localhost')) {
        throw new Error('DATABASE_URL must identify the hosted production PostgreSQL database');
    }
    if (!readBoolean('DB_SSL', true) || !readBoolean('DB_SSL_REJECT_UNAUTHORIZED', true)) {
        throw new Error('Production requires verified database TLS');
    }
    for (const origin of corsOrigins) {
        let url;
        try { url = new URL(origin); } catch {
            throw new Error('CORS_ORIGINS must contain valid HTTPS origins');
        }
        if (url.protocol !== 'https:' || url.origin !== origin
            || /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(url.hostname)) {
            throw new Error('CORS_ORIGINS must contain exact public HTTPS origins without paths or trailing slashes');
        }
    }
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
        ssl: readBoolean('DB_SSL', isProduction),
        sslRejectUnauthorized: readBoolean('DB_SSL_REJECT_UNAUTHORIZED', true)
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'development-only-secret-change-before-deploying',
        expiresIn: process.env.JWT_EXPIRES_IN || '1h',
        issuer: process.env.JWT_ISSUER || 'gallery-noir-api',
        audience: process.env.JWT_AUDIENCE || 'gallery-noir-web'
    },
    bcryptRounds: readInteger('BCRYPT_ROUNDS', 12, 10, 15)
});

module.exports = env;
