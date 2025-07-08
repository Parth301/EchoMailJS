// /api/pdf/generate.js
import puppeteer from 'puppeteer';
import verifyToken from '../utils/verifyToken.js';
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

  const { content, filename = 'generated-email.pdf' } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Email content is required' });
  }

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
}
