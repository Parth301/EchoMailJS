// /api/routes/pdf.js
const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');
const verifyToken = require('../utils/verifyToken');

router.post('/generate', verifyToken, async (req, res) => {
  const { content, filename = 'generated-email.pdf' } = req.body;

  if (!content) return res.status(400).json({ error: 'Email content is required' });

  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 30px; }
            h1, p { margin: 0 0 20px 0; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `;

    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({ format: 'A4' });
    await browser.close();

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(pdfBuffer);

  } catch (err) {
    console.error('PDF Generation Error:', err);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

module.exports = router;