const crypto = require('crypto');
const compression = require('compression');
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');

const env = require('./config/env');
const apiRoutes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use((req, res, next) => {
    req.id = req.get('x-request-id') || crypto.randomUUID();
    res.setHeader('x-request-id', req.id);
    next();
});

app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(compression());
app.use(cors({
    origin(origin, callback) {
        if (!origin || env.corsOrigins.includes(origin)) {
            return callback(null, true);
        }
        const error = new Error('Origin is not allowed by CORS');
        error.statusCode = 403;
        return callback(error);
    },
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-ID'],
    maxAge: 86400
}));
app.use(express.json({ limit: '100kb' }));

app.use('/api', rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 500,
    standardHeaders: 'draft-8',
    legacyHeaders: false
}));

app.get('/', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'gallery-noir-api',
        health: '/api/health',
        readiness: '/api/health/ready'
    });
});

app.use('/api', apiRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
