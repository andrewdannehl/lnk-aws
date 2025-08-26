// This file contains the JavaScript code for the frontend application. 
// It handles user interactions, including the login process and API calls to the backend.

document.addEventListener('DOMContentLoaded', function() {

    // Function to check if user is logged in
    function checkLogin() {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html'; // Redirect to login page if not logged in
        }
    }

    //checkLogin();
});