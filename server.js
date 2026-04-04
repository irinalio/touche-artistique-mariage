const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;
const DB_FILE = path.join(__dirname, 'database.json');

// Load environment variables from .env file
function loadEnv() {
  try {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split('\n').forEach(line => {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) {
          process.env[match[1].trim()] = match[2].trim();
        }
      });
    }
  } catch (error) {
    console.error('Error loading .env file:', error);
  }
}

loadEnv();

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_ENV = process.env.PAYPAL_ENV || 'sandbox';

// Helper function to read database
function readDatabase() {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database:', error);
    return { reviews: [] };
  }
}

// Helper function to write database
function writeDatabase(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing database:', error);
    return false;
  }
}

// Helper function to serve static files
function serveFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('File not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  // Enable CORS (restricted to known origins)
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
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // API Routes
  if (pathname === '/api/reviews') {
    if (req.method === 'GET') {
      const db = readDatabase();
      const approvedReviews = db.reviews.filter(review => review.approved);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ reviews: approvedReviews }));
      return;
    }
    
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => {
        try {
          const reviewData = JSON.parse(body);
          if (!reviewData.name || !reviewData.rating || !reviewData.text) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing required fields' }));
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
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              message: 'Review submitted successfully! It will be visible after approval.',
              review: newReview 
            }));
          } else {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to save review' }));
          }
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
      return;
    }
  }
  
  if (pathname === '/api/reviews/all') {
    if (req.method === 'GET') {
      const db = readDatabase();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ reviews: db.reviews }));
      return;
    }
  }
  
  const approveMatch = pathname.match(/^\/api\/reviews\/(\d+)\/approve$/);
  if (approveMatch && req.method === 'POST') {
    const id = parseInt(approveMatch[1]);
    const db = readDatabase();
    const review = db.reviews.find(r => r.id === id);
    if (review) {
      review.approved = true;
      writeDatabase(db);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Review approved' }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Review not found' }));
    }
    return;
  }
  
  const rejectMatch = pathname.match(/^\/api\/reviews\/(\d+)\/reject$/);
  if (rejectMatch && req.method === 'POST') {
    const id = parseInt(rejectMatch[1]);
    const db = readDatabase();
    const review = db.reviews.find(r => r.id === id);
    if (review) {
      review.approved = false;
      writeDatabase(db);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Review unapproved' }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Review not found' }));
    }
    return;
  }
  
  const deleteMatch = pathname.match(/^\/api\/reviews\/(\d+)$/);
  if (deleteMatch && req.method === 'DELETE') {
    const id = parseInt(deleteMatch[1]);
    const db = readDatabase();
    const index = db.reviews.findIndex(r => r.id === id);
    if (index !== -1) {
      db.reviews.splice(index, 1);
      writeDatabase(db);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Review deleted' }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Review not found' }));
    }
    return;
  }

  // PayPal configuration endpoint
  if (pathname === '/api/paypal-config' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      clientId: PAYPAL_CLIENT_ID,
      env: PAYPAL_ENV
    }));
    return;
  }

  // Static file serving
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(__dirname, filePath);

  const ext = path.extname(filePath).toLowerCase();
  const contentTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml'
  };

  const contentType = contentTypes[ext] || 'application/octet-stream';
  serveFile(res, filePath, contentType);
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`API endpoint: http://localhost:${PORT}/api/reviews`);
});

module.exports = { server, readDatabase, writeDatabase };