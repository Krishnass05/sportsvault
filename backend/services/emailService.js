// SportVault Email Notification Service
// Uses Resend for transactional email delivery, configured from .env.
// Falls back to console.log if Resend is not configured, so the app never breaks.

const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const fromAddress = process.env.EMAIL_FROM_ADDRESS
    ? `"${process.env.EMAIL_FROM || 'SportVault'}" <${process.env.EMAIL_FROM_ADDRESS}>`
    : `"${process.env.EMAIL_FROM || 'SportVault'}" <no-reply@sportvault.com>`;

/**
 * Core send function.
 * If Resend is not configured, logs the email instead of throwing.
 */
async function sendMail(to, subject, html) {
    if (!to) {
        console.log('[Email] Skipped - no recipient email provided');
        return { skipped: true };
    }

    if (!resend) {
        console.log(`[Email] Resend not configured. Would send to ${to} - ${subject}`);
        return { skipped: true };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: fromAddress,
            to,
            subject,
            html
        });
        if (error) {
            console.error('[Email] Failed to send email:', error.message || error);
            return { error: error.message || error };
        }
        console.log(`[Email] Sent to ${to}: "${subject}" (id: ${data.id})`);
        return data;
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

// ---------- Password Reset OTP Email ----------

/**
 * Send a password reset OTP code.
 */
async function sendPasswordResetOtp(recipientEmail, studentName, otp) {
    const subject = `🔐 Your SportVault Password Reset Code`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #0B1F3A; color: #ffffff; padding: 1.5rem; text-align: center;">
                <h1 style="margin: 0; font-size: 1.5rem;">SportVault</h1>
                <p style="margin: 0.25rem 0 0 0; opacity: 0.9;">Password Reset Request</p>
            </div>
            <div style="padding: 1.5rem; background-color: #ffffff;">
                <p>Dear <strong>${escapeHtml(studentName)}</strong>,</p>
                <p>Use the code below to reset your SportVault password. This code expires in 10 minutes.</p>
                <p style="text-align: center; margin: 1.5rem 0;">
                    <span style="display: inline-block; font-size: 2rem; letter-spacing: 0.5rem; font-weight: bold; color: #0B1F3A; background-color: #f5f5f5; padding: 0.75rem 1.5rem; border-radius: 8px;">${escapeHtml(otp)}</span>
                </p>
                <p>If you did not request a password reset, you can safely ignore this email - your password will not be changed.</p>
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
    sendPasswordResetOtp,
    sendMail
};

