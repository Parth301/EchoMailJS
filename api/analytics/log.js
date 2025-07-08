// /api/analytics/log.js
import db from '../utils/db.js';
import verifytoken from '../utils/verifyToken.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
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

  const { prompt, response, action = 'generated' } = req.body;
  const userId = req.user.id;

  if (!prompt || !response) {
    return res.status(400).json({ error: 'Prompt and response are required' });
  }

  try {
    await db.promise().query(
      `INSERT INTO logs (user_id, action, prompt, response, created_at) VALUES (?, ?, ?, ?, NOW())`,
      [userId, action, prompt, response]
    );

    res.json({ message: 'Log saved successfully' });
  } catch (err) {
    console.error('Logging Error:', err);
    res.status(500).json({ error: 'Failed to save log' });
  }
}
