// /api/email/generate.js
import { GoogleGenerativeAI } from '@google/generative-ai';
import verifyToken from '../utils/verifyToken.js';
import db from '../utils/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ✅ JWT Token Verification
  try {
    await new Promise((resolve, reject) => {
      verifyToken(req, res, (err) => (err ? reject(err) : resolve()));
    });
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'User ID not found' });

  const { prompt = '', tone = 'professional', length = 'medium', language = 'English' } = req.body;

  if (!prompt.trim()) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  // ✅ Generate Advanced Prompt (matches your Python logic)
  const advancedPrompt = `
Task: Generate an email based on the following requirements:

Original Prompt: ${prompt}

Tone Guidelines: ${
    {
      professional: 'Use a formal, concise, and professional tone.',
      friendly: 'Use a warm, conversational, and approachable tone.',
      formal: 'Use a highly structured and traditional formal tone.',
      casual: 'Use a relaxed, informal, and personal tone.',
    }[tone] || 'Use a formal, concise, and professional tone.'
  }

Length Specification: ${
    {
      short: 'Keep the email brief and to the point, under 100 words.',
      medium: 'Aim for a balanced email length, around 150-250 words.',
      long: 'Provide a comprehensive and detailed email, approximately 300-400 words.',
    }[length] || 'Aim for a balanced email length, around 150-250 words.'
  }

Language: ${
    {
      English: 'Write the email in standard American English.',
      Spanish: 'Write the email in standard Spanish.',
      German: 'Write the email in standard German.',
      French: 'Write the email in standard French.',
    }[language] || 'Write the email in standard American English.'
  }

Important Instructions:
- ONLY return the generated email
- DO NOT include comments, explanations, or metadata
- Only return the final content
`;

  try {
    // ✅ Google Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(advancedPrompt);
    const responseText = result?.response?.text();

    if (!responseText?.trim()) {
      return res.status(500).json({ error: 'Gemini API returned empty content' });
    }

    // ✅ Log to DB as "generated"
    await db.promise().query(
      `INSERT INTO logs (user_id, action, email_content, timestamp) VALUES (?, 'generated', ?, NOW())`,
      [userId, responseText]
    );

    // ✅ Send response
    return res.json({
      email_content: responseText,
      settings: { tone, length, language },
    });
  } catch (err) {
    console.error('❌ Gemini Generate Error:', err);
    return res.status(500).json({ error: 'Failed to generate email', detail: err.message });
  }
}
