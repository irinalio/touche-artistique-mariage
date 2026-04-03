const DB_FILE = '/tmp/database.json';

// Helper to read database
function readDatabase() {
  try {
    const data = require('fs').readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { reviews: [] };
  }
}

// Helper to write database
function writeDatabase(data) {
  try {
    require('fs').writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { pathname, query } = req;

  // GET /api/reviews - Get approved reviews
  if (pathname === '/api/reviews' && req.method === 'GET') {
    const db = readDatabase();
    const approvedReviews = db.reviews.filter(review => review.approved);
    res.status(200).json({ reviews: approvedReviews });
    return;
  }

  // POST /api/reviews - Submit new review
  if (pathname === '/api/reviews' && req.method === 'POST') {
    try {
      const reviewData = req.body;
      if (!reviewData.name || !reviewData.rating || !reviewData.text) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }
      const db = readDatabase();
      const newReview = {
        id: Date.now(),
        name: reviewData.name,
        rating: parseInt(reviewData.rating),
        text: reviewData.text,
        date: new Date().toISOString().split('T')[0],
        photos: reviewData.photos || [],
        avatar: reviewData.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
        approved: false
      };
      db.reviews.push(newReview);
      if (writeDatabase(db)) {
        res.status(201).json({ 
          message: 'Review submitted successfully! It will be visible after approval.',
          review: newReview 
        });
      } else {
        res.status(500).json({ error: 'Failed to save review' });
      }
    } catch (error) {
      res.status(400).json({ error: 'Invalid JSON' });
    }
    return;
  }

  // GET /api/reviews/all - Get all reviews (for admin)
  if (pathname === '/api/reviews/all' && req.method === 'GET') {
    const db = readDatabase();
    res.status(200).json({ reviews: db.reviews });
    return;
  }

  // POST /api/reviews/:id/approve
  const approveMatch = pathname.match(/^\/api\/reviews\/(\d+)\/approve$/);
  if (approveMatch && req.method === 'POST') {
    const id = parseInt(approveMatch[1]);
    const db = readDatabase();
    const review = db.reviews.find(r => r.id === id);
    if (review) {
      review.approved = true;
      writeDatabase(db);
      res.status(200).json({ message: 'Review approved' });
    } else {
      res.status(404).json({ error: 'Review not found' });
    }
    return;
  }

  // POST /api/reviews/:id/reject
  const rejectMatch = pathname.match(/^\/api\/reviews\/(\d+)\/reject$/);
  if (rejectMatch && req.method === 'POST') {
    const id = parseInt(rejectMatch[1]);
    const db = readDatabase();
    const review = db.reviews.find(r => r.id === id);
    if (review) {
      review.approved = false;
      writeDatabase(db);
      res.status(200).json({ message: 'Review unapproved' });
    } else {
      res.status(404).json({ error: 'Review not found' });
    }
    return;
  }

  // DELETE /api/reviews/:id
  const deleteMatch = pathname.match(/^\/api\/reviews\/(\d+)$/);
  if (deleteMatch && req.method === 'DELETE') {
    const id = parseInt(deleteMatch[1]);
    const db = readDatabase();
    const index = db.reviews.findIndex(r => r.id === id);
    if (index !== -1) {
      db.reviews.splice(index, 1);
      writeDatabase(db);
      res.status(200).json({ message: 'Review deleted' });
    } else {
      res.status(404).json({ error: 'Review not found' });
    }
    return;
  }

  res.status(404).json({ error: 'Not found' });
};
