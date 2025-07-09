// /api/analytics/admin.js
import db from '../utils/db.js';
import verifyToken from '../utils/verifyToken.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

  try {
    const [users] = await db
      .promise()
      .query(
        `SELECT id, email, created_at FROM users WHERE is_admin = 0 AND active = 1 ORDER BY created_at DESC`
      );

    res.status(200).json(users); // ✅ flat list only
  } catch (err) {
    console.error('Admin Fetch Users Error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
}
