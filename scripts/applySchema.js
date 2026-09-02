const fs = require('node:fs/promises');
const path = require('node:path');

const db = require('../config/db');

const applySchema = async () => {
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');

    await db.withTransaction((client) => client.query(schema));
    console.log('Gallery Noir PostgreSQL schema applied successfully');
};

applySchema()
    .catch((error) => {
        console.error('Database setup failed:', error.message);
        process.exitCode = 1;
    })
    .finally(() => db.end());
