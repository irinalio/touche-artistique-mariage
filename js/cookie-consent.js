(function() {
    if (localStorage.getItem('cookieConsent')) return;

    var banner = document.createElement('div');
    banner.id = 'cookieConsent';
    banner.setAttribute('style',
        'position:fixed;bottom:0;left:0;right:0;background:#333;color:#fff;padding:16px 24px;' +
        'display:flex;align-items:center;justify-content:space-between;gap:16px;z-index:99999;' +
        'font-family:Poppins,sans-serif;font-size:0.9rem;flex-wrap:wrap;'
    );

    banner.innerHTML =
        '<p style="margin:0;flex:1;min-width:200px;" data-en="We use cookies to improve your experience. By continuing to browse, you agree to our use of cookies." ' +
        'data-fr="Nous utilisons des cookies pour améliorer votre expérience. En continuant à naviguer, vous acceptez notre utilisation des cookies.">' +
        'We use cookies to improve your experience. By continuing to browse, you agree to our use of cookies.</p>' +
        '<div style="display:flex;gap:10px;flex-shrink:0;">' +
        '<button id="cookieAccept" style="background:linear-gradient(135deg,#FFD93D,#FFB6C1);color:#333;border:none;padding:8px 20px;border-radius:20px;cursor:pointer;font-weight:600;font-size:0.85rem;">Accept</button>' +
        '<button id="cookieDecline" style="background:transparent;color:#fff;border:1px solid #fff;padding:8px 20px;border-radius:20px;cursor:pointer;font-weight:600;font-size:0.85rem;">Decline</button>' +
        '</div>';

    document.body.appendChild(banner);

    document.getElementById('cookieAccept').addEventListener('click', function() {
        localStorage.setItem('cookieConsent', 'accepted');
        banner.remove();
    });

    document.getElementById('cookieDecline').addEventListener('click', function() {
        localStorage.setItem('cookieConsent', 'declined');
        banner.remove();
    });

    // Apply language if already set
    var lang = localStorage.getItem('language') || 'en';
    if (lang === 'fr') {
        var p = banner.querySelector('p');
        if (p && p.getAttribute('data-fr')) {
            p.textContent = p.getAttribute('data-fr');
        }
    }
})();
