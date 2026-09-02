const { rateLimit } = require('express-rate-limit');

const createLimiter = (limit, message) => rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message }
});

const authLimiter = createLimiter(
    20,
    'Too many authentication attempts. Please try again later.'
);

const submissionLimiter = createLimiter(
    10,
    'Too many submissions. Please wait before trying again.'
);

module.exports = { authLimiter, submissionLimiter };
