// In-memory store for serverless (ephemeral, resets on cold start)
// For production, use a database like Vercel Postgres, MongoDB, or Supabase
let reviewsStore = [];

function getReviews() {
  return reviewsStore;
}

function addReview(review) {
  reviewsStore.push(review);
  return review;
}

function updateReview(id, updates) {
  const index = reviewsStore.findIndex(r => r.id === id);
  if (index !== -1) {
    reviewsStore[index] = { ...reviewsStore[index], ...updates };
    return reviewsStore[index];
  }
  return null;
}

function deleteReview(id) {
  const index = reviewsStore.findIndex(r => r.id === id);
  if (index !== -1) {
    reviewsStore.splice(index, 1);
    return true;
  }
  return false;
}

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  if (pathname === '/api/reviews' && req.method === 'GET') {
    const approved = getReviews().filter(r => r.approved);
    res.status(200).json({ reviews: approved });
    return;
  }

  if (pathname === '/api/reviews' && req.method === 'POST') {
    try {
      const data = req.body || {};
      if (!data.name || !data.rating || !data.text) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }
      const review = {
        id: Date.now(),
        name: data.name,
        rating: parseInt(data.rating),
        text: data.text,
        date: new Date().toISOString().split('T')[0],
        photos: data.photos || [],
        avatar: data.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
        approved: false
      };
      addReview(review);
      res.status(201).json({ 
        message: 'Review submitted successfully! It will be visible after approval.',
        review 
      });
    } catch (error) {
      res.status(400).json({ error: 'Invalid JSON' });
    }
    return;
  }

  if (pathname === '/api/reviews/all' && req.method === 'GET') {
    res.status(200).json({ reviews: getReviews() });
    return;
  }

  const approveMatch = pathname.match(/^\/api\/reviews\/(\d+)\/approve$/);
  if (approveMatch && req.method === 'POST') {
    const id = parseInt(approveMatch[1]);
    const updated = updateReview(id, { approved: true });
    if (updated) {
      res.status(200).json({ message: 'Review approved' });
    } else {
      res.status(404).json({ error: 'Review not found' });
    }
    return;
  }

  const rejectMatch = pathname.match(/^\/api\/reviews\/(\d+)\/reject$/);
  if (rejectMatch && req.method === 'POST') {
    const id = parseInt(rejectMatch[1]);
    const updated = updateReview(id, { approved: false });
    if (updated) {
      res.status(200).json({ message: 'Review unapproved' });
    } else {
      res.status(404).json({ error: 'Review not found' });
    }
    return;
  }

  const deleteMatch = pathname.match(/^\/api\/reviews\/(\d+)$/);
  if (deleteMatch && req.method === 'DELETE') {
    const id = parseInt(deleteMatch[1]);
    if (deleteReview(id)) {
      res.status(200).json({ message: 'Review deleted' });
    } else {
      res.status(404).json({ error: 'Review not found' });
    }
    return;
  }

  res.status(404).json({ error: 'Not found' });
};
