/**
 * Pure cart logic functions — no DOM or localStorage dependencies.
 * Used by tests and optionally by app.js.
 */

function addItemToCart(cart, product) {
  const existing = cart.find(item => item.id === product.id);
  if (existing) {
    return cart.map(item =>
      item.id === product.id
        ? { ...item, quantity: item.quantity + 1 }
        : item
    );
  }
  return [...cart, { ...product, quantity: 1 }];
}

function removeItemFromCart(cart, productId) {
  return cart.filter(item => item.id !== productId);
}

function updateItemQuantity(cart, productId, change) {
  const updated = cart.map(item =>
    item.id === productId
      ? { ...item, quantity: item.quantity + change }
      : item
  );
  return updated.filter(item => item.quantity > 0);
}

function calculateCartTotal(cart) {
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function calculateCartItemCount(cart) {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

if (typeof module !== 'undefined') {
  module.exports = {
    addItemToCart,
    removeItemFromCart,
    updateItemQuantity,
    calculateCartTotal,
    calculateCartItemCount,
  };
}
