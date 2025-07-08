// /api/email/send.js
import nodemailer from 'nodemailer';
import formidable from 'formidable';
import verifyToken from '../utils/verifyToken.js';
import db from '../utils/db.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ✅ Verify token
  try {
    await new Promise((resolve, reject) => {
      verifyToken(req, res, (err) => (err ? reject(err) : resolve()));
    });
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'User ID missing from token' });

  // ✅ Parse multipart form data (attachments + text fields)
  const form = formidable({ multiples: true });

  const { fields, files } = await new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });

  const recipient = fields.recipient;
  const subject = fields.subject;
  const emailContent = fields.email_content;

  if (!recipient || !subject || !emailContent) {
    return res.status(400).json({ error: 'Missing recipient, subject, or email_content' });
  }

  // ✅ Handle attachments
  const attachments = [];
  if (files.attachments) {
    const fileArray = Array.isArray(files.attachments) ? files.attachments : [files.attachments];

    for (const file of fileArray) {
      const buffer = await file.toBuffer();
      attachments.push({
        filename: file.originalFilename,
        content: buffer,
      });
    }
  }

  // ✅ Configure Gmail SMTP
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  try {
    const mailOptions = {
      from: `"EchoMail" <${process.env.GMAIL_USER}>`,
      to: recipient,
      subject: subject,
      text: emailContent.replace(/<[^>]*>/g, ''), // plain fallback
      html: emailContent,
      attachments,
    };

    const info = await transporter.sendMail(mailOptions);

    // ✅ Log action to DB
    await db.promise().query(
      `INSERT INTO logs (user_id, action, email_content, timestamp) VALUES (?, 'sent', ?, NOW())`,
      [userId, emailContent]
    );

    return res.json({ message: 'Email sent successfully!', messageId: info.messageId });
  } catch (err) {
    console.error('❌ Email sending error:', err);
    return res.status(500).json({ error: 'Failed to send email', detail: err.message });
  }
}
