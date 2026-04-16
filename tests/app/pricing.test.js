import { describe, it, expect } from 'vitest';
import { prices, calculateCustomOrderPrice } from '../../js/pricing-logic.js';

describe('prices object', () => {
  it('has correct base prices for all sizes', () => {
    expect(prices.small).toBe(49);
    expect(prices.medium).toBe(59);
    expect(prices.large).toBe(69);
  });

  it('has correct addon prices', () => {
    expect(prices['cake-topper']).toBe(10);
    expect(prices.keepsake).toBe(5);
    expect(prices['gift-box']).toBe(15);
  });

  it('has correct delivery surcharges', () => {
    expect(prices.express).toBe(25);
    expect(prices.rush).toBe(50);
  });
});

describe('calculateCustomOrderPrice', () => {
  it('returns base price for standard figurine with standard delivery', () => {
    expect(calculateCustomOrderPrice('small', 'figurine', 'standard')).toBe(49);
    expect(calculateCustomOrderPrice('medium', 'figurine', 'standard')).toBe(59);
    expect(calculateCustomOrderPrice('large', 'figurine', 'standard')).toBe(69);
  });

  it('adds no surcharge for figurine product type', () => {
    const price = calculateCustomOrderPrice('small', 'figurine', 'standard');
    expect(price).toBe(49);
  });

  it('adds cake-topper surcharge', () => {
    const price = calculateCustomOrderPrice('small', 'cake-topper', 'standard');
    expect(price).toBe(49 + 10);
  });

  it('adds keepsake surcharge', () => {
    const price = calculateCustomOrderPrice('medium', 'keepsake', 'standard');
    expect(price).toBe(59 + 5);
  });

  it('adds gift-box surcharge', () => {
    const price = calculateCustomOrderPrice('large', 'gift-box', 'standard');
    expect(price).toBe(69 + 15);
  });

  it('adds express delivery surcharge', () => {
    const price = calculateCustomOrderPrice('small', 'figurine', 'express');
    expect(price).toBe(49 + 25);
  });

  it('adds rush delivery surcharge', () => {
    const price = calculateCustomOrderPrice('small', 'figurine', 'rush');
    expect(price).toBe(49 + 50);
  });

  it('combines product and delivery surcharges', () => {
    const price = calculateCustomOrderPrice('medium', 'cake-topper', 'rush');
    expect(price).toBe(59 + 10 + 50);
  });

  it('handles missing/undefined values gracefully', () => {
    expect(calculateCustomOrderPrice('small', undefined, undefined)).toBe(49);
    expect(calculateCustomOrderPrice('small', null, null)).toBe(49);
  });
});
