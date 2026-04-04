// Admin authentication middleware
function requireAdmin(req, res) {
  const authHeader = req.headers['authorization'];
  const adminToken = process.env.ADMIN_TOKEN;

  if (!adminToken) {
    res.status(500).json({ error: 'Admin token not configured on server' });
    return false;
  }

  if (!authHeader || authHeader !== `Bearer ${adminToken}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }

  return true;
}

// Simple rate limiting (in-memory, resets on cold start)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 10; // max 10 reviews per IP per hour

function isRateLimited(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { windowStart: now, count: 1 });
    return false;
  }

  record.count++;
  if (record.count > RATE_LIMIT_MAX) {
    return true;
  }
  return false;
}

// HTML escape to prevent stored XSS
function escapeHTML(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ── Server-side product catalog (source of truth for prices) ──
const PRODUCT_PRICES = {
  // Standard figurines (from store page)
  'classic-couple': 59.99,
  'romantic-couple': 59.99,
  'elegant-couple': 59.99,
  // Custom figurines by size
  'custom-small': 79.99,
  'custom-medium': 99.99,
  'custom-large': 129.99,
  // Extras
  'cake-topper': 10,
  'keepsake': 5,
  'gift-box': 15,
  'express': 25,
  'rush': 50,
  // Fallback for generic items
  'Fully Custom Figurine': 99.99,
  'Classic Couple Figurine': 59.99,
  'Romantic Couple Figurine': 59.99,
  'Elegant Couple Figurine': 59.99
};

const COUNTRY_ZONES = {
  EU: ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','GB','CH','NO','IS','LI','MC','AD','SM','VA'],
  NEIGHBORS: ['RO','GR','TR','MK','AL','RS','ME'],
  ZONE1: ['US','CA'],
  ZONE2: ['RU','UA','BY'],
  ZONE3: ['CN','JP','KR','IN','AU','NZ','SG','MY','TH','VN','ID','PH','TW','HK'],
  ZONE4: ['BR','AR','CL','PE','CO','VE','UY','PY','BO','EC']
};

const SHIPPING_RATES = {
  standard: { EU: 10, NEIGHBORS: 8, ZONE1: 18, ZONE2: 15, ZONE3: 20, ZONE4: 25, OTHER: 20 },
  speedy: { EU: 25, NEIGHBORS: 20, ZONE1: 40, ZONE2: 35, ZONE3: 50, ZONE4: 55, OTHER: 45 }
};

const SHIPPING_THRESHOLD = 120; // Free shipping above this

function getCountryZone(code) {
  for (const [zone, countries] of Object.entries(COUNTRY_ZONES)) {
    if (countries.includes(code)) return zone;
  }
  return 'OTHER';
}

function calculateServerShipping(countryCode, method, subtotal) {
  if (subtotal >= SHIPPING_THRESHOLD) return 0;
  const zone = getCountryZone(countryCode);
  return SHIPPING_RATES[method]?.[zone] || SHIPPING_RATES.standard.OTHER;
}

function lookupPrice(itemName) {
  // Exact match
  if (PRODUCT_PRICES[itemName] !== undefined) return PRODUCT_PRICES[itemName];
  // Case-insensitive partial match
  const lower = itemName.toLowerCase();
  for (const [key, price] of Object.entries(PRODUCT_PRICES)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) return price;
  }
  return null;
}

const handler = async (req, res) => {
  const allowedOrigins = [
    'https://www.toucheartmariage.com',
    'https://toucheartmariage.com',
    'http://localhost:3000'
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const pathname = (req.url || '/').split('?')[0];

  // Public: Get approved reviews
  if (pathname === '/api/reviews' && req.method === 'GET') {
    res.status(200).json({ reviews: [], message: 'Using client-side storage' });
    return;
  }

  // Public: Submit a review (rate-limited, sanitized)
  if (pathname === '/api/reviews' && req.method === 'POST') {
    try {
      const clientIP = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
      if (isRateLimited(clientIP)) {
        res.status(429).json({ error: 'Too many reviews submitted. Please try again later.' });
        return;
      }

      const data = req.body || {};
      if (!data.name || !data.rating || !data.text) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      // Validate rating is a number 1-5
      const rating = parseInt(data.rating);
      if (isNaN(rating) || rating < 1 || rating > 5) {
        res.status(400).json({ error: 'Rating must be between 1 and 5' });
        return;
      }

      // Sanitize text inputs
      const sanitizedName = escapeHTML(data.name.substring(0, 100));
      const sanitizedText = escapeHTML(data.text.substring(0, 2000));

      res.status(201).json({
        message: 'Review saved to local storage',
        review: {
          id: Date.now(),
          name: sanitizedName,
          rating: rating,
          text: sanitizedText,
          date: new Date().toISOString().split('T')[0],
          avatar: sanitizedName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
          approved: false
        }
      });
    } catch (error) {
      res.status(400).json({ error: 'Invalid JSON' });
    }
    return;
  }

  // Admin: Get all reviews (requires auth)
  if (pathname === '/api/reviews/all' && req.method === 'GET') {
    if (!requireAdmin(req, res)) return;
    res.status(200).json({ reviews: [], message: 'Using client-side storage' });
    return;
  }

  // Admin: Approve/reject/delete (requires auth)
  const approveMatch = pathname.match(/^\/api\/reviews\/(\d+)\/approve$/);
  if (approveMatch && req.method === 'POST') {
    if (!requireAdmin(req, res)) return;
    res.status(200).json({ message: 'Review approved' });
    return;
  }

  const rejectMatch = pathname.match(/^\/api\/reviews\/(\d+)\/reject$/);
  if (rejectMatch && req.method === 'POST') {
    if (!requireAdmin(req, res)) return;
    res.status(200).json({ message: 'Review rejected' });
    return;
  }

  const deleteMatch = pathname.match(/^\/api\/reviews\/(\d+)$/);
  if (deleteMatch && req.method === 'DELETE') {
    if (!requireAdmin(req, res)) return;
    res.status(200).json({ message: 'Review deleted' });
    return;
  }

  // Public: Get PayPal client ID from env (not hardcoded in HTML)
  if (pathname === '/api/paypal-config' && req.method === 'GET') {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    if (!clientId) {
      res.status(500).json({ error: 'PayPal not configured' });
      return;
    }
    res.status(200).json({ clientId, env: process.env.PAYPAL_ENV || 'sandbox' });
    return;
  }

  // Public: Validate order totals server-side before PayPal payment
  if (pathname === '/api/validate-order' && req.method === 'POST') {
    try {
      const data = req.body || {};
      const { cart, countryCode, shippingMethod } = data;

      if (!cart || !Array.isArray(cart) || cart.length === 0) {
        res.status(400).json({ error: 'Cart is empty' });
        return;
      }

      // Validate each item price against server catalog
      let subtotal = 0;
      const validatedItems = [];

      for (const item of cart) {
        if (!item.name || !item.quantity || item.quantity < 1) {
          res.status(400).json({ error: `Invalid item: ${item.name || 'unknown'}` });
          return;
        }

        const serverPrice = lookupPrice(item.name);
        if (serverPrice === null) {
          res.status(400).json({ error: `Unknown product: ${item.name}` });
          return;
        }

        // Check if client-submitted price matches server price (allow 0.01 tolerance for rounding)
        if (item.price !== undefined && Math.abs(item.price - serverPrice) > 0.01) {
          res.status(400).json({
            error: `Price mismatch for "${item.name}": expected ${serverPrice}, got ${item.price}`
          });
          return;
        }

        const qty = parseInt(item.quantity);
        subtotal += serverPrice * qty;
        validatedItems.push({
          name: item.name,
          quantity: qty,
          price: serverPrice
        });
      }

      // Calculate server-side shipping
      const method = (shippingMethod === 'speedy') ? 'speedy' : 'standard';
      const shipping = calculateServerShipping(countryCode || 'FR', method, subtotal);
      const total = subtotal + shipping;

      res.status(200).json({
        valid: true,
        items: validatedItems,
        subtotal: parseFloat(subtotal.toFixed(2)),
        shipping: parseFloat(shipping.toFixed(2)),
        total: parseFloat(total.toFixed(2))
      });
    } catch (error) {
      res.status(400).json({ error: 'Invalid request' });
    }
    return;
  }

  res.status(404).json({ error: 'Not found' });
};

// Export handler as default + attach helpers for testing
handler.escapeHTML = escapeHTML;
handler.isRateLimited = isRateLimited;
handler.requireAdmin = requireAdmin;
handler._rateLimitMap = rateLimitMap;
handler.lookupPrice = lookupPrice;
handler.calculateServerShipping = calculateServerShipping;
handler.getCountryZone = getCountryZone;
handler.PRODUCT_PRICES = PRODUCT_PRICES;
handler.SHIPPING_RATES = SHIPPING_RATES;

module.exports = handler;
