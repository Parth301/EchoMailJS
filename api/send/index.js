// /api/send/index.js
import verifyToken from '../utils/verifyToken';
import nodemailer from 'nodemailer';
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

  const {
    to,
    subject,
    htmlContent,
    attachments = [],
  } = req.body;

  if (!to || !subject || !htmlContent) {
    return res.status(400).json({ error: 'To, subject, and HTML content are required' });
  }

  try {
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"EchoMail" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html: htmlContent,
      attachments,
    };

    const info = await transporter.sendMail(mailOptions);

    res.json({ message: 'Email sent', messageId: info.messageId });
  } catch (err) {
    console.error('Email Send Error:', err);
    res.status(500).json({ error: 'Failed to send email' });
  }
}
