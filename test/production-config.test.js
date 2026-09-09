const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const base = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://test:test@database.example.com/gallery',
    CORS_ORIGINS: 'https://gallery.example.com',
    JWT_SECRET: 'production-config-test-secret-not-for-deployment',
    DB_SSL: 'true',
    DB_SSL_REJECT_UNAUTHORIZED: 'true',
    PORT: '12345'
};
const run = (changes, script = "const env = require('./config/env'); console.log(env.port)") => spawnSync(
    process.execPath, ['-e', script], {
        cwd: path.join(__dirname, '..'),
        env: { PATH: process.env.PATH, ...base, ...changes }, encoding: 'utf8'
    }
);
test('production accepts hosted configuration and the platform port', () => {
    const result = run({});
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), '12345');
});
for (const [name, change] of Object.entries({
    'missing database': { DATABASE_URL: '' },
    'local database': { DATABASE_URL: 'postgresql://test:test@localhost/gallery' },
    'HTTP frontend': { CORS_ORIGINS: 'http://gallery.example.com' },
    'origin with path': { CORS_ORIGINS: 'https://gallery.example.com/' },
    'wildcard origin': { CORS_ORIGINS: '*' },
    'weak JWT secret': { JWT_SECRET: 'short' },
    'disabled TLS': { DB_SSL: 'false' },
    'unverified TLS': { DB_SSL_REJECT_UNAUTHORIZED: 'false' },
    'invalid port': { PORT: '0' }
})) {
    test('production rejects ' + name, () => assert.notEqual(run(change).status, 0));
}
test('production CORS accepts bearer preflight only for the configured frontend', () => {
    const result = run({}, `
        const assert = require('node:assert/strict');
        const server = require('./app').listen(0, '127.0.0.1', async () => {
            try {
                const url = 'http://127.0.0.1:' + server.address().port + '/api/auth/profile';
                const response = await fetch(url, { method: 'OPTIONS', headers: {
                    origin: 'https://gallery.example.com',
                    'access-control-request-method': 'GET',
                    'access-control-request-headers': 'authorization,content-type'
                }});
                assert.equal(response.status, 204);
                assert.equal(response.headers.get('access-control-allow-origin'), 'https://gallery.example.com');
                assert.match(response.headers.get('access-control-allow-headers'), /Authorization/);
                const denied = await fetch(url, { headers: { origin: 'https://other.example.com' }});
                assert.equal(denied.status, 403);
                assert.equal(denied.headers.get('access-control-allow-origin'), null);
            } catch (error) { console.error(error); process.exitCode = 1; }
            finally { server.close(); await require('./config/db').end(); }
        });
    `);
    assert.equal(result.status, 0, result.stderr);
});
test('URL sslmode cannot disable or weaken verified TLS', () => {
    const result = run({ DATABASE_URL: base.DATABASE_URL + '?sslmode=disable' }, `
        const assert = require('node:assert/strict');
        const pg = require('pg');
        pg.Pool = class {
            constructor(config) {
                assert.deepEqual(config.ssl, { rejectUnauthorized: true });
                assert.equal(new URL(config.connectionString).searchParams.has('sslmode'), false);
            }
            on() {}
        };
        require('./config/db');
    `);
    assert.equal(result.status, 0, result.stderr);
});
