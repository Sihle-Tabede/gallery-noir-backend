const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.join(__dirname, '..');
const destination = path.join(root, '.env');
if (process.env.NODE_ENV === 'production' || process.env.RENDER === 'true') {
    console.log('Production uses Render environment variables. No local file created.');
} else {
    try {
        const template = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
        fs.writeFileSync(destination, template.replace('GENERATE_ON_SETUP', crypto.randomBytes(48).toString('hex')), { flag: 'wx', mode: 0o600 });
        console.log('Created backend .env with local URLs and a private JWT secret.');
        console.log('Open .env and fill DATABASE_URL, RESEND_API_KEY and EMAIL_FROM. Never commit this file.');
    } catch (error) {
        if (error.code !== 'EEXIST') throw error;
        console.log('Existing backend .env preserved.');
    }
}
