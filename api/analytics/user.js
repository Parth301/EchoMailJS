// /api/analytics/user.js
const db = require('../utils/db');
const verifyToken = require('../utils/verifyToken');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify token
  try {
    await new Promise((resolve, reject) => {
      verifyToken(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = req.user.id;

  try {
    const [logs] = await db.promise().query(
      `SELECT action, prompt, response, created_at FROM logs WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );

    res.json({ logs });
  } catch (err) {
    console.error('Fetch Logs Error:', err);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
}
