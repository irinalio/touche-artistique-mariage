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
    updateCartUI();
    showToast(currentLanguage === 'fr' ? 'Produit ajouté au panier!' : 'Product added to cart!');
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartUI();
}

function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
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
                <img src="images/standard-figurine.jpg" alt="${item.name}" class="cart-item-image">
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
        const data = await response.json();
        
        if (data.reviews && data.reviews.length > 0) {
            reviewsContainer.innerHTML = data.reviews.map(review => `
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
    } catch (error) {
        console.error('Error loading reviews:', error);
        reviewsContainer.innerHTML = '<p style="text-align: center; color: var(--color-gray);">Reviews will appear here when the server is running.</p>';
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