// /api/email/refine.js
import { GoogleGenerativeAI } from '@google/generative-ai';
import verifyToken from '../utils/verifyToken.js';
import db from '../utils/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await new Promise((resolve, reject) => {
      verifyToken(req, res, (err) => (err ? reject(err) : resolve()));
    });
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'User ID not found' });

  const { text = '', tone = 'professional', length = 'medium', language = 'English' } = req.body;
  if (!text.trim()) return res.status(400).json({ error: 'Text is required' });

  const toneMap = {
    professional: 'Enhance the text to sound more professional.',
    friendly: 'Make the text warmer and conversational.',
    formal: 'Make the text highly structured and formal.',
    casual: 'Make the text relaxed and informal.'
  };

  const lengthMap = {
    short: 'Condense the text to be under 100 words.',
    medium: 'Balance the length to 150-250 words.',
    long: 'Expand to a comprehensive 300-400 word text.'
  };

  const langMap = {
    English: 'Use standard American English.',
    Spanish: 'Use standard Spanish.',
    German: 'Use standard German.',
    French: 'Use standard French.'
  };

  const refinePrompt = `Task: Refine the given text\n\nOriginal: ${text}\nTone: ${toneMap[tone]}\nLength: ${lengthMap[length]}\nLanguage: ${langMap[language]}\nInstructions:\n- Return only the refined version of the text.`;

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    const result = await model.generateContent(refinePrompt);
    const refined = result?.response?.text()?.trim();

    if (!refined) return res.status(500).json({ error: 'Gemini API returned empty refined text' });

    await db.promise().query(
      `INSERT INTO logs (user_id, action, email_content, timestamp) VALUES (?, 'refined', ?, NOW())`,
      [userId, refined]
    );

    return res.json({
      refined_email: refined,
      settings: { tone, length, language }
    });
  } catch (err) {
    console.error('Refine Error:', err);
    return res.status(500).json({ error: 'Failed to refine text' });
  }
}
