import { describe, it, expect } from 'vitest';
import {
  addItemToCart,
  removeItemFromCart,
  updateItemQuantity,
  calculateCartTotal,
  calculateCartItemCount,
} from '../../js/cart-logic.js';

describe('addItemToCart', () => {
  it('adds a new item to an empty cart', () => {
    const cart = addItemToCart([], { id: 1, name: 'Figurine', price: 59.99 });
    expect(cart).toHaveLength(1);
    expect(cart[0]).toEqual({ id: 1, name: 'Figurine', price: 59.99, quantity: 1 });
  });

  it('increments quantity for an existing item', () => {
    const initial = [{ id: 1, name: 'Figurine', price: 59.99, quantity: 1 }];
    const cart = addItemToCart(initial, { id: 1, name: 'Figurine', price: 59.99 });
    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(2);
  });

  it('adds a different item alongside existing ones', () => {
    const initial = [{ id: 1, name: 'Figurine', price: 59.99, quantity: 1 }];
    const cart = addItemToCart(initial, { id: 2, name: 'Cake Topper', price: 10 });
    expect(cart).toHaveLength(2);
  });

  it('does not mutate the original cart', () => {
    const initial = [{ id: 1, name: 'Figurine', price: 59.99, quantity: 1 }];
    addItemToCart(initial, { id: 2, name: 'Topper', price: 10 });
    expect(initial).toHaveLength(1);
  });
});

describe('removeItemFromCart', () => {
  it('removes an item by id', () => {
    const initial = [
      { id: 1, name: 'A', price: 10, quantity: 1 },
      { id: 2, name: 'B', price: 20, quantity: 1 },
    ];
    const cart = removeItemFromCart(initial, 1);
    expect(cart).toHaveLength(1);
    expect(cart[0].id).toBe(2);
  });

  it('returns empty array when removing the only item', () => {
    const cart = removeItemFromCart([{ id: 1, name: 'A', price: 10, quantity: 1 }], 1);
    expect(cart).toHaveLength(0);
  });

  it('returns unchanged cart when id not found', () => {
    const initial = [{ id: 1, name: 'A', price: 10, quantity: 1 }];
    const cart = removeItemFromCart(initial, 999);
    expect(cart).toHaveLength(1);
  });
});

describe('updateItemQuantity', () => {
  it('increments quantity by 1', () => {
    const initial = [{ id: 1, name: 'A', price: 10, quantity: 2 }];
    const cart = updateItemQuantity(initial, 1, 1);
    expect(cart[0].quantity).toBe(3);
  });

  it('decrements quantity by 1', () => {
    const initial = [{ id: 1, name: 'A', price: 10, quantity: 3 }];
    const cart = updateItemQuantity(initial, 1, -1);
    expect(cart[0].quantity).toBe(2);
  });

  it('removes item when quantity reaches 0', () => {
    const initial = [{ id: 1, name: 'A', price: 10, quantity: 1 }];
    const cart = updateItemQuantity(initial, 1, -1);
    expect(cart).toHaveLength(0);
  });

  it('removes item when quantity goes negative', () => {
    const initial = [{ id: 1, name: 'A', price: 10, quantity: 1 }];
    const cart = updateItemQuantity(initial, 1, -5);
    expect(cart).toHaveLength(0);
  });
});

describe('calculateCartTotal', () => {
  it('returns 0 for empty cart', () => {
    expect(calculateCartTotal([])).toBe(0);
  });

  it('calculates total for single item', () => {
    expect(calculateCartTotal([{ price: 59.99, quantity: 2 }])).toBeCloseTo(119.98);
  });

  it('calculates total for multiple items', () => {
    const cart = [
      { price: 59.99, quantity: 1 },
      { price: 10, quantity: 3 },
    ];
    expect(calculateCartTotal(cart)).toBeCloseTo(89.99);
  });
});

describe('calculateCartItemCount', () => {
  it('returns 0 for empty cart', () => {
    expect(calculateCartItemCount([])).toBe(0);
  });

  it('sums quantities across items', () => {
    const cart = [
      { quantity: 2 },
      { quantity: 3 },
    ];
    expect(calculateCartItemCount(cart)).toBe(5);
  });
});
