// Configuration-only check: never connects to or modifies the database.
try {
    const env = require('../config/env');
    const raw = env.database.url;
    let url;
    try { url = new URL(raw); } catch { throw new Error('Open backend .env and set DATABASE_URL to the complete Render External Database URL.'); }
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.username || !url.password || url.pathname.length < 2
        || /^(HOST|YOUR_HOST)$/i.test(url.hostname) || /REPLACE|PASTE_/i.test(raw)) {
        throw new Error('DATABASE_URL must include the real username, password, hostname and database name. Copy the complete External Database URL from Render.');
    }
    if (!env.jwt.secret || env.jwt.secret.length < 32 || /GENERATE_ON_SETUP|replace|development-only/i.test(env.jwt.secret)) {
        throw new Error('JWT_SECRET is missing or still an example. Generate a private random secret and save it in backend .env.');
    }
    for (const origin of env.corsOrigins) {
        let parsed;
        try { parsed = new URL(origin); } catch { throw new Error('CORS_ORIGINS is invalid. For local use enter http://localhost:5173 with no extra colon.'); }
        if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin) throw new Error('CORS_ORIGINS must contain origins only: no paths, trailing slashes or extra colons.');
    }
    console.log('Database URL, JWT and CORS settings are present and formatted correctly. Connectivity has not been checked.');
    if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM || /replace|your[_-]/i.test(process.env.RESEND_API_KEY + process.env.EMAIL_FROM)) {
        console.warn('Email OTP is not configured: fill RESEND_API_KEY and EMAIL_FROM before testing signup/sign-in.');
    }
} catch (error) {
    console.error('Environment setup: ' + error.message);
    process.exitCode = 1;
}
