/**
 * Pure pricing logic — no DOM dependencies.
 * Used by tests and optionally by app.js.
 */

const prices = {
  small: 79.99,
  medium: 99.99,
  large: 129.99,
  'cake-topper': 10,
  keepsake: 5,
  'gift-box': 15,
  express: 25,
  rush: 50,
};

function calculateCustomOrderPrice(size, productType, delivery) {
  let total = prices[size] || 0;

  if (productType && productType !== 'figurine') {
    total += prices[productType] || 0;
  }

  if (delivery && delivery !== 'standard') {
    total += prices[delivery] || 0;
  }

  return total;
}

if (typeof module !== 'undefined') {
  module.exports = {
    prices,
    calculateCustomOrderPrice,
  };
}
