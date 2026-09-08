const rateLimit = require('express-rate-limit');

// Applies to every /api request as a baseline defense against abuse/scraping
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests. Please try again later.' }
});

// Tighter limit for authentication endpoints (login/register) to slow down
// credential stuffing and brute-force attempts
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many attempts. Please try again in a few minutes.' }
});

// Password reset endpoints get their own limit - separate from authLimiter so
// a locked-out login doesn't also block password recovery
const passwordResetLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many attempts. Please try again in a few minutes.' }
});

module.exports = {
    apiLimiter,
    authLimiter,
    passwordResetLimiter
};
