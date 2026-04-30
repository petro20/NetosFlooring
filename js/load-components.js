// Load Header and Footer components
document.addEventListener('DOMContentLoaded', function() {
    loadComponent('header', 'header.html');
    loadComponent('footer', 'footer.html');
});

function loadComponent(elementId, filePath) {
    const element = document.getElementById(elementId);
    if (element) {
        fetch(filePath)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(html => {
                element.innerHTML = html;
                // Re-initialize hamburger after loading header
                if (elementId === 'header') {
                    initHamburger();
                }
            })
            .catch(error => {
                console.error(`Error loading ${filePath}:`, error);
            });
    }
}

function initHamburger() {
    const hamburger = document.getElementById('hamburger');
    const mobileNav = document.getElementById('mobileNav');
    
    if (hamburger && mobileNav) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            mobileNav.classList.toggle('active');
        });
    }
}