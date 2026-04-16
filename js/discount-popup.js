(function () {
  // Show at most once per 7 days per browser
  var KEY = 'tam_discount_popup_seen_at';
  var SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  try {
    var seen = parseInt(localStorage.getItem(KEY) || '0', 10);
    if (seen && Date.now() - seen < SEVEN_DAYS) return;
  } catch (e) {}

  var css = `
  .tam-discount-overlay{position:fixed;inset:0;background:rgba(30,20,30,0.55);display:flex;align-items:center;justify-content:center;z-index:9999;opacity:0;transition:opacity .3s ease;padding:20px;}
  .tam-discount-overlay.open{opacity:1;}
  .tam-discount-modal{position:relative;background:linear-gradient(135deg,#fff 0%,#FFF5F0 100%);max-width:460px;width:100%;border-radius:20px;padding:40px 30px 32px;box-shadow:0 20px 60px rgba(0,0,0,.25);text-align:center;transform:translateY(20px) scale(.96);transition:transform .35s cubic-bezier(.2,.9,.3,1.2);font-family:inherit;}
  .tam-discount-overlay.open .tam-discount-modal{transform:translateY(0) scale(1);}
  .tam-discount-close{position:absolute;top:12px;right:14px;background:none;border:none;font-size:26px;color:#888;cursor:pointer;line-height:1;}
  .tam-discount-close:hover{color:#222;}
  .tam-discount-badge{display:inline-block;background:#FFE566;color:#2D2D2D;font-weight:800;padding:6px 14px;border-radius:30px;font-size:.85rem;letter-spacing:.08em;text-transform:uppercase;margin-bottom:14px;}
  .tam-discount-modal h2{font-size:2.1rem;margin:0 0 10px;color:#2D2D2D;line-height:1.15;}
  .tam-discount-modal h2 span{color:#D48FA6;}
  .tam-discount-modal p{color:#555;font-size:1rem;margin:0 0 22px;line-height:1.5;}
  .tam-discount-code{display:flex;align-items:center;justify-content:space-between;gap:10px;background:#fff;border:2px dashed #D48FA6;border-radius:12px;padding:12px 16px;margin:0 auto 20px;max-width:300px;}
  .tam-discount-code code{font-size:1.3rem;font-weight:800;letter-spacing:.15em;color:#2D2D2D;}
  .tam-discount-copy{background:#D48FA6;color:#fff;border:none;padding:8px 14px;border-radius:8px;font-weight:600;cursor:pointer;font-size:.85rem;}
  .tam-discount-copy:hover{background:#b97891;}
  .tam-discount-cta{display:inline-block;background:#2D2D2D;color:#fff;padding:14px 30px;border-radius:30px;text-decoration:none;font-weight:700;letter-spacing:.05em;transition:background .2s;}
  .tam-discount-cta:hover{background:#D48FA6;}
  .tam-discount-fine{font-size:.75rem;color:#888;margin-top:14px;}
  `;
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var overlay = document.createElement('div');
  overlay.className = 'tam-discount-overlay';
  overlay.innerHTML = `
    <div class="tam-discount-modal" role="dialog" aria-modal="true" aria-labelledby="tamDiscountTitle">
      <button class="tam-discount-close" aria-label="Close">&times;</button>
      <div class="tam-discount-badge">Limited Offer</div>
      <h2 id="tamDiscountTitle">Get <span>20% Off</span><br>Your Custom Figurine</h2>
      <p>Celebrate your love story with a handcrafted keepsake. Use the code below at checkout.</p>
      <div class="tam-discount-code">
        <code>CUSTOM20</code>
        <button type="button" class="tam-discount-copy">Copy</button>
      </div>
      <a href="custom.html" class="tam-discount-cta">Design Mine Now</a>
      <div class="tam-discount-fine">Valid on custom figurines only. One use per customer.</div>
    </div>`;
  document.body.appendChild(overlay);

  function close() {
    overlay.classList.remove('open');
    setTimeout(function () { overlay.remove(); }, 350);
    try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {}
  }

  overlay.querySelector('.tam-discount-close').addEventListener('click', close);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

  var copyBtn = overlay.querySelector('.tam-discount-copy');
  copyBtn.addEventListener('click', function () {
    try {
      navigator.clipboard.writeText('CUSTOM20');
      copyBtn.textContent = 'Copied!';
      setTimeout(function () { copyBtn.textContent = 'Copy'; }, 1800);
    } catch (e) {
      copyBtn.textContent = 'CUSTOM20';
    }
  });

  // Show after a small delay so it feels intentional
  setTimeout(function () { overlay.classList.add('open'); }, 2500);
})();
