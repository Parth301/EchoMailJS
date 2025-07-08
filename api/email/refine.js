// /api/email/refine.js
import formidable from 'formidable';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { GoogleGenerativeAI } from '@google/generative-ai';
import db from '../utils/db.js';
import verifyToken from '../utils/verifyToken.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

const extractTextFromBuffer = async (buffer, ext) => {
  try {
    if (ext === 'pdf') {
      const data = await pdfParse(buffer);
      return data.text;
    } else if (ext === 'docx') {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } else if (ext === 'txt') {
      return buffer.toString('utf8');
    } else {
      return '';
    }
  } catch (err) {
    console.error('❌ Failed to extract content:', err);
    return '';
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ✅ Token check
  try {
    await new Promise((resolve, reject) => {
      verifyToken(req, res, (err) => (err ? reject(err) : resolve()));
    });
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'No user ID' });

  // ✅ Parse form-data
  const form = formidable({
    keepExtensions: true,
    fileWriteStreamHandler: () => null, // Prevents writing to disk
    maxFileSize: 10 * 1024 * 1024, // 10MB max
  });

  const { fields, files } = await new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });

  const tone = fields.tone || 'professional';
  const length = fields.length || 'medium';
  const language = fields.language || 'English';
  let emailContent = fields.text || '';

  // ✅ Extract from file if provided
  if (files?.file && files.file[0]) {
    const file = files.file[0];
    const buffer = await file.toBuffer();
    const ext = file.originalFilename.split('.').pop().toLowerCase();

    if (!['pdf', 'docx', 'txt'].includes(ext)) {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    emailContent = await extractTextFromBuffer(buffer, ext);
  }

  if (!emailContent?.trim()) {
    return res.status(400).json({ error: 'No content to refine' });
  }

  // ✅ Generate refinement prompt
  const prompt = `
Task: Refine the following text with specific guidelines:

Original Text:
${emailContent}

Refinement Guidelines:
1. Tone: ${{
    professional: 'Enhance the text to sound more professional, precise, and formal.',
    friendly: 'Make the text warmer and more conversational.',
    formal: 'Make it more structured and academically oriented.',
    casual: 'Relax the tone and make it more personal.',
  }[tone]}

2. Length: ${{
    short: 'Make it shorter and concise.',
    medium: 'Keep it moderately long.',
    long: 'Expand and elaborate as needed.',
  }[length]}

3. Language: ${{
    English: 'Ensure the text is in standard American English.',
    Spanish: 'Translate or rephrase into proper Spanish.',
    German: 'Translate or rephrase into proper German.',
    French: 'Translate or rephrase into proper French.',
  }[language]}

Important Instructions:
- ONLY return the refined email text
- Do NOT include explanations or metadata
`;

  // ✅ Call Gemini
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(prompt);
    const output = await result.response.text();

    const refined = output?.replace(/^#+\s*Refined Text:/i, '').trim();

    // ✅ Log action
    await db.promise().query(
      `INSERT INTO logs (user_id, action, email_content, timestamp) VALUES (?, 'refined', ?, NOW())`,
      [userId, refined]
    );

    return res.json({
      refined_email: refined,
      settings: { tone, length, language },
    });
  } catch (err) {
    console.error('❌ Gemini refine error:', err);
    return res.status(500).json({ error: 'Gemini API error', detail: err.message });
  }
}
