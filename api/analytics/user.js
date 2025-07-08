// /api/user/index.js
import db from '../utils/db.js';
import verifyToken from '../utils/verifyToken.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await new Promise((resolve, reject) => {
      verifyToken(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  } catch (err) {
    console.error('Token verification failed:', err);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'No user ID found' });
  }

  try {
    const [logs] = await db.promise().query(
      `SELECT id, timestamp, action, email_content 
       FROM logs 
       WHERE user_id = ? 
       ORDER BY timestamp DESC 
       LIMIT 100`,
      [userId]
    );

    res.json({ logs });
  } catch (err) {
    console.error('User logs fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
}
