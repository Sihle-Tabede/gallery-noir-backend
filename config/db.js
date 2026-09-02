const { Pool, types } = require('pg');
const env = require('./env');

// Preserve the numeric JSON response shape used by the existing frontend.
types.setTypeParser(types.builtins.INT8, Number);
types.setTypeParser(types.builtins.NUMERIC, Number);

const connection = env.database.url
    ? { connectionString: env.database.url }
    : {
        host: env.database.host,
        port: env.database.port,
        user: env.database.user,
        password: env.database.password,
        database: env.database.name
    };

const pool = new Pool({
    ...connection,
    max: env.database.connectionLimit,
    connectionTimeoutMillis: env.database.connectionTimeoutMs,
    idleTimeoutMillis: env.database.idleTimeoutMs,
    keepAlive: true,
    application_name: 'gallery-noir-api',
    ...(env.database.ssl
        ? { ssl: { rejectUnauthorized: env.database.sslRejectUnauthorized } }
        : {})
});

pool.on('error', (error) => {
    console.error('Unexpected PostgreSQL pool error:', error.message);
});

const ping = async () => {
    await pool.query('SELECT 1');
};

const withTransaction = async (callback) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
    query: (...args) => pool.query(...args),
    withTransaction,
    ping,
    end: () => pool.end()
};
