-- Run this SQL in your Supabase SQL Editor to create all required tables
-- Go to: https://supabase.com/dashboard → Your Project → SQL Editor → New Query

-- ═══════════════════════════════════════
-- 1. REVIEWS TABLE
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text TEXT NOT NULL,
  avatar TEXT DEFAULT '',
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════
-- 2. ORDERS TABLE
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT DEFAULT 'TAM-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 4),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT DEFAULT '',
  shipping_address TEXT DEFAULT '',
  country_code TEXT DEFAULT 'FR',
  items JSONB DEFAULT '[]',
  subtotal NUMERIC(10,2) DEFAULT 0,
  shipping NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) DEFAULT 0,
  shipping_method TEXT DEFAULT 'standard',
  paypal_order_id TEXT,
  status TEXT DEFAULT 'new',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════
-- 3. CONTACTS TABLE
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════
-- 4. NEWSLETTER TABLE
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS newsletter (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  active BOOLEAN DEFAULT true,
  subscribed_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════
-- 5. ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════
-- Enable RLS on all tables (the service key bypasses RLS,
-- so the API still works, but direct client access is blocked)

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter ENABLE ROW LEVEL SECURITY;

-- Allow public to read approved reviews
CREATE POLICY "Public can read approved reviews"
  ON reviews FOR SELECT
  USING (approved = true);

-- Allow public to insert reviews (for submission)
CREATE POLICY "Public can submit reviews"
  ON reviews FOR INSERT
  WITH CHECK (true);

-- Allow public to insert newsletter subscriptions
CREATE POLICY "Public can subscribe to newsletter"
  ON newsletter FOR INSERT
  WITH CHECK (true);

-- Allow public to insert contacts
CREATE POLICY "Public can submit contact forms"
  ON contacts FOR INSERT
  WITH CHECK (true);

-- Allow public to insert orders
CREATE POLICY "Public can create orders"
  ON orders FOR INSERT
  WITH CHECK (true);
