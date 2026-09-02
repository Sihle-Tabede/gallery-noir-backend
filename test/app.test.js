const test = require('node:test');
const assert = require('node:assert/strict');

const app = require('../app');

const withServer = async (callback) => {
    const server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const address = server.address();

    try {
        await callback('http://127.0.0.1:' + address.port);
    } finally {
        await new Promise((resolve, reject) => {
            server.close((error) => error ? reject(error) : resolve());
        });
    }
};

test('health endpoint reports the API as alive', async () => {
    await withServer(async (baseUrl) => {
        const response = await fetch(baseUrl + '/api/health');
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(body.status, 'ok');
        assert.equal(body.service, 'gallery-noir-api');
        assert.ok(response.headers.get('x-request-id'));
    });
});

test('unknown routes return a consistent JSON error', async () => {
    await withServer(async (baseUrl) => {
        const response = await fetch(baseUrl + '/api/not-a-route');
        const body = await response.json();

        assert.equal(response.status, 404);
        assert.equal(body.message, 'Route not found');
        assert.ok(body.request_id);
    });
});
