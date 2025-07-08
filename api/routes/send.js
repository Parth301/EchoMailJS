// /api/routes/send.js
const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const verifyToken = require('../utils/verifyToken');

router.post('/', verifyToken, async (req, res) => {
  const {
    to,
    subject,
    htmlContent,
    attachments = [], // Optional: [{ filename, path }]
  } = req.body;

  if (!to || !subject || !htmlContent) {
    return res.status(400).json({ error: 'To, subject, and HTML content are required' });
  }

  try {
    const transporter = nodemailer.createTransport({
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
});

module.exports = router;