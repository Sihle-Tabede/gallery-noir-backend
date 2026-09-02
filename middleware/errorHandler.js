const env = require('../config/env');
const { AppError } = require('../utils/errors');

const notFound = (req, res) => {
    res.status(404).json({
        message: 'Route not found',
        request_id: req.id
    });
};

const errorHandler = (error, req, res, next) => {
    if (res.headersSent) return next(error);

    let normalized = error;

    if (error.type === 'entity.parse.failed') {
        normalized = new AppError(400, 'The request body contains invalid JSON');
    } else if (error.code === '23505') {
        normalized = new AppError(409, 'A record with those details already exists');
    } else if (error.code === '23503') {
        normalized = new AppError(400, 'A referenced record does not exist');
    } else if (['23502', '23514', '22P02'].includes(error.code)) {
        normalized = new AppError(400, 'The supplied data violates a database rule');
    }

    const status = normalized.statusCode || 500;
    const isOperational = normalized.isOperational === true;
    const message = status >= 500 && !isOperational
        ? 'An unexpected server error occurred'
        : normalized.message;

    console.error(JSON.stringify({
        level: 'error',
        request_id: req.id,
        method: req.method,
        path: req.originalUrl,
        status,
        message: error.message,
        stack: env.isProduction ? undefined : error.stack
    }));

    res.status(status).json({
        message,
        request_id: req.id,
        ...(normalized.details ? { details: normalized.details } : {})
    });
};

module.exports = { notFound, errorHandler };
