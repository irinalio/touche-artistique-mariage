const { getSupabase } = require('./supabase');

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
  'classic-couple': 19,
  'romantic-couple': 19,
  'elegant-couple': 19,
  // Custom figurines by size
  'custom-small': 49,
  'custom-medium': 59,
  'custom-large': 69,
  // Extras
  'cake-topper': 10,
  'keepsake': 5,
  'gift-box': 15,
  'express': 25,
  'rush': 50,
  // Fallback for generic items
  'Fully Custom Figurine': 59,
  'Classic Couple Figurine': 19,
  'Romantic Couple Figurine': 19,
  'Elegant Couple Figurine': 19
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

// ── Discount codes (source of truth for promo validation) ──
// type: 'custom-percent' applies only to custom figurines; 'percent' applies to subtotal
const DISCOUNT_CODES = {
  CUSTOM20:    { type: 'custom-percent', amount: 20, description: '20% off custom figurines' },
  WEDDING20:   { type: 'custom-percent', amount: 20, description: '20% off custom figurines' },
  LOVESTORY20: { type: 'custom-percent', amount: 20, description: '20% off custom figurines' }
};

function isCustomItem(name) {
  if (!name) return false;
  const n = name.toLowerCase();
  return n.includes('custom');
}

function calculateDiscount(code, items) {
  if (!code) return { amount: 0, code: null, description: null };
  const def = DISCOUNT_CODES[String(code).toUpperCase().trim()];
  if (!def) return { amount: 0, code: null, description: null, error: 'Invalid discount code' };

  let base = 0;
  if (def.type === 'custom-percent') {
    for (const it of items) {
      if (isCustomItem(it.name)) base += it.price * it.quantity;
    }
    if (base <= 0) {
      return { amount: 0, code: null, description: null, error: 'Code valid only on custom figurines' };
    }
  } else if (def.type === 'percent') {
    base = items.reduce((s, it) => s + it.price * it.quantity, 0);
  }
  const amount = parseFloat(((base * def.amount) / 100).toFixed(2));
  return { amount, code: String(code).toUpperCase().trim(), description: def.description };
}

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const pathname = (req.url || '/').split('?')[0];

  // Public: Get approved reviews
  if (pathname === '/api/reviews' && req.method === 'GET') {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('approved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.status(200).json({ reviews: data || [] });
    } catch (error) {
      res.status(500).json({ error: 'Database error' });
    }
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

      const supabase = getSupabase();
      const reviewRow = {
        name: sanitizedName,
        rating: rating,
        text: sanitizedText,
        avatar: sanitizedName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
        approved: false
      };

      const { data: inserted, error } = await supabase
        .from('reviews')
        .insert(reviewRow)
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({
        message: 'Review submitted for approval',
        review: inserted
      });
    } catch (error) {
      if (error.message === 'Missing required fields' || error.message === 'Rating must be between 1 and 5') {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Database error' });
      }
    }
    return;
  }

  // Admin: Get all reviews (requires auth)
  if (pathname === '/api/reviews/all' && req.method === 'GET') {
    if (!requireAdmin(req, res)) return;
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.status(200).json({ reviews: data || [] });
    } catch (error) {
      res.status(500).json({ error: 'Database error' });
    }
    return;
  }

  // Admin: Approve review (requires auth)
  const approveMatch = pathname.match(/^\/api\/reviews\/([a-f0-9-]+)\/approve$/);
  if (approveMatch && req.method === 'POST') {
    if (!requireAdmin(req, res)) return;
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('reviews')
        .update({ approved: true })
        .eq('id', approveMatch[1])
        .select()
        .single();

      if (error) throw error;
      res.status(200).json({ message: 'Review approved', review: data });
    } catch (error) {
      res.status(500).json({ error: 'Database error' });
    }
    return;
  }

  // Admin: Reject review (requires auth)
  const rejectMatch = pathname.match(/^\/api\/reviews\/([a-f0-9-]+)\/reject$/);
  if (rejectMatch && req.method === 'POST') {
    if (!requireAdmin(req, res)) return;
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('reviews')
        .update({ approved: false })
        .eq('id', rejectMatch[1])
        .select()
        .single();

      if (error) throw error;
      res.status(200).json({ message: 'Review rejected', review: data });
    } catch (error) {
      res.status(500).json({ error: 'Database error' });
    }
    return;
  }

  // Admin: Delete review (requires auth)
  const deleteMatch = pathname.match(/^\/api\/reviews\/([a-f0-9-]+)$/);
  if (deleteMatch && req.method === 'DELETE') {
    if (!requireAdmin(req, res)) return;
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', deleteMatch[1]);

      if (error) throw error;
      res.status(200).json({ message: 'Review deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Database error' });
    }
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
      const { cart, countryCode, shippingMethod, promoCode } = data;

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

      const discount = calculateDiscount(promoCode, validatedItems);
      if (promoCode && discount.error) {
        res.status(400).json({ error: discount.error });
        return;
      }
      const discountedSubtotal = Math.max(0, subtotal - discount.amount);
      const total = discountedSubtotal + shipping;

      res.status(200).json({
        valid: true,
        items: validatedItems,
        subtotal: parseFloat(subtotal.toFixed(2)),
        discount: parseFloat(discount.amount.toFixed(2)),
        discountCode: discount.code,
        discountDescription: discount.description,
        shipping: parseFloat(shipping.toFixed(2)),
        total: parseFloat(total.toFixed(2))
      });
    } catch (error) {
      res.status(400).json({ error: 'Invalid request' });
    }
    return;
  }

  // Public: Validate a discount code against the current cart
  if (pathname === '/api/validate-discount' && req.method === 'POST') {
    try {
      const data = req.body || {};
      const { cart, promoCode } = data;
      if (!promoCode) {
        res.status(400).json({ error: 'Discount code is required' });
        return;
      }
      if (!cart || !Array.isArray(cart) || cart.length === 0) {
        res.status(400).json({ error: 'Cart is empty' });
        return;
      }
      const items = [];
      for (const item of cart) {
        const serverPrice = lookupPrice(item.name);
        if (serverPrice === null) continue;
        items.push({ name: item.name, quantity: parseInt(item.quantity) || 1, price: serverPrice });
      }
      const discount = calculateDiscount(promoCode, items);
      if (discount.error) {
        res.status(400).json({ error: discount.error });
        return;
      }
      res.status(200).json({
        valid: true,
        code: discount.code,
        description: discount.description,
        amount: discount.amount
      });
    } catch (e) {
      res.status(400).json({ error: 'Invalid request' });
    }
    return;
  }

  // Public: Newsletter subscription
  if (pathname === '/api/newsletter' && req.method === 'POST') {
    try {
      const data = req.body || {};
      const email = data.email;
      if (!email || !email.includes('@')) {
        res.status(400).json({ error: 'Valid email is required' });
        return;
      }

      const supabase = getSupabase();
      const { error } = await supabase
        .from('newsletter')
        .upsert(
          { email: email, active: true },
          { onConflict: 'email' }
        );

      if (error) throw error;
      res.status(201).json({ message: 'Subscribed successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Database error' });
    }
    return;
  }

  // Public: Contact form submission
  if (pathname === '/api/contact' && req.method === 'POST') {
    try {
      const data = req.body || {};
      const { name, email, subject, message } = data;
      if (!name || !email || !subject || !message) {
        res.status(400).json({ error: 'All fields are required' });
        return;
      }
      // Sanitize inputs
      const sanitized = {
        name: escapeHTML(name.substring(0, 100)),
        email: escapeHTML(email.substring(0, 200)),
        subject: escapeHTML(subject.substring(0, 200)),
        message: escapeHTML(message.substring(0, 5000))
      };

      const supabase = getSupabase();
      const { error } = await supabase
        .from('contacts')
        .insert(sanitized);

      if (error) throw error;
      res.status(201).json({ message: 'Message sent successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Database error' });
    }
    return;
  }

  // Public: Create order after PayPal payment
  if (pathname === '/api/orders' && req.method === 'POST') {
    try {
      const data = req.body || {};
      const { customerName, customerEmail, shippingAddress, countryCode, items } = data;

      if (!customerName || !customerEmail || !shippingAddress || !countryCode || !items || !Array.isArray(items) || items.length === 0) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      // Server-side price validation
      let subtotal = 0;
      const validatedItems = [];

      for (const item of items) {
        if (!item.name || !item.quantity || item.quantity < 1) {
          res.status(400).json({ error: `Invalid item: ${item.name || 'unknown'}` });
          return;
        }

        const serverPrice = lookupPrice(item.name);
        if (serverPrice === null) {
          res.status(400).json({ error: `Unknown product: ${item.name}` });
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

      const shippingMethod = data.shippingMethod === 'speedy' ? 'speedy' : 'standard';
      const shipping = calculateServerShipping(countryCode, shippingMethod, subtotal);

      const discount = calculateDiscount(data.promoCode, validatedItems);
      if (data.promoCode && discount.error) {
        res.status(400).json({ error: discount.error });
        return;
      }
      const total = Math.max(0, subtotal - discount.amount) + shipping;

      const supabase = getSupabase();
      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          customer_name: escapeHTML(customerName.substring(0, 200)),
          customer_email: escapeHTML(customerEmail.substring(0, 200)),
          customer_phone: data.customerPhone ? escapeHTML(data.customerPhone.substring(0, 50)) : '',
          shipping_address: escapeHTML(shippingAddress.substring(0, 1000)),
          country_code: countryCode.substring(0, 2),
          items: validatedItems,
          subtotal: parseFloat(subtotal.toFixed(2)),
          discount: parseFloat((discount.amount || 0).toFixed(2)),
          discount_code: discount.code || null,
          shipping: parseFloat(shipping.toFixed(2)),
          total: parseFloat(total.toFixed(2)),
          shipping_method: shippingMethod,
          paypal_order_id: data.paypalOrderId || null,
          status: 'new'
        })
        .select()
        .single();

      if (error) throw error;
      res.status(201).json({ message: 'Order created', order });
    } catch (error) {
      res.status(500).json({ error: 'Database error' });
    }
    return;
  }

  // ── Admin endpoints ──

  // Admin: Dashboard stats
  if (pathname === '/api/admin/stats' && req.method === 'GET') {
    if (!requireAdmin(req, res)) return;
    try {
      const supabase = getSupabase();

      const [ordersRes, reviewsRes, contactsRes, subscribersRes] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact', head: true }),
        supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('approved', false),
        supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('read', false),
        supabase.from('newsletter').select('id', { count: 'exact', head: true }).eq('active', true)
      ]);

      if (ordersRes.error) throw ordersRes.error;
      if (reviewsRes.error) throw reviewsRes.error;
      if (contactsRes.error) throw contactsRes.error;
      if (subscribersRes.error) throw subscribersRes.error;

      res.status(200).json({
        orders: ordersRes.count || 0,
        pendingReviews: reviewsRes.count || 0,
        unreadMessages: contactsRes.count || 0,
        subscribers: subscribersRes.count || 0
      });
    } catch (error) {
      res.status(500).json({ error: 'Database error' });
    }
    return;
  }

  // Admin: List all orders
  if (pathname === '/api/orders' && req.method === 'GET') {
    if (!requireAdmin(req, res)) return;
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.status(200).json({ orders: data || [] });
    } catch (error) {
      res.status(500).json({ error: 'Database error' });
    }
    return;
  }

  // Admin: Update order status/notes
  const orderPatchMatch = pathname.match(/^\/api\/orders\/([a-f0-9-]+)$/);
  if (orderPatchMatch && req.method === 'PATCH') {
    if (!requireAdmin(req, res)) return;
    try {
      const data = req.body || {};
      const updates = {};
      if (data.status !== undefined) updates.status = data.status;
      if (data.notes !== undefined) updates.notes = data.notes;

      if (Object.keys(updates).length === 0) {
        res.status(400).json({ error: 'No fields to update' });
        return;
      }

      const supabase = getSupabase();
      const { data: order, error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderPatchMatch[1])
        .select()
        .single();

      if (error) throw error;
      res.status(200).json({ message: 'Order updated', order });
    } catch (error) {
      res.status(500).json({ error: 'Database error' });
    }
    return;
  }

  // Admin: List all contacts
  if (pathname === '/api/contacts' && req.method === 'GET') {
    if (!requireAdmin(req, res)) return;
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.status(200).json({ contacts: data || [] });
    } catch (error) {
      res.status(500).json({ error: 'Database error' });
    }
    return;
  }

  // Admin: Update contact read status
  const contactReadMatch = pathname.match(/^\/api\/contacts\/([a-f0-9-]+)\/read$/);
  if (contactReadMatch && req.method === 'PATCH') {
    if (!requireAdmin(req, res)) return;
    try {
      const body = req.body || {};
      const supabase = getSupabase();
      const { data: updated, error } = await supabase
        .from('contacts')
        .update({ read: !!body.read })
        .eq('id', contactReadMatch[1])
        .select()
        .single();

      if (error) throw error;
      res.status(200).json({ message: 'Contact updated', contact: updated });
    } catch (error) {
      res.status(500).json({ error: 'Database error' });
    }
    return;
  }

  // Admin: List active subscribers
  if (pathname === '/api/newsletter' && req.method === 'GET') {
    if (!requireAdmin(req, res)) return;
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('newsletter')
        .select('*')
        .eq('active', true)
        .order('subscribed_at', { ascending: false });

      if (error) throw error;
      res.status(200).json({ subscribers: data || [] });
    } catch (error) {
      res.status(500).json({ error: 'Database error' });
    }
    return;
  }

  // Admin: Soft-delete subscriber
  const newsletterDeleteMatch = pathname.match(/^\/api\/newsletter\/([a-f0-9-]+)$/);
  if (newsletterDeleteMatch && req.method === 'DELETE') {
    if (!requireAdmin(req, res)) return;
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('newsletter')
        .update({ active: false })
        .eq('id', newsletterDeleteMatch[1]);

      if (error) throw error;
      res.status(200).json({ message: 'Subscriber removed' });
    } catch (error) {
      res.status(500).json({ error: 'Database error' });
    }
    return;
  }

  // Admin: Export subscribers as CSV
  if (pathname === '/api/newsletter/export' && req.method === 'GET') {
    // Support auth via query param for direct download links
    const urlObj = new URL(req.url, 'http://localhost');
    const queryToken = urlObj.searchParams.get('token');
    if (queryToken) {
      req.headers['authorization'] = 'Bearer ' + queryToken;
    }
    if (!requireAdmin(req, res)) return;
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('newsletter')
        .select('*')
        .eq('active', true)
        .order('subscribed_at', { ascending: false });

      if (error) throw error;

      const rows = (data || []);
      let csv = 'email,subscribed_at\n';
      for (const row of rows) {
        csv += `${row.email},${row.subscribed_at}\n`;
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="subscribers.csv"');
      res.status(200).send(csv);
    } catch (error) {
      res.status(500).json({ error: 'Database error' });
    }
    return;
  }

  // ── Figurine configurator orders ──────────────────────────────

  // Public: Submit a figurine order (colours + contact details)
  if (pathname === '/api/figurine-order' && req.method === 'POST') {
    try {
      const data = req.body || {};
      const { name, email, phone, notes, colors } = data;

      if (!name || !email) {
        res.status(400).json({ error: 'Name and email are required' });
        return;
      }

      const supabase = getSupabase();
      const { data: order, error } = await supabase
        .from('figurine_orders')
        .insert({
          name: escapeHTML(name.substring(0, 200)),
          email: escapeHTML(email.substring(0, 200)),
          phone: phone ? escapeHTML(phone.substring(0, 50)) : '',
          notes: notes ? escapeHTML(notes.substring(0, 2000)) : '',
          colors: colors || {}
        })
        .select()
        .single();

      if (error) throw error;
      res.status(201).json({ message: 'Order received', id: order.id });
    } catch (err) {
      console.error('Figurine order error:', err);
      res.status(500).json({ error: 'Failed to save order' });
    }
    return;
  }

  // Admin: List figurine orders
  if (pathname === '/api/figurine-orders' && req.method === 'GET') {
    if (!requireAdmin(req, res)) return;
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('figurine_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.status(200).json({ orders: data || [] });
    } catch (err) {
      res.status(500).json({ error: 'Database error' });
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
handler.DISCOUNT_CODES = DISCOUNT_CODES;
handler.calculateDiscount = calculateDiscount;
handler.SHIPPING_RATES = SHIPPING_RATES;

module.exports = handler;
