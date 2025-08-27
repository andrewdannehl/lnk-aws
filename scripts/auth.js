document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const loginMessage = document.getElementById('loginMessage');
    const signupMessage = document.getElementById('signupMessage');

    // Handle login
    if (loginForm) {
        loginForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const username = loginForm.username.value;
            const password = loginForm.password.value;
            console.log('Login form submitted:', { username, password });

            try {
                const response = await fetch('https://q2g27tp299.execute-api.us-east-2.amazonaws.com/authLogin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'login', username, password })
                });
                console.log('Login response status:', response.status);

                if (response.ok) {
                    const data = await response.json();
                    console.log('Login success:', data);
                    localStorage.setItem('token', data.token);
                    // Redirect based on environment
                    if (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') {
                        window.location.href = '/index.html';
                    } else {
                        window.location.href = '/lnk-aws/index.html';
                    }
                } else {
                    const errorData = await response.json();
                    console.log('Login error:', errorData);
                    loginMessage.textContent = errorData.message || 'Login failed. Please try again.';
                }
            } catch (error) {
                console.log('Login fetch error:', error);
                loginMessage.textContent = 'An error occurred. Please try again later.';
            }
        });
    }

    // Handle registration
    if (signupForm) {
        signupForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const username = signupForm.username.value;
            const password = signupForm.password.value;
            console.log('Signup form submitted:', { username, password });

            try {
                const response = await fetch('https://q2g27tp299.execute-api.us-east-2.amazonaws.com/authLogin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'register', username, password })
                });
                console.log('Response status:', response.status);

                if (response.ok) {
                    const data = await response.json();
                    console.log('Registration success:', data);
                    signupMessage.textContent = 'Account created! You can now log in.';
                } else {
                    const errorData = await response.json();
                    console.log('Registration error:', errorData);
                    signupMessage.textContent = errorData.message || 'Sign up failed. Please try again.';
                }
            } catch (error) {
                console.log('Fetch error:', error);
                signupMessage.textContent = 'An error occurred. Please try again later.';
            }
        });
    }
});
