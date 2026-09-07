// SportVault Forgot Password Module (OTP-based reset)

let currentResetEmail = '';

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    const successDiv = document.getElementById('success-message');
    successDiv.classList.add('hidden');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

function showSuccess(message) {
    const errorDiv = document.getElementById('error-message');
    const successDiv = document.getElementById('success-message');
    errorDiv.classList.add('hidden');
    successDiv.textContent = message;
    successDiv.classList.remove('hidden');
}

function clearMessages() {
    document.getElementById('error-message').classList.add('hidden');
    document.getElementById('success-message').classList.add('hidden');
}

// Step 1: Request an OTP for the given email
async function handleRequestOtp(event) {
    event.preventDefault();
    clearMessages();

    const email = document.getElementById('email').value.trim();
    const submitBtn = event.target.querySelector('button[type="submit"]');

    if (!email) {
        showError('Please enter your email address');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    try {
        const data = await apiRequest('/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email })
        });

        currentResetEmail = email;
        document.getElementById('sent-to-email').textContent = email;
        document.getElementById('request-otp-form').classList.add('hidden');
        document.getElementById('reset-password-form').classList.remove('hidden');
        showSuccess(data.message || 'If an account with that email exists, a code has been sent.');
    } catch (error) {
        showError(error.message || 'Something went wrong. Please try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Code';
    }
}

// Step 2: Verify the OTP and set a new password
async function handleResetPassword(event) {
    event.preventDefault();
    clearMessages();

    const otp = document.getElementById('otp').value.trim();
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;
    const submitBtn = event.target.querySelector('button[type="submit"]');

    if (!otp || !newPassword) {
        showError('Please enter the code and your new password');
        return;
    }

    if (newPassword !== confirmNewPassword) {
        showError('Passwords do not match');
        return;
    }

    if (newPassword.length < 6) {
        showError('Password must be at least 6 characters');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Resetting...';

    try {
        const data = await apiRequest('/reset-password', {
            method: 'POST',
            body: JSON.stringify({ email: currentResetEmail, otp, newPassword })
        });

        showSuccess(data.message || 'Password reset successful. Redirecting to login...');
        setTimeout(() => {
            window.location.href = '/login';
        }, 2000);
    } catch (error) {
        showError(error.message || 'Invalid or expired code');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Reset Password';
    }
}

// Resend a fresh OTP to the same email
async function handleResendOtp() {
    clearMessages();

    if (!currentResetEmail) {
        return;
    }

    const resendBtn = document.getElementById('resend-otp-btn');
    resendBtn.disabled = true;
    resendBtn.textContent = 'Resending...';

    try {
        const data = await apiRequest('/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email: currentResetEmail })
        });
        showSuccess(data.message || 'A new code has been sent.');
    } catch (error) {
        showError(error.message || 'Could not resend code. Please try again shortly.');
    } finally {
        resendBtn.disabled = false;
        resendBtn.textContent = 'Resend Code';
    }
}
