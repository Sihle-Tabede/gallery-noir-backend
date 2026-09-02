class AppError extends Error {
    constructor(statusCode, message, details) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.details = details;
        this.isOperational = true;
    }
}

const badRequest = (message, details) => new AppError(400, message, details);
const notFound = (message) => new AppError(404, message);
const conflict = (message) => new AppError(409, message);

module.exports = { AppError, badRequest, notFound, conflict };
