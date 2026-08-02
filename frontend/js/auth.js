// SportVault Authentication Module

// Use the deployed Railway backend URL in production, or localhost for development
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api'
    : 'https://sportsvault-production.up.railway.app/api';


// Check if user is authenticated
function isAuthenticated() {
    return localStorage.getItem('token') !== null;
}

// Get current user
function getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

// Get auth token
function getToken() {
    return localStorage.getItem('token');
}

// Set auth data
function setAuth(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
}

// Clear auth data
function clearAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}

// Redirect if not authenticated
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = '/login';
        return false;
    }
    return true;
}

// Redirect if already authenticated
function redirectIfAuth() {
    if (isAuthenticated()) {
        window.location.href = '/dashboard';
        return true;
    }
    return false;
}

// API request helper
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };

    // Add auth token if available
    const token = getToken();
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(url, config);
        const data = await response.json();

        // Token expired or invalid - clear stored auth and send to login
        if (response.status === 401) {
            clearAuth();
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
                throw new Error('Your session has expired. Please login again.');
            }
        }

        if (!response.ok) {
            throw new Error(data.message || 'Request failed');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('error-message');
    const submitBtn = event.target.querySelector('button[type="submit"]');

    // Clear previous errors
    errorDiv.classList.add('hidden');
    errorDiv.textContent = '';

    // Validate
    if (!email || !password) {
        errorDiv.textContent = 'Please enter both email and password';
        errorDiv.classList.remove('hidden');
        return;
    }

    // Show loading
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';

    try {
        const data = await apiRequest('/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        // Store auth data
        setAuth(data.token, data.user);

        // Redirect to dashboard
        window.location.href = '/dashboard';
    } catch (error) {
        errorDiv.textContent = error.message || 'Login failed. Please check your credentials.';
        errorDiv.classList.remove('hidden');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Login';
    }
}

// Handle registration form submission
async function handleRegister(event) {
    event.preventDefault();

    const studentId = document.getElementById('studentId').value;
    const name = document.getElementById('name').value;
    const school = document.getElementById('school') ? document.getElementById('school').value : '';
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const errorDiv = document.getElementById('error-message');
    const submitBtn = event.target.querySelector('button[type="submit"]');

    // Clear previous errors
    errorDiv.classList.add('hidden');
    errorDiv.textContent = '';

    // Validate
    if (!studentId || !name || !email || !password) {
        errorDiv.textContent = 'Please fill in all fields';
        errorDiv.classList.remove('hidden');
        return;
    }

    if (password !== confirmPassword) {
        errorDiv.textContent = 'Passwords do not match';
        errorDiv.classList.remove('hidden');
        return;
    }

    if (password.length < 6) {
        errorDiv.textContent = 'Password must be at least 6 characters';
        errorDiv.classList.remove('hidden');
        return;
    }

    // Show loading
    submitBtn.disabled = true;
    submitBtn.textContent = 'Registering...';

    try {
        await apiRequest('/register', {
            method: 'POST',
            body: JSON.stringify({
                student_id: studentId,
                name: name,
                school: school,
                email: email,
                password: password
            })
        });

        // Show success and redirect to login
        alert('Registration successful! Please login.');
        window.location.href = '/login';
    } catch (error) {
        errorDiv.textContent = error.message || 'Registration failed. Please try again.';
        errorDiv.classList.remove('hidden');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Register';
    }
}

// Handle logout
function handleLogout() {
    clearAuth();
    window.location.href = '/login';
}

// Update navbar based on auth status
function updateNavbar() {
    const user = getCurrentUser();
    const userNameSpan = document.getElementById('user-name');
    const userRoleSpan = document.getElementById('user-role');
    const logoutBtn = document.getElementById('logout-btn');

    if (user && userNameSpan) {
        userNameSpan.textContent = user.name;
        if (userRoleSpan) {
            userRoleSpan.textContent = `(${user.role})`;
        }
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

// Show/hide elements based on role
function updateUIBasedOnRole() {
    const user = getCurrentUser();
    if (!user) return;

    const adminElements = document.querySelectorAll('.admin-only');
    const studentElements = document.querySelectorAll('.student-only');

    if (user.role === 'admin') {
        adminElements.forEach(el => el.classList.remove('hidden'));
        studentElements.forEach(el => el.classList.add('hidden'));
    } else {
        adminElements.forEach(el => el.classList.add('hidden'));
        studentElements.forEach(el => el.classList.remove('hidden'));
    }
}

// Initialize auth module
document.addEventListener('DOMContentLoaded', () => {
    updateNavbar();
    updateUIBasedOnRole();
});
