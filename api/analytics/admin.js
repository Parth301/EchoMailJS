// /api/admin/logs/[id].js
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
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const requester = req.user;
  const userId = req.query.id;

  if (!requester?.is_admin) {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }

  try {
    const [logs] = await db
      .promise()
      .query(
        `SELECT id, timestamp, action, email_content 
         FROM logs 
         WHERE user_id = ? 
         ORDER BY timestamp DESC 
         LIMIT 100`,
        [userId]
      );

    res.status(200).json({ logs });
  } catch (err) {
    console.error('Admin Fetch Logs Error:', err);
    res.status(500).json({ error: 'Failed to fetch user logs' });
  }
}
