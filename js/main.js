// Main JavaScript for C & A Home Improvement

document.addEventListener('DOMContentLoaded', function() {
    // Initialize hamburger menu toggle
    initHamburger();
    
    // Initialize form validation
    initFormValidation();

    // Initialize estimate wizard
    initEstimateWizard();

    // Initialize Thumbtack service area map
    initThumbtackServiceMap();
    
    // Initialize lazy loading for images
    initLazyLoading();
});

// Hamburger Menu Toggle
function initHamburger() {
    const hamburger = document.getElementById('hamburger');
    const mobileNav = document.getElementById('mobileNav');
    
    if (hamburger && mobileNav) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            mobileNav.classList.toggle('active');
        });
        
        // Close mobile menu when clicking a link
        const mobileLinks = mobileNav.querySelectorAll('a');
        mobileLinks.forEach(link => {
            link.addEventListener('click', function() {
                hamburger.classList.remove('active');
                mobileNav.classList.remove('active');
            });
        });
    }
}

// Form Validation
function initFormValidation() {
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) {
        if (contactForm.dataset.wizardForm !== undefined) {
            return;
        }

        const formAlert = contactForm.querySelector('[data-form-alert]');

        function setFormMessage(message, type = 'success') {
            if (!formAlert) {
                return;
            }

            formAlert.textContent = message;
            formAlert.classList.add('active');
            formAlert.classList.toggle('error', type === 'error');
        }

        function clearFormMessage() {
            if (!formAlert) {
                return;
            }

            formAlert.textContent = '';
            formAlert.classList.remove('active', 'error');
        }

        function getFieldGroup(field) {
            return field.closest('.form-group');
        }

        function setFieldError(field, hasError) {
            const group = getFieldGroup(field);

            if (group) {
                group.classList.toggle('error', hasError);
            }

            field.setAttribute('aria-invalid', hasError ? 'true' : 'false');
        }

        function isValidEmail(value) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        }

        function isValidPhone(value) {
            const digits = value.replace(/\D/g, '');

            return /^[\d\s\-\(\)\+\.]+$/.test(value) && digits.length >= 10;
        }

        function validateField(field) {
            const value = field.value.trim();

            if (field.required && !value) {
                setFieldError(field, true);
                return false;
            }

            if (field.type === 'email' && value && !isValidEmail(value)) {
                setFieldError(field, true);
                return false;
            }

            if (field.type === 'tel' && value && !isValidPhone(value)) {
                setFieldError(field, true);
                return false;
            }

            setFieldError(field, false);
            return true;
        }

        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();

            let isValid = true;
            let firstInvalidField = null;
            const requiredFields = contactForm.querySelectorAll('[required]');
            const fieldsToValidate = contactForm.querySelectorAll('input, select, textarea');

            clearFormMessage();

            // Clear previous errors
            contactForm.querySelectorAll('.form-group').forEach(group => {
                group.classList.remove('error');
            });

            requiredFields.forEach(field => field.setAttribute('aria-required', 'true'));

            fieldsToValidate.forEach(field => {
                if (!validateField(field)) {
                    isValid = false;

                    if (!firstInvalidField) {
                        firstInvalidField = field;
                    }
                }
            });

            if (isValid) {
                setFormMessage('Thank you for your request. We will contact you within 24 hours.');
                contactForm.reset();
                contactForm.querySelectorAll('[aria-invalid]').forEach(field => {
                    field.setAttribute('aria-invalid', 'false');
                });
            } else {
                setFormMessage('Please review the highlighted fields before sending your request.', 'error');

                if (firstInvalidField) {
                    firstInvalidField.focus();
                }
            }
        });

        // Remove error class on input
        contactForm.querySelectorAll('input, select, textarea').forEach(field => {
            field.addEventListener('input', function() {
                clearFormMessage();
                validateField(field);
            });

            field.addEventListener('blur', function() {
                validateField(field);
            });
        });
    }
}

function initEstimateWizard() {
    const wizard = document.querySelector('[data-wizard-form]');

    if (!wizard) {
        return;
    }

    const steps = Array.from(wizard.querySelectorAll('[data-step]'));
    const dots = Array.from(wizard.querySelectorAll('[data-step-dot]'));
    const backButton = wizard.querySelector('[data-wizard-back]');
    const nextButton = wizard.querySelector('[data-wizard-next]');
    const submitButton = wizard.querySelector('[data-wizard-submit]');
    let currentStep = 0;
    let finalPanel = 'description';

    function setFinalPanel(panel) {
        finalPanel = panel;

        wizard.querySelectorAll('[data-final-panel]').forEach(element => {
            element.classList.toggle('final-panel-hidden', element.dataset.finalPanel !== panel);
        });
    }

    function showStep(index) {
        currentStep = Math.max(0, Math.min(index, steps.length - 1));

        if (currentStep !== steps.length - 1) {
            setFinalPanel('description');
        }

        steps.forEach((step, stepIndex) => {
            step.classList.toggle('active', stepIndex === currentStep);
        });

        dots.forEach((dot, dotIndex) => {
            dot.classList.toggle('active', dotIndex === currentStep);
            dot.classList.toggle('complete', dotIndex < currentStep);
        });

        backButton.disabled = currentStep === 0;
        nextButton.style.display = currentStep === steps.length - 1 && finalPanel === 'consent' ? 'none' : 'inline-flex';
        submitButton.style.display = currentStep === steps.length - 1 && finalPanel === 'consent' ? 'inline-flex' : 'none';
    }

    function validateStep(step) {
        let isValid = true;
        const fields = Array.from(step.querySelectorAll('[required]')).filter(field => !field.closest('.final-panel-hidden'));
        const choiceError = step.querySelector('[data-choice-error]');

        step.querySelectorAll('.form-group').forEach(group => {
            group.classList.remove('error');
        });

        if (choiceError) {
            choiceError.classList.remove('active');
        }

        fields.forEach(field => {
            if (field.type === 'radio') {
                const checked = wizard.querySelector(`input[name="${field.name}"]:checked`);
                if (!checked) {
                    isValid = false;
                    if (choiceError) {
                        choiceError.classList.add('active');
                    }
                }
                return;
            }

            if (field.type === 'checkbox') {
                if (!field.checked) {
                    isValid = false;
                    if (choiceError) {
                        choiceError.classList.add('active');
                    }
                }
                return;
            }

            if (!field.value.trim()) {
                isValid = false;
                const group = field.closest('.form-group');
                if (group) {
                    group.classList.add('error');
                }
            }

            if (field.type === 'email' && field.value) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(field.value)) {
                    isValid = false;
                    const group = field.closest('.form-group');
                    if (group) {
                        group.classList.add('error');
                    }
                }
            }

            if (field.type === 'tel' && field.value) {
                const phoneRegex = /^[\d\s\-\(\)\+]+$/;
                if (!phoneRegex.test(field.value) || field.value.replace(/\D/g, '').length < 10) {
                    isValid = false;
                    const group = field.closest('.form-group');
                    if (group) {
                        group.classList.add('error');
                    }
                }
            }
        });

        return isValid;
    }

    nextButton.addEventListener('click', function() {
        if (validateStep(steps[currentStep])) {
            if (currentStep === steps.length - 1 && finalPanel === 'description') {
                setFinalPanel('consent');
                showStep(currentStep);
                return;
            }

            showStep(currentStep + 1);
        }
    });

    backButton.addEventListener('click', function() {
        if (currentStep === steps.length - 1 && finalPanel === 'consent') {
            setFinalPanel('description');
            showStep(currentStep);
            return;
        }

        showStep(currentStep - 1);
    });

    dots.forEach((dot, dotIndex) => {
        dot.addEventListener('click', function() {
            if (dotIndex <= currentStep || validateStep(steps[currentStep])) {
                showStep(dotIndex);
            }
        });
    });

    wizard.querySelectorAll('input, select, textarea').forEach(field => {
        field.addEventListener('input', function() {
            const group = field.closest('.form-group');
            if (group) {
                group.classList.remove('error');
            }
        });
    });

    wizard.addEventListener('submit', function(e) {
        e.preventDefault();

        const allValid = validateStep(steps[currentStep]);

        if (allValid) {
            window.location.href = 'thank-you.html';
        }
    });

    showStep(0);
}

function initThumbtackServiceMap() {
    const mapElement = document.getElementById('thumbtackServiceMap');

    if (!mapElement) {
        return;
    }

    if (typeof L === 'undefined') {
        mapElement.innerHTML = '<iframe class="satellite-map-frame" src="https://maps.google.com/maps?q=Elizabeth%2C%20New%20Jersey&t=k&z=10&output=embed" title="Satellite map of C & A Home Improvement service area around Elizabeth, New Jersey" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>';
        return;
    }

    const thumbtackLocations = [
        {
            name: 'Elizabeth, NJ',
            coordinates: [40.66399, -74.2107],
            label: 'Public Thumbtack service location',
            details: 'Listed on Thumbtack as serving Elizabeth, NJ'
        }
    ];

    const map = L.map(mapElement, {
        center: [40.68, -74.23],
        zoom: 10,
        scrollWheelZoom: false,
        zoomControl: true
    });

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri'
    }).addTo(map);

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Labels &copy; Esri'
    }).addTo(map);

    const thumbtackIcon = L.divIcon({
        className: 'thumbtack-map-marker',
        html: '<span></span>',
        iconSize: [34, 42],
        iconAnchor: [17, 38],
        popupAnchor: [0, -34]
    });

    thumbtackLocations.forEach(location => {
        L.marker(location.coordinates, { icon: thumbtackIcon })
            .addTo(map)
            .bindPopup(`<strong>${location.name}</strong><br>${location.label}<br><span>${location.details}</span>`);
    });

    const bounds = L.latLngBounds(thumbtackLocations.map(location => location.coordinates));
    map.fitBounds(bounds.pad(0.35), { maxZoom: 11 });
}

// Lazy Loading for Images
function initLazyLoading() {
    const lazyImages = document.querySelectorAll('img[data-src]');
    
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        lazyImages.forEach(img => {
            imageObserver.observe(img);
        });
    } else {
        // Fallback for older browsers
        lazyImages.forEach(img => {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
        });
    }
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add fade-in animation on scroll
function addFadeInOnScroll() {
    const fadeElements = document.querySelectorAll('.service-card, .gallery-item, .testimonial-card, .feature-card');
    
    if ('IntersectionObserver' in window) {
        const fadeObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    entry.target.classList.add('fade-in');
                    fadeObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        
        fadeElements.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            fadeObserver.observe(el);
        });
    }
}

// Initialize fade-in animations
addFadeInOnScroll();
