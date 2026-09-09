const fs = require('node:fs/promises');
const path = require('node:path');

const db = require('../config/db');

const applySchema = async () => {
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');

    await db.withTransaction(async (client) => {
        await client.query("SET LOCAL lock_timeout = '10s'");
        await client.query("SET LOCAL statement_timeout = '60s'");
        await client.query('SELECT pg_advisory_xact_lock(719402601)');
        await client.query(schema);
    });
    console.log('Gallery Noir PostgreSQL schema applied successfully');
};

applySchema()
    .catch((error) => {
        console.error('Database setup failed:', error.message);
        process.exitCode = 1;
    })
    .finally(() => db.end());
