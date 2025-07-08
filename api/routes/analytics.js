// /api/routes/analytics.js
const express = require('express');
const router = express.Router();
const db = require('../utils/db');
const verifyToken = require('../utils/verifyToken');

// Log generated email
router.post('/log', verifyToken, async (req, res) => {
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
});

// Get user logs
router.get('/user', verifyToken, async (req, res) => {
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
});


module.exports = router;