import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import handler from '../../api/index.js';

const { escapeHTML, isRateLimited, _rateLimitMap, lookupPrice, calculateServerShipping, getCountryZone } = handler;

// Helper to create mock req/res
function createMocks({ method = 'GET', url = '/', headers = {}, body = null } = {}) {
  const req = { method, url, headers, body };
  const res = {
    _status: null,
    _body: null,
    _headers: {},
    _ended: false,
    status(code) { this._status = code; return this; },
    json(data) { this._body = data; return this; },
    end() { this._ended = true; return this; },
    setHeader(key, value) { this._headers[key] = value; },
  };
  return { req, res };
}

// ── escapeHTML ──
describe('escapeHTML', () => {
  it('escapes ampersands', () => {
    expect(escapeHTML('A & B')).toBe('A &amp; B');
  });

  it('escapes angle brackets', () => {
    expect(escapeHTML('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  it('escapes single quotes', () => {
    expect(escapeHTML("it's")).toBe("it&#039;s");
  });

  it('passes through non-strings unchanged', () => {
    expect(escapeHTML(42)).toBe(42);
    expect(escapeHTML(null)).toBe(null);
  });

  it('handles empty string', () => {
    expect(escapeHTML('')).toBe('');
  });

  it('returns clean strings unchanged', () => {
    expect(escapeHTML('hello world')).toBe('hello world');
  });
});

// ── isRateLimited ──
describe('isRateLimited', () => {
  beforeEach(() => {
    _rateLimitMap.clear();
  });

  it('allows the first request from an IP', () => {
    expect(isRateLimited('1.2.3.4')).toBe(false);
  });

  it('allows up to 10 requests from an IP', () => {
    for (let i = 0; i < 10; i++) {
      expect(isRateLimited('1.2.3.4')).toBe(false);
    }
  });

  it('blocks the 11th request from an IP', () => {
    for (let i = 0; i < 10; i++) {
      isRateLimited('1.2.3.4');
    }
    expect(isRateLimited('1.2.3.4')).toBe(true);
  });

  it('tracks IPs independently', () => {
    for (let i = 0; i < 10; i++) {
      isRateLimited('1.1.1.1');
    }
    expect(isRateLimited('1.1.1.1')).toBe(true);
    expect(isRateLimited('2.2.2.2')).toBe(false);
  });
});

// ── lookupPrice ──
describe('lookupPrice', () => {
  it('returns exact match price', () => {
    expect(lookupPrice('classic-couple')).toBe(59.99);
  });

  it('returns null for unknown products', () => {
    expect(lookupPrice('nonexistent-thing')).toBe(null);
  });

  it('matches case-insensitively', () => {
    expect(lookupPrice('Classic Couple Figurine')).toBe(59.99);
  });
});

// ── getCountryZone & calculateServerShipping ──
describe('shipping', () => {
  it('identifies EU country zone', () => {
    expect(getCountryZone('FR')).toBe('EU');
    expect(getCountryZone('DE')).toBe('EU');
  });

  it('identifies ZONE1 countries', () => {
    expect(getCountryZone('US')).toBe('ZONE1');
  });

  it('returns OTHER for unknown countries', () => {
    expect(getCountryZone('XX')).toBe('OTHER');
  });

  it('returns 0 shipping above threshold', () => {
    expect(calculateServerShipping('FR', 'standard', 120)).toBe(0);
    expect(calculateServerShipping('FR', 'standard', 200)).toBe(0);
  });

  it('calculates EU standard shipping', () => {
    expect(calculateServerShipping('FR', 'standard', 50)).toBe(10);
  });

  it('calculates speedy shipping', () => {
    expect(calculateServerShipping('FR', 'speedy', 50)).toBe(25);
  });
});

// ── API Handler ──
describe('API handler', () => {
  beforeEach(() => {
    _rateLimitMap.clear();
  });

  // CORS
  it('sets CORS headers for allowed origins', async () => {
    const { req, res } = createMocks({
      url: '/api/reviews',
      headers: { origin: 'https://www.toucheartmariage.com' },
    });
    await handler(req, res);
    expect(res._headers['Access-Control-Allow-Origin']).toBe('https://www.toucheartmariage.com');
  });

  it('does not set CORS header for disallowed origins', async () => {
    const { req, res } = createMocks({
      url: '/api/reviews',
      headers: { origin: 'https://evil.com' },
    });
    await handler(req, res);
    expect(res._headers['Access-Control-Allow-Origin']).toBeUndefined();
  });

  // OPTIONS preflight
  it('returns 200 for OPTIONS preflight', async () => {
    const { req, res } = createMocks({ method: 'OPTIONS', url: '/api/reviews' });
    await handler(req, res);
    expect(res._status).toBe(200);
    expect(res._ended).toBe(true);
  });

  // GET /api/reviews
  it('returns reviews on GET /api/reviews', async () => {
    const { req, res } = createMocks({ url: '/api/reviews' });
    await handler(req, res);
    expect(res._status).toBe(200);
    expect(res._body).toHaveProperty('reviews');
  });

  // POST /api/reviews — validation
  it('returns 400 when required fields are missing', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      url: '/api/reviews',
      body: { name: 'Test' },
    });
    await handler(req, res);
    expect(res._status).toBe(400);
    expect(res._body.error).toBe('Missing required fields');
  });

  it('returns 400 for invalid rating', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      url: '/api/reviews',
      body: { name: 'Test', rating: 6, text: 'Great' },
    });
    await handler(req, res);
    expect(res._status).toBe(400);
    expect(res._body.error).toBe('Rating must be between 1 and 5');
  });

  it('creates review with sanitized data', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      url: '/api/reviews',
      body: { name: '<b>Alice</b>', rating: 5, text: 'Great <script>xss</script>' },
    });
    await handler(req, res);
    expect(res._status).toBe(201);
    expect(res._body.review.name).toBe('&lt;b&gt;Alice&lt;/b&gt;');
    expect(res._body.review.text).toContain('&lt;script&gt;');
    expect(res._body.review.rating).toBe(5);
    expect(res._body.review.avatar).toBe('&L');
  });

  it('generates correct avatar initials', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      url: '/api/reviews',
      body: { name: 'Jane Doe', rating: 4, text: 'Nice' },
    });
    await handler(req, res);
    expect(res._body.review.avatar).toBe('JD');
  });

  // Rate limiting
  it('returns 429 after too many reviews from same IP', async () => {
    for (let i = 0; i < 10; i++) {
      const { req, res } = createMocks({
        method: 'POST',
        url: '/api/reviews',
        headers: { 'x-forwarded-for': '5.5.5.5' },
        body: { name: 'Test', rating: 3, text: 'ok' },
      });
      await handler(req, res);
    }
    const { req, res } = createMocks({
      method: 'POST',
      url: '/api/reviews',
      headers: { 'x-forwarded-for': '5.5.5.5' },
      body: { name: 'Test', rating: 3, text: 'ok' },
    });
    await handler(req, res);
    expect(res._status).toBe(429);
  });

  // Admin auth
  describe('admin routes', () => {
    let savedToken;

    beforeEach(() => {
      savedToken = process.env.ADMIN_TOKEN;
      process.env.ADMIN_TOKEN = 'test-secret';
    });

    afterEach(() => {
      if (savedToken !== undefined) {
        process.env.ADMIN_TOKEN = savedToken;
      } else {
        delete process.env.ADMIN_TOKEN;
      }
    });

    it('returns 401 without auth header', async () => {
      const { req, res } = createMocks({ url: '/api/reviews/all', headers: {} });
      await handler(req, res);
      expect(res._status).toBe(401);
    });

    it('returns 401 with wrong token', async () => {
      const { req, res } = createMocks({
        url: '/api/reviews/all',
        headers: { authorization: 'Bearer wrong-token' },
      });
      await handler(req, res);
      expect(res._status).toBe(401);
    });

    it('returns 200 with correct token', async () => {
      const { req, res } = createMocks({
        url: '/api/reviews/all',
        headers: { authorization: 'Bearer test-secret' },
      });
      await handler(req, res);
      expect(res._status).toBe(200);
    });

    it('returns 500 if ADMIN_TOKEN is not set', async () => {
      delete process.env.ADMIN_TOKEN;
      const { req, res } = createMocks({
        url: '/api/reviews/all',
        headers: { authorization: 'Bearer anything' },
      });
      await handler(req, res);
      expect(res._status).toBe(500);
    });

    it('approves review with valid admin token', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        url: '/api/reviews/12345/approve',
        headers: { authorization: 'Bearer test-secret' },
      });
      await handler(req, res);
      expect(res._status).toBe(200);
      expect(res._body.message).toBe('Review approved');
    });

    it('rejects review with valid admin token', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        url: '/api/reviews/12345/reject',
        headers: { authorization: 'Bearer test-secret' },
      });
      await handler(req, res);
      expect(res._status).toBe(200);
      expect(res._body.message).toBe('Review rejected');
    });

    it('deletes review with valid admin token', async () => {
      const { req, res } = createMocks({
        method: 'DELETE',
        url: '/api/reviews/12345',
        headers: { authorization: 'Bearer test-secret' },
      });
      await handler(req, res);
      expect(res._status).toBe(200);
      expect(res._body.message).toBe('Review deleted');
    });
  });

  // Validate order
  describe('POST /api/validate-order', () => {
    it('returns 400 for empty cart', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        url: '/api/validate-order',
        body: { cart: [] },
      });
      await handler(req, res);
      expect(res._status).toBe(400);
    });

    it('validates a correct order', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        url: '/api/validate-order',
        body: {
          cart: [{ name: 'classic-couple', quantity: 1, price: 59.99 }],
          countryCode: 'FR',
          shippingMethod: 'standard',
        },
      });
      await handler(req, res);
      expect(res._status).toBe(200);
      expect(res._body.valid).toBe(true);
      expect(res._body.subtotal).toBe(59.99);
      expect(res._body.shipping).toBe(10);
    });

    it('rejects price mismatch', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        url: '/api/validate-order',
        body: {
          cart: [{ name: 'classic-couple', quantity: 1, price: 1.00 }],
          countryCode: 'FR',
          shippingMethod: 'standard',
        },
      });
      await handler(req, res);
      expect(res._status).toBe(400);
      expect(res._body.error).toContain('Price mismatch');
    });
  });

  // PayPal config
  describe('GET /api/paypal-config', () => {
    let savedClientId;
    let savedEnv;

    beforeEach(() => {
      savedClientId = process.env.PAYPAL_CLIENT_ID;
      savedEnv = process.env.PAYPAL_ENV;
    });

    afterEach(() => {
      if (savedClientId !== undefined) process.env.PAYPAL_CLIENT_ID = savedClientId;
      else delete process.env.PAYPAL_CLIENT_ID;
      if (savedEnv !== undefined) process.env.PAYPAL_ENV = savedEnv;
      else delete process.env.PAYPAL_ENV;
    });

    it('returns 500 if PAYPAL_CLIENT_ID not set', async () => {
      delete process.env.PAYPAL_CLIENT_ID;
      const { req, res } = createMocks({ url: '/api/paypal-config' });
      await handler(req, res);
      expect(res._status).toBe(500);
    });

    it('returns client ID and env when configured', async () => {
      process.env.PAYPAL_CLIENT_ID = 'test-id';
      process.env.PAYPAL_ENV = 'sandbox';
      const { req, res } = createMocks({ url: '/api/paypal-config' });
      await handler(req, res);
      expect(res._status).toBe(200);
      expect(res._body.clientId).toBe('test-id');
      expect(res._body.env).toBe('sandbox');
    });
  });

  // 404
  it('returns 404 for unknown routes', async () => {
    const { req, res } = createMocks({ url: '/api/unknown' });
    await handler(req, res);
    expect(res._status).toBe(404);
  });
});
