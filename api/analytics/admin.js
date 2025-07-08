// /api/admin/users.js
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
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = req.user;

  if (!user.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const [users] = await db.promise().query(
      `SELECT id, email, created_at FROM users WHERE active = 1 AND is_admin = 0 ORDER BY created_at DESC`
    );
    res.json(users);
  } catch (err) {
    console.error('Fetch Users Error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }

}
