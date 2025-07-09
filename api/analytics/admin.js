// /api/analytics/admin.js
import db from '../utils/db.js';
import verifyToken from '../utils/verifyToken.js';

export default async function handler(req, res) {
  const method = req.method;

  try {
    await new Promise((resolve, reject) => {
      verifyToken(req, res, (err) => (err ? reject(err) : resolve()));
    });
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const requester = req.user;
  if (!requester?.is_admin) {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }

  if (method === 'GET') {
    const userId = req.query.id;

    if (userId) {
      // 🧾 Fetch logs for a specific user
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
        return res.status(200).json(logs);
      } catch (err) {
        console.error('❌ Admin Fetch Logs Error:', err);
        return res.status(500).json({ error: 'Failed to fetch user logs' });
      }
    } else {
      // 👥 Fetch all non-admin users
      try {
        const [users] = await db
          .promise()
          .query(
            `SELECT id, email, created_at FROM users WHERE is_admin = 0 AND active = 1 ORDER BY created_at DESC`
          );
        return res.status(200).json(users);
      } catch (err) {
        console.error('❌ Admin Fetch Users Error:', err);
        return res.status(500).json({ error: 'Failed to fetch users' });
      }
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
