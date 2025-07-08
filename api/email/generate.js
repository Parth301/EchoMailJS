// /api/email/generate.js
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
import { GoogleGenerativeAI } from '@google/generative-ai';
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

  const { prompt, tone = 'formal', length = 'medium', language = 'english' } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const fullPrompt = `Generate an email in a ${tone} tone and ${length} length in ${language}. Here is the user message: ${prompt}`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    res.json({ generated_email: text });
  } catch (err) {
    console.error('Gemini Error:', err);
    res.status(500).json({ error: 'Error generating email with Gemini' });
  }
}
