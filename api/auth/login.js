// /api/auth/login.js
import db from '../utils/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import validator from 'validator';

const JWT_SECRET = process.env.JWT_SECRET;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email = '', password = '' } = req.body;

  // Trim and validate input
  const trimmedEmail = email.trim();
  const trimmedPassword = password.trim();

  if (!trimmedEmail || !trimmedPassword) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (!validator.isEmail(trimmedEmail)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    // Fetch user from the database (active only)
    const [users] = await db
      .promise()
      .query(
        'SELECT id, email, password, is_admin FROM user WHERE email = ? AND active = 1',
        [trimmedEmail]
      );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Compare password
    const passwordMatch = await bcrypt.compare(trimmedPassword, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create JWT token with extra user info
    const token = jwt.sign(
      { id: user.id, email: user.email, is_admin: user.is_admin },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Success response
    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        is_admin: user.is_admin,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error. Please try again later.' });
  }
}
