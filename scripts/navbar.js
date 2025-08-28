// Navbar functionality
document.addEventListener('DOMContentLoaded', function() {
    const accountBtn = document.querySelector('.account-btn');
    const dropdownMenu = document.querySelector('.dropdown-menu');
    const accountMenu = document.querySelector('.account-menu');
    let hideTimeout;

    function showDropdown() {
        clearTimeout(hideTimeout);
        dropdownMenu.style.display = 'flex';
    }

    function scheduleHideDropdown() {
        clearTimeout(hideTimeout);
        hideTimeout = setTimeout(() => {
            dropdownMenu.style.display = 'none';
        }, 1000); // 3 seconds delay
    }

    // Show dropdown on hover
    accountBtn.addEventListener('mouseenter', showDropdown);

    // Handle mouse entering/leaving the account menu area
    accountMenu.addEventListener('mouseenter', showDropdown);
    accountMenu.addEventListener('mouseleave', scheduleHideDropdown);

    // Hide dropdown immediately when clicking a menu item
    dropdownMenu.addEventListener('click', (e) => {
        if (e.target.tagName === 'A') {
            dropdownMenu.style.display = 'none';
            clearTimeout(hideTimeout);
        }
    });

    // Handle logout
    document.querySelector('.logout-btn').addEventListener('click', async (e) => {
        e.preventDefault();
        
        // Clear JWT token from localStorage
        localStorage.removeItem('jwt_token');
        
        // Redirect to login page
        window.location.href = '/login.html';
    });
});
