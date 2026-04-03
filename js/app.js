// Custom Cart for Fully Custom Figurines
function addCustomToCart() {
    const customItem = {
        id: 'custom-figurine',
        name: 'Fully Custom Figurine',
        price: 99.99
    };
    addToCart(customItem);
    
    // Scroll to form
    document.getElementById('customForm').scrollIntoView({ behavior: 'smooth' });
}

// Language Management
let currentLanguage = 'en';

function toggleLanguage() {
    currentLanguage = currentLanguage === 'fr' ? 'en' : 'fr';
    updateLanguage();
    updateLangToggleUI();
}

function updateLanguage() {
    document.querySelectorAll('[data-fr][data-en]').forEach(element => {
        if (element.hasAttribute('data-fr-placeholder')) {
            element.placeholder = element.getAttribute(`data-${currentLanguage}-placeholder`);
        } else {
            element.textContent = element.getAttribute(`data-${currentLanguage}`);
        }
    });
    document.documentElement.lang = currentLanguage;
}

function updateLangToggleUI() {
    document.querySelector('.lang-fr').classList.toggle('active', currentLanguage === 'fr');
    document.querySelector('.lang-en').classList.toggle('active', currentLanguage === 'en');
}

// Shopping Cart
let cart = [];

function addToCart(product) {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();
    showToast(currentLanguage === 'fr' ? 'Produit ajouté au panier!' : 'Product added to cart!');
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();
}

function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartUI();
        }
    }
}

function updateCartUI() {
    const cartCount = document.getElementById('cartCount');
    const cartItems = document.getElementById('cartItems');
    const cartFooter = document.getElementById('cartFooter');
    const cartEmpty = document.getElementById('cartEmpty');
    
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    
    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="cart-empty">
                <i class="fas fa-shopping-bag"></i>
                <p>${currentLanguage === 'fr' ? 'Votre panier est vide' : 'Your cart is empty'}</p>
            </div>
        `;
        cartFooter.style.display = 'none';
    } else {
        cartItems.innerHTML = cart.map(item => `
            <div class="cart-item">
                <img src="images/standard-figurine.jpeg" alt="${item.name}" class="cart-item-image">
                <div class="cart-item-details">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">${item.price}€</div>
                    <div class="cart-item-quantity">
                        <button class="quantity-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                        <span>${item.quantity}</span>
                        <button class="quantity-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                        <button class="remove-item" onclick="removeFromCart(${item.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        document.getElementById('totalPrice').textContent = `${total}€`;
        cartFooter.style.display = 'block';
    }
}

function openCart() {
    document.getElementById('cartSidebar').classList.add('active');
    document.getElementById('cartOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCart() {
    document.getElementById('cartSidebar').classList.remove('active');
    document.getElementById('cartOverlay').classList.remove('active');
    document.body.style.overflow = '';
}

// Toast Notification
function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    toastMessage.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Mobile Menu
function openMobileMenu() {
    document.getElementById('mobileMenu').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeMobileMenu() {
    document.getElementById('mobileMenu').classList.remove('active');
    document.body.style.overflow = '';
}

// File Upload
let uploadedFiles = [];

function handleFileUpload(files) {
    const newFiles = Array.from(files).slice(0, 5 - uploadedFiles.length);
    uploadedFiles = [...uploadedFiles, ...newFiles];
    updateUploadPreview();
}

function removeFile(index) {
    uploadedFiles.splice(index, 1);
    updateUploadPreview();
}

function updateUploadPreview() {
    const preview = document.getElementById('uploadPreview');
    if (uploadedFiles.length === 0) {
        preview.innerHTML = '';
    } else {
        preview.innerHTML = uploadedFiles.map((file, index) => `
            <div class="preview-item-img">
                <img src="${URL.createObjectURL(file)}" alt="Preview ${index + 1}">
                <button type="button" class="preview-remove" onclick="removeFile(${index})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }
}

// Smooth Scroll
function smoothScroll(target) {
    const element = document.querySelector(target);
    if (element) {
        const offset = 80;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;
        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
}

// Navbar Scroll Effect
function handleNavbarScroll() {
    const navbar = document.getElementById('navbar');
    if (window.scrollY > 50) {
        navbar.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
    } else {
        navbar.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.08)';
    }
}

// Active Nav Link
function updateActiveNavLink() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop - 100;
        if (window.scrollY >= sectionTop) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Language toggle
    document.getElementById('langToggle').addEventListener('click', toggleLanguage);
    
    // Cart
    document.getElementById('cartBtn').addEventListener('click', openCart);
    document.getElementById('cartClose').addEventListener('click', closeCart);
    document.getElementById('cartOverlay').addEventListener('click', closeCart);
    
    // Mobile menu
    document.getElementById('mobileMenuBtn').addEventListener('click', openMobileMenu);
    document.getElementById('mobileMenuClose').addEventListener('click', closeMobileMenu);
    document.querySelectorAll('.mobile-nav-link').forEach(link => {
        link.addEventListener('click', closeMobileMenu);
    });
    
    // Add to cart buttons
    document.querySelectorAll('.add-to-cart-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const card = button.closest('.product-card');
            const product = {
                id: parseInt(card.dataset.id),
                name: card.dataset.name,
                price: parseInt(card.dataset.price)
            };
            addToCart(product);
        });
    });
    
    // File upload
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    
    if (uploadZone && fileInput) {
        uploadZone.addEventListener('click', () => fileInput.click());
        
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.style.background = 'var(--color-yellow-light)';
        });
        
        uploadZone.addEventListener('dragleave', () => {
            uploadZone.style.background = 'var(--color-pink-light)';
        });
        
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.style.background = 'var(--color-pink-light)';
            handleFileUpload(e.dataTransfer.files);
        });
        
        fileInput.addEventListener('change', (e) => {
            handleFileUpload(e.target.files);
        });
    }
    
    // Custom form
    const customForm = document.getElementById('customForm');
    if (customForm) {
        customForm.addEventListener('submit', (e) => {
            e.preventDefault();
            showToast(currentLanguage === 'fr' ? 'Demande envoyée avec succès!' : 'Request sent successfully!');
            customForm.reset();
            uploadedFiles = [];
            updateUploadPreview();
        });
    }
    
    // Smooth scroll for nav links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            e.preventDefault();
            const target = anchor.getAttribute('href');
            smoothScroll(target);
        });
    });
    
    // Scroll events
    window.addEventListener('scroll', () => {
        handleNavbarScroll();
        updateActiveNavLink();
    });
    
    // Checkout button
    document.querySelector('.checkout-btn')?.addEventListener('click', () => {
        if (cart.length > 0) {
            showToast(currentLanguage === 'fr' ? 'Redirection vers la page de paiement...' : 'Redirecting to payment page...');
        }
    });
    
    // Newsletter form
    document.querySelector('.newsletter-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        showToast(currentLanguage === 'fr' ? 'Merci pour votre inscription!' : 'Thank you for subscribing!');
        e.target.reset();
    });
    
    // Load reviews from API
    loadReviews();
});

// Load reviews from database
async function loadReviews() {
    const reviewsContainer = document.getElementById('reviewsContainer');
    if (!reviewsContainer) return;
    
    try {
        const response = await fetch('/api/reviews');
        if (response.ok) {
            const data = await response.json();
            displayReviews(data.reviews || []);
            localStorage.setItem('tam_reviews', JSON.stringify(data.reviews || []));
            return;
        }
    } catch (error) {
        console.log('API unavailable, using localStorage fallback');
    }
    
    const cached = localStorage.getItem('tam_reviews');
    const reviews = cached ? JSON.parse(cached) : [];
    displayReviews(reviews);
}

function displayReviews(reviews) {
    const reviewsContainer = document.getElementById('reviewsContainer');
    if (!reviewsContainer) return;
    
    if (reviews && reviews.length > 0) {
        reviewsContainer.innerHTML = reviews.map(review => `
            <div class="review-card">
                <div class="review-stars">
                    ${Array(5).fill(0).map((_, i) => 
                        `<i class="fas fa-star${i < review.rating ? '' : ' disabled'}"></i>`
                    ).join('')}
                </div>
                <p class="review-text">${review.text}</p>
                <div class="review-author">
                    <div class="author-avatar">${review.avatar}</div>
                    <div class="author-info">
                        <span class="author-name">${review.name}</span>
                        <span class="review-date">${review.date}</span>
                    </div>
                </div>
            </div>
        `).join('');
    } else {
        reviewsContainer.innerHTML = '<p style="text-align: center; color: var(--color-gray);">No reviews yet. Be the first to leave one!</p>';
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeCart();
        closeMobileMenu();
    }
});

// Intersection Observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

document.querySelectorAll('.product-card, .build-option, .feature, .review-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'all 0.6s ease';
    observer.observe(el);
});

// Custom Form Functions
let currentStep = 1;
const totalSteps = 7;

const prices = {
    small: 79.99,
    medium: 99.99,
    large: 129.99,
    'cake-topper': 10,
    keepsake: 5,
    'gift-box': 15,
    express: 25,
    rush: 50
};

function openCustomForm() {
    const modal = document.getElementById('customFormModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        currentStep = 1;
        updateFormProgress();
    }
}

function closeCustomForm() {
    const modal = document.getElementById('customFormModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function updateFormProgress() {
    const steps = document.querySelectorAll('.progress-step');
    steps.forEach((step, index) => {
        if (index + 1 < currentStep) {
            step.classList.add('completed');
            step.classList.remove('active');
        } else if (index + 1 === currentStep) {
            step.classList.add('active');
            step.classList.remove('completed');
        } else {
            step.classList.remove('active', 'completed');
        }
    });

    document.querySelectorAll('.form-step').forEach(step => step.classList.remove('active'));
    const activeStep = document.querySelector('.form-step[data-step="' + currentStep + '"]');
    if (activeStep) activeStep.classList.add('active');

    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    if (prevBtn) prevBtn.style.visibility = currentStep === 1 ? 'hidden' : 'visible';
    if (nextBtn) {
        if (currentStep === totalSteps) {
            nextBtn.innerHTML = (currentLanguage === 'fr' ? 'Soumettre la Commande' : 'Submit Order') + ' <i class="fas fa-check"></i>';
        } else {
            nextBtn.innerHTML = (currentLanguage === 'fr' ? 'Suivant' : 'Next') + ' <i class="fas fa-arrow-right"></i>';
        }
    }
}

function nextStep() {
    if (currentStep === totalSteps) {
        submitCustomOrder();
        return;
    }
    
    if (currentStep === 3) {
        const groomName = document.getElementById('groomName')?.value;
        const brideName = document.getElementById('brideName')?.value;
        const weddingDate = document.getElementById('weddingDate')?.value;
        if (!groomName || !brideName || !weddingDate) {
            showToast(currentLanguage === 'fr' ? 'Veuillez remplir tous les champs obligatoires' : 'Please fill in all required fields');
            return;
        }
    }

    if (currentStep === 6) {
        const photoConfirmed = document.getElementById('photoConfirmation')?.checked;
        const proofApproved = document.getElementById('proofApproval')?.checked;
        if (!photoConfirmed || !proofApproved) {
            showToast(currentLanguage === 'fr' ? 'Veuillez confirmer les conditions' : 'Please confirm the conditions');
            return;
        }
        prepareReview();
    }

    if (currentStep === 7) {
        const email = document.getElementById('customerEmail')?.value;
        if (!email) {
            showToast(currentLanguage === 'fr' ? "Veuillez entrer votre email" : 'Please enter your email');
            return;
        }
    }

    currentStep++;
    updateFormProgress();
}

function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        updateFormProgress();
    }
}

function toggleCustomText() {
    const preset = document.getElementById('additionalTextPreset')?.value;
    const customInput = document.getElementById('customText');
    if (customInput) customInput.style.display = preset === 'custom' ? 'block' : 'none';
}

function selectSwatch(element) {
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
    element.classList.add('selected');
    const skinToneInput = document.getElementById('skinTone');
    if (skinToneInput) skinToneInput.value = element.title;
}

function handleFileUpload(input, displayId) {
    const display = document.getElementById(displayId);
    if (display && input.files.length > 0) {
        let html = '';
        for (let i = 0; i < input.files.length; i++) {
            html += '<div class="uploaded-file"><i class="fas fa-check-circle"></i> ' + input.files[i].name + '</div>';
        }
        display.innerHTML = html;
    }
}

function prepareReview() {
    const groomName = document.getElementById('groomName')?.value || '';
    const brideName = document.getElementById('brideName')?.value || '';
    const weddingDate = document.getElementById('weddingDate')?.value || '';
    
    const reviewNames = document.getElementById('reviewNames');
    const reviewDate = document.getElementById('reviewDate');
    if (reviewNames) reviewNames.textContent = brideName + ' & ' + groomName;
    if (reviewDate) reviewDate.textContent = weddingDate;

    const productType = document.querySelector('input[name="productType"]:checked')?.value || 'figurine';
    const productNames = { figurine: 'Figurine', 'cake-topper': 'Cake Topper', keepsake: 'Keepsake', 'gift-box': 'Gift Box' };
    const reviewProduct = document.getElementById('reviewProduct');
    if (reviewProduct) reviewProduct.textContent = productNames[productType];

    const size = document.querySelector('input[name="figurineSize"]:checked')?.value || 'small';
    const sizeNames = { small: 'Small (15cm)', medium: 'Medium (20cm)', large: 'Large (25cm)' };
    const basePrice = prices[size];
    const reviewSize = document.getElementById('reviewSize');
    if (reviewSize) reviewSize.textContent = sizeNames[size] + ' - ' + basePrice.toFixed(2) + '€';

    const base = document.querySelector('input[name="baseType"]:checked')?.value || 'round';
    const baseNames = { round: 'Round', square: 'Square' };
    const reviewBase = document.getElementById('reviewBase');
    if (reviewBase) reviewBase.textContent = baseNames[base] + ' (3D Printed)';

    const font = document.querySelector('input[name="fontStyle"]:checked')?.value || 'script';
    const fontNames = { script: 'Script', block: 'Block', serif: 'Classic', none: 'No Text' };
    const reviewFont = document.getElementById('reviewFont');
    if (reviewFont) reviewFont.textContent = fontNames[font];

    const delivery = document.querySelector('input[name="delivery"]:checked')?.value || 'standard';
    const deliveryNames = { standard: 'Standard (2-3 weeks)', express: 'Express (10 days)', rush: 'Rush (5 days)' };
    const reviewDelivery = document.getElementById('reviewDelivery');
    if (reviewDelivery) reviewDelivery.textContent = deliveryNames[delivery];

    let total = basePrice;
    let options = 0;

    if (productType !== 'figurine') {
        options += prices[productType];
        total += prices[productType];
    }

    const summaryOptions = document.getElementById('summaryOptions');
    const summaryOptionsValue = document.getElementById('summaryOptionsValue');
    if (summaryOptionsValue) summaryOptionsValue.textContent = options > 0 ? '+' + options.toFixed(2) + '€' : '0€';

    const rushCost = prices[delivery] || 0;
    const summaryRush = document.getElementById('summaryRush');
    const summaryRushValue = document.getElementById('summaryRushValue');
    if (rushCost > 0) {
        if (summaryRush) summaryRush.style.display = 'flex';
        if (summaryRushValue) summaryRushValue.textContent = '+' + rushCost.toFixed(2) + '€';
        total += rushCost;
    } else {
        if (summaryRush) summaryRush.style.display = 'none';
    }

    const summaryBase = document.getElementById('summaryBase');
    const summaryTotal = document.getElementById('summaryTotal');
    if (summaryBase) summaryBase.textContent = basePrice.toFixed(2) + '€';
    if (summaryTotal) summaryTotal.textContent = total.toFixed(2) + '€';
}

function submitCustomOrder() {
    const orderData = {
        productType: document.querySelector('input[name="productType"]:checked')?.value,
        groomName: document.getElementById('groomName')?.value,
        brideName: document.getElementById('brideName')?.value,
        weddingDate: document.getElementById('weddingDate')?.value,
        additionalText: document.getElementById('additionalTextPreset')?.value === 'custom' 
            ? document.getElementById('customText')?.value 
            : document.getElementById('additionalTextPreset')?.value,
        fontStyle: document.querySelector('input[name="fontStyle"]:checked')?.value,
        baseType: document.querySelector('input[name="baseType"]:checked')?.value,
        figurineSize: document.querySelector('input[name="figurineSize"]:checked')?.value,
        outfitColor: document.getElementById('outfitColor')?.value,
        skinTone: document.getElementById('skinTone')?.value,
        delivery: document.querySelector('input[name="delivery"]:checked')?.value,
        specialRequests: document.getElementById('specialRequests')?.value,
        customerEmail: document.getElementById('customerEmail')?.value
    };

    const size = orderData.figurineSize || 'small';
    const sizeNames = { small: 'S', medium: 'M', large: 'L' };
    const productTypeNames = { figurine: 'Custom Figurine', 'cake-topper': 'Custom Cake Topper', keepsake: 'Custom Keepsake', 'gift-box': 'Custom Gift Box' };
    const itemName = productTypeNames[orderData.productType] + ' (' + sizeNames[size] + ') - ' + orderData.brideName + ' & ' + orderData.groomName;

    let price = prices[size];
    if (orderData.productType !== 'figurine') price += prices[orderData.productType];
    if (orderData.delivery !== 'standard') price += prices[orderData.delivery];

    localStorage.setItem('customOrder', JSON.stringify(orderData));
    
    const customItem = {
        id: 'custom-' + Date.now(),
        name: itemName,
        price: price
    };
    addToCart(customItem);
    
    closeCustomForm();
    
    const successModal = document.getElementById('successModal');
    if (successModal) successModal.classList.add('active');
}

function closeSuccessModal() {
    const successModal = document.getElementById('successModal');
    if (successModal) successModal.classList.remove('active');
    openCart();
}

// Initialize option card click handlers
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.option-card').forEach(card => {
        const input = card.querySelector('input[type="radio"]');
        if (input) {
            card.addEventListener('click', function() {
                document.querySelectorAll('input[name="' + input.name + '"]').forEach(r => {
                    r.closest('.option-card')?.classList.remove('selected');
                });
                this.classList.add('selected');
            });
        }
    });

    document.querySelectorAll('.size-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.size-option').forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
        });
    });
});

// Semi-Custom Configurator
const semiConfig = {
    base: { value: 'classic', image: 'images/standard-figurine.jpeg', name: 'Classic Couple', price: 59.99 },
    hair: { style: 'short', color: 'dark-brown' },
    outfit: { style: 'classic' },
    skinTone: 'light',
    groomName: '',
    brideName: ''
};

const baseOptions = {
    classic: { image: 'images/standard-figurine.jpeg', name: 'Classic Couple', price: 59.99 },
    romantic: { image: 'images/standard-figurine1.jpeg', name: 'Romantic Couple', price: 59.99 },
    elegant: { image: 'images/standard-figurine4.jpeg', name: 'Elegant Couple', price: 59.99 }
};

const hairStyles = {
    short: 'Short Hair',
    long: 'Long Hair',
    curly: 'Curly Hair',
    bun: 'Updo/Bun'
};

const outfitStyles = {
    classic: 'Classic Dress',
    mermaid: 'Mermaid Dress',
    ballgown: 'Ball Gown',
    suit: 'Suit'
};

const skinTones = {
    light: 'Light',
    'light-medium': 'Light Medium',
    medium: 'Medium',
    'medium-dark': 'Medium Dark',
    dark: 'Dark',
    'deep-dark': 'Deep Dark'
};

function selectBase(value, element) {
    document.querySelectorAll('.config-option').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    semiConfig.base = baseOptions[value];
    updateSemiPreview();
}

function selectHair(value, element) {
    document.querySelectorAll('.hair-btn').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    semiConfig.hair.style = value;
    updateSemiPreview();
}

function selectHairColor(value, element) {
    const swatches = element.parentElement.querySelectorAll('.color-swatch');
    swatches.forEach(s => s.classList.remove('selected'));
    element.classList.add('selected');
    semiConfig.hair.color = value;
    updateHairOverlay();
}

function updateHairOverlay() {
    const hairOverlay = document.getElementById('hairOverlay');
    if (hairOverlay) {
        const hairColors = {
            'dark-brown': '#3D2314',
            auburn: '#8B4513',
            blonde: '#DAA520',
            black: '#1a1a1a',
            'light-red': '#B5523B'
        };
        const color = hairColors[semiConfig.hair.color] || '#3D2314';
        hairOverlay.style.background = `radial-gradient(ellipse at 50% 30%, ${color} 0%, transparent 50%)`;
        hairOverlay.style.mixBlendMode = 'multiply';
        hairOverlay.style.opacity = '0.6';
    }
}

function updateSkinOverlay() {
    const skinOverlay = document.getElementById('skinOverlay');
    if (skinOverlay) {
        const skinColors = {
            light: '#FFDBAC',
            'light-medium': '#E8B88A',
            medium: '#D4A574',
            'medium-dark': '#A67B4C',
            dark: '#6B4226',
            'deep-dark': '#4A2E1A'
        };
        const color = skinColors[semiConfig.skinTone] || '#FFDBAC';
        skinOverlay.style.background = `radial-gradient(ellipse at 50% 60%, ${color} 0%, transparent 70%)`;
        skinOverlay.style.mixBlendMode = 'color';
        skinOverlay.style.opacity = '0.5';
    }
}

function selectOutfit(value, element) {
    document.querySelectorAll('.outfit-btn').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    semiConfig.outfit.style = value;
    updateSemiPreview();
}

function selectSkinTone(value, element) {
    const swatches = element.parentElement.querySelectorAll('.color-swatch');
    swatches.forEach(s => s.classList.remove('selected'));
    element.classList.add('selected');
    semiConfig.skinTone = value;
    updateSemiPreview();
}

function updateSemiPreview() {
    const previewImage = document.getElementById('previewImage');
    const previewName = document.getElementById('previewName');
    const previewPrice = document.getElementById('previewPrice');
    const hairSummary = document.getElementById('hairSummary');
    const outfitSummary = document.getElementById('outfitSummary');
    const skinSummary = document.getElementById('skinSummary');
    const semiTotalPrice = document.getElementById('semiTotalPrice');

    if (previewImage) previewImage.src = semiConfig.base.image;
    if (previewName) {
        let name = semiConfig.base.name;
        const groom = document.getElementById('semiGroomName')?.value;
        const bride = document.getElementById('semiBrideName')?.value;
        if (groom || bride) {
            name = (bride || 'Bride') + ' & ' + (groom || 'Groom');
        }
        previewName.textContent = name;
    }
    if (hairSummary) hairSummary.textContent = hairStyles[semiConfig.hair.style];
    if (outfitSummary) outfitSummary.textContent = outfitStyles[semiConfig.outfit.style];
    if (skinSummary) skinSummary.textContent = skinTones[semiConfig.skinTone];
    if (previewPrice) previewPrice.textContent = semiConfig.base.price.toFixed(2) + '€';
    if (semiTotalPrice) semiTotalPrice.textContent = semiConfig.base.price.toFixed(2) + '€';
}

function addSemiCustomToCart() {
    const groom = document.getElementById('semiGroomName')?.value || '';
    const bride = document.getElementById('semiBrideName')?.value || '';
    
    let itemName = 'Semi-Custom Figurine';
    if (groom || bride) {
        itemName += ' - ' + (bride || 'Bride') + ' & ' + (groom || 'Groom');
    }
    itemName += ' (' + semiConfig.base.name.replace(' Couple', '') + ')';

    const customItem = {
        id: 'semi-' + Date.now(),
        name: itemName,
        price: semiConfig.base.price,
        customizations: {
            base: semiConfig.base.name,
            hairStyle: semiConfig.hair.style,
            hairColor: semiConfig.hair.color,
            outfit: semiConfig.outfit.style,
            skinTone: semiConfig.skinTone
        }
    };
    
    addToCart(customItem);
}

// Listen for name input changes
document.addEventListener('DOMContentLoaded', () => {
    const groomInput = document.getElementById('semiGroomName');
    const brideInput = document.getElementById('semiBrideName');
    if (groomInput) groomInput.addEventListener('input', updateSemiPreview);
    if (brideInput) brideInput.addEventListener('input', updateSemiPreview);
});