// This file contains the JavaScript code for the frontend application. 
// It handles user interactions, including the login process and API calls to the backend.

document.addEventListener('DOMContentLoaded', function() {
    // Function to get base URL for redirects
    function getBaseUrl() {
        const path = window.location.pathname;
        // Check if we're in the lnk-aws subdirectory
        if (path.includes('/lnk-aws/')) {
            return '/lnk-aws/';
        }
        return '/';
    }

    // Function to check if user is logged in
    async function checkLogin() {
        const token = localStorage.getItem('token');
        const currentPage = window.location.pathname.split('/').pop().toLowerCase();
        const baseUrl = getBaseUrl();

        // List of public pages that don't require authentication
        const publicPages = ['login.html'];
        
        // Check if current page is public
        if (publicPages.includes(currentPage)) {
            if (token) {
                // If user is already logged in and tries to access login page,
                // redirect to index.html
                window.location.replace(baseUrl + 'index.html');
            }
            return;
        }

        // For all other pages, require authentication
        if (!token) {
            // Save the current page URL before redirecting
            sessionStorage.setItem('redirectUrl', window.location.href);
            window.location.replace(baseUrl + 'login.html'); // Use replace to prevent back button
            return;
        }

        // Optional: Verify token is valid by making an API call
        try {
            // You can add an API endpoint to verify the token
            // const response = await fetch('your-api-endpoint/verify', {
            //     headers: { 'Authorization': `Bearer ${token}` }
            // });
            // if (!response.ok) throw new Error('Invalid token');
        } catch (error) {
            console.error('Token validation failed:', error);
            localStorage.removeItem('token');
            sessionStorage.clear();
            window.location.replace('login.html');
            return;
        }
    }

    // Check login status when page loads
    checkLogin();

    // Prevent back navigation to protected pages after logout
    window.addEventListener('pageshow', function(event) {
        // Check if the page was loaded from browser cache
        if (event.persisted) {
            checkLogin();
        }
    });

    // Add listener for visibility change (tab switching/browser restore)
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            checkLogin();
        }
    });
});