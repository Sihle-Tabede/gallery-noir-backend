const { AppError } = require('../utils/errors');

exports.sendCode = async (email, code, purpose) => {
    if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
        throw new AppError(503, 'Email verification is unavailable. Please contact the studio.');
    }
    const labels = { register: 'verify your email', login: 'sign in', reset: 'reset your password', email: 'confirm your new email' };
    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            signal: AbortSignal.timeout(10000),
            headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                from: process.env.EMAIL_FROM, to: [email],
                subject: 'Your Gallery Noir verification code',
                text: `GALLERY NOIR\n\nUse ${code} to ${labels[purpose]}. This code expires in 10 minutes and can only be used once.\n\nNever share this code. If you did not request it, ignore this email.`
            })
        });
        if (!response.ok) {
            // Only a status is logged, never the provider body, address, key or code.
            console.error(JSON.stringify({ event: 'otp_email_rejected', provider_status: response.status }));
            const message = [400,401,403,422].includes(response.status)
                ? 'Email delivery was rejected. The studio must check its sending API key, verified sender and allowed test recipient.'
                : 'The email service is temporarily unavailable or has reached a sending limit. Please try again later.';
            throw new AppError(503, message);
        }
    } catch (error) {
        if (error instanceof AppError) throw error;
        // Never log provider responses, credentials, addresses or codes.
        throw new AppError(503, 'We could not send your code. Please try again later.');
    }
};
