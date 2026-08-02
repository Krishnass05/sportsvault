// SportVault Email Notification Service
// Uses Nodemailer with SMTP (Gmail compatible) configuration from .env
// Falls back to console.log if SMTP is not configured, so the app never breaks.

const nodemailer = require('nodemailer');

// Build transporter from environment variables
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: (process.env.SMTP_SECURE || 'false') === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const fromAddress = process.env.EMAIL_FROM
    ? `"${process.env.EMAIL_FROM}" <${process.env.SMTP_USER}>`
    : `"SportVault" <${process.env.SMTP_USER || 'no-reply@sportvault.com'}>`;

/**
 * Core send function.
 * If SMTP is not configured, logs the email instead of throwing.
 */
async function sendMail(to, subject, html) {
    if (!to) {
        console.log('[Email] Skipped - no recipient email provided');
        return { skipped: true };
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log(`[Email] SMTP not configured. Would send to ${to} - ${subject}`);
        return { skipped: true };
    }

    try {
        const info = await transporter.sendMail({
            from: fromAddress,
            to,
            subject,
            html
        });
        console.log(`[Email] Sent to ${to}: "${subject}" (messageId: ${info.messageId})`);
        return info;
    } catch (error) {
        console.error('[Email] Failed to send email:', error.message);
        return { error: error.message };
    }
}

// ---------- Booking Confirmation Email ----------

/**
 * Send a "booking confirmed" email.
 * @param {string} recipientEmail - Student's email address
 * @param {string} studentName - Student's full name
 * @param {object} details - { venueName, bookingDate, startTime, endTime, purpose, bookingType }
 */
async function sendBookingConfirmation(recipientEmail, studentName, details) {
    const dateStr = formatDateForEmail(details.bookingDate);
    const timeStr = `${formatTimeForEmail(details.startTime)} - ${formatTimeForEmail(details.endTime)}`;

    const subject = `✅ Booking Confirmed - ${details.venueName}`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #0B1F3A; color: #ffffff; padding: 1.5rem; text-align: center;">
                <h1 style="margin: 0; font-size: 1.5rem;">SportVault</h1>
                <p style="margin: 0.25rem 0 0 0; opacity: 0.9;">Venue Booking Confirmed</p>
            </div>
            <div style="padding: 1.5rem; background-color: #ffffff;">
                <p>Dear <strong>${escapeHtml(studentName)}</strong>,</p>
                <p>Your venue booking has been <strong style="color: #28A745;">confirmed</strong>.</p>
                <table style="width: 100%; border-collapse: collapse; margin: 1rem 0;">
                    <tr>
                        <td style="padding: 0.5rem; border: 1px solid #e0e0e0; background-color: #f5f5f5; font-weight: bold;">Venue</td>
                        <td style="padding: 0.5rem; border: 1px solid #e0e0e0;">${escapeHtml(details.venueName)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 0.5rem; border: 1px solid #e0e0e0; background-color: #f5f5f5; font-weight: bold;">Date</td>
                        <td style="padding: 0.5rem; border: 1px solid #e0e0e0;">${dateStr}</td>
                    </tr>
                    <tr>
                        <td style="padding: 0.5rem; border: 1px solid #e0e0e0; background-color: #f5f5f5; font-weight: bold;">Time</td>
                        <td style="padding: 0.5rem; border: 1px solid #e0e0e0;">${timeStr}</td>
                    </tr>
                    ${details.purpose ? `<tr>
                        <td style="padding: 0.5rem; border: 1px solid #e0e0e0; background-color: #f5f5f5; font-weight: bold;">Purpose</td>
                        <td style="padding: 0.5rem; border: 1px solid #e0e0e0;">${escapeHtml(details.purpose)}</td>
                    </tr>` : ''}
                </table>
                <p>Thank you for using SportVault. Please arrive on time and carry your Student ID.</p>
            </div>
            <div style="background-color: #f5f5f5; padding: 1rem; text-align: center; color: #666; font-size: 0.85rem;">
                <p style="margin: 0;">This is an automated notification - please do not reply to this email.</p>
            </div>
        </div>
    `;

    return sendMail(recipientEmail, subject, html);
}

// ---------- Booking Cancellation Email ----------

/**
 * Send a "booking cancelled" email.
 */
async function sendBookingCancellation(recipientEmail, studentName, details) {
    const dateStr = formatDateForEmail(details.bookingDate);
    const timeStr = `${formatTimeForEmail(details.startTime)} - ${formatTimeForEmail(details.endTime)}`;

    const subject = `❌ Booking Cancelled - ${details.venueName}`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #DC3545; color: #ffffff; padding: 1.5rem; text-align: center;">
                <h1 style="margin: 0; font-size: 1.5rem;">SportVault</h1>
                <p style="margin: 0.25rem 0 0 0; opacity: 0.9;">Booking Cancelled</p>
            </div>
            <div style="padding: 1.5rem; background-color: #ffffff;">
                <p>Dear <strong>${escapeHtml(studentName)}</strong>,</p>
                <p>Your venue booking has been <strong style="color: #DC3545;">cancelled</strong>.</p>
                <table style="width: 100%; border-collapse: collapse; margin: 1rem 0;">
                    <tr>
                        <td style="padding: 0.5rem; border: 1px solid #e0e0e0; background-color: #f5f5f5; font-weight: bold;">Venue</td>
                        <td style="padding: 0.5rem; border: 1px solid #e0e0e0;">${escapeHtml(details.venueName)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 0.5rem; border: 1px solid #e0e0e0; background-color: #f5f5f5; font-weight: bold;">Date</td>
                        <td style="padding: 0.5rem; border: 1px solid #e0e0e0;">${dateStr}</td>
                    </tr>
                    <tr>
                        <td style="padding: 0.5rem; border: 1px solid #e0e0e0; background-color: #f5f5f5; font-weight: bold;">Time</td>
                        <td style="padding: 0.5rem; border: 1px solid #e0e0e0;">${timeStr}</td>
                    </tr>
                    ${details.purpose ? `<tr>
                        <td style="padding: 0.5rem; border: 1px solid #e0e0e0; background-color: #f5f5f5; font-weight: bold;">Purpose</td>
                        <td style="padding: 0.5rem; border: 1px solid #e0e0e0;">${escapeHtml(details.purpose)}</td>
                    </tr>` : ''}
                </table>
                <p>If you did not cancel this booking, please contact the Sports Administration office.</p>
            </div>
            <div style="background-color: #f5f5f5; padding: 1rem; text-align: center; color: #666; font-size: 0.85rem;">
                <p style="margin: 0;">This is an automated notification - please do not reply to this email.</p>
            </div>
        </div>
    `;

    return sendMail(recipientEmail, subject, html);
}

// ---------- Registration Welcome Email ----------

/**
 * Send a welcome email after a student registers.
 */
async function sendWelcomeEmail(recipientEmail, studentName) {
    const subject = '🎉 Welcome to SportVault!';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #0B1F3A; color: #ffffff; padding: 1.5rem; text-align: center;">
                <h1 style="margin: 0; font-size: 1.5rem;">SportVault</h1>
                <p style="margin: 0.25rem 0 0 0; opacity: 0.9;">Welcome Aboard!</p>
            </div>
            <div style="padding: 1.5rem; background-color: #ffffff;">
                <p>Dear <strong>${escapeHtml(studentName)}</strong>,</p>
                <p>Your SportVault account has been created successfully.</p>
                <p>You can now log in and book sports venues and equipment at your college.</p>
                <p>If you have any questions, please contact the Sports Administration office.</p>
            </div>
            <div style="background-color: #f5f5f5; padding: 1rem; text-align: center; color: #666; font-size: 0.85rem;">
                <p style="margin: 0;">This is an automated notification - please do not reply to this email.</p>
            </div>
        </div>
    `;

    return sendMail(recipientEmail, subject, html);
}

// ---------- Helpers ----------

function formatDateForEmail(dateInput) {
    if (!dateInput) return 'N/A';
    // booking_date is a plain date string (YYYY-MM-DD) from the form
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateInput)) {
        const d = new Date(dateInput + 'T00:00:00');
        return d.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    return new Date(dateInput).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatTimeForEmail(timeInput) {
    if (!timeInput) return 'N/A';
    const str = String(timeInput).substring(0, 5); // HH:MM
    const [hours, minutes] = str.split(':').map(Number);
    const d = new Date();
    d.setHours(hours, minutes || 0);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"')
        .replace(/'/g, '&#039;');
}

module.exports = {
    sendBookingConfirmation,
    sendBookingCancellation,
    sendWelcomeEmail,
    sendMail
};

