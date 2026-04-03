module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const pathname = (req.url || '/').split('?')[0];

  if (pathname === '/api/reviews' && req.method === 'GET') {
    res.status(200).json({ reviews: [], message: 'Using client-side storage' });
    return;
  }

  if (pathname === '/api/reviews' && req.method === 'POST') {
    try {
      const data = req.body || {};
      if (!data.name || !data.rating || !data.text) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }
      res.status(201).json({ 
        message: 'Review saved to local storage',
        review: {
          id: Date.now(),
          name: data.name,
          rating: parseInt(data.rating),
          text: data.text,
          date: new Date().toISOString().split('T')[0],
          avatar: data.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
          approved: false
        }
      });
    } catch (error) {
      res.status(400).json({ error: 'Invalid JSON' });
    }
    return;
  }

  res.status(404).json({ error: 'Not found' });
};
