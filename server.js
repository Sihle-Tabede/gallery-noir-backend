const app = require('./app');
const db = require('./config/db');
const env = require('./config/env');

let server;

const startupErrorMessage = (error) => {
    if (error.message?.trim()) return error.message;
    if (error.code === 'ECONNREFUSED') {
        return env.database.url
            ? 'The configured PostgreSQL service refused the connection'
            : 'Connection refused at ' + env.database.host + ':' + env.database.port;
    }
    return error.code || 'Unknown PostgreSQL connection error';
};

const start = async () => {
    await db.ping();

    server = app.listen(env.port, () => {
        console.log('Gallery Noir API listening on port ' + env.port + ' (' + env.nodeEnv + ')');
    });
};

const shutdown = (signal) => {
    console.log(signal + ' received; shutting down gracefully');

    const forceExit = setTimeout(() => {
        console.error('Graceful shutdown timed out');
        process.exit(1);
    }, 10000);
    forceExit.unref();

    const closeDatabase = async () => {
        try {
            await db.end();
            process.exit(0);
        } catch (error) {
            console.error('Database shutdown failed:', error.message);
            process.exit(1);
        }
    };

    if (server) {
        server.close(closeDatabase);
    } else {
        closeDatabase();
    }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start().catch(async (error) => {
    console.error('Gallery Noir API failed to connect to PostgreSQL:', startupErrorMessage(error));
    console.error('Check DATABASE_URL or the DB_* settings, then run npm run db:setup.');
    await db.end().catch(() => {});
    process.exitCode = 1;
});
