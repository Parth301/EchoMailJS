// /api/email/generate.js
import { GoogleGenerativeAI } from '@google/generative-ai';
import db from '../utils/db.js';
import verifyToken from '../utils/verifyToken.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Step 1: JWT Verification
  try {
    await new Promise((resolve, reject) => {
      verifyToken(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  } catch (err) {
    console.error('❌ Token verification failed:', err);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'User not found in token' });

  // Step 2: Extract input
  const { prompt, tone = 'professional', length = 'medium', language = 'English' } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

  // Step 3: Build advanced prompt
  const toneMapping = {
    professional: "Use a formal, concise, and professional tone.",
    friendly: "Use a warm, conversational, and approachable tone.",
    formal: "Use a highly structured and traditional formal tone.",
    casual: "Use a relaxed, informal, and personal tone."
  };

  const lengthMapping = {
    short: "Keep the email brief and to the point, under 100 words.",
    medium: "Aim for a balanced email length, around 150-250 words.",
    long: "Provide a comprehensive and detailed email, approximately 300-400 words."
  };

  const languageMapping = {
    English: "Write the email in standard American English.",
    Spanish: "Write the email in standard Spanish.",
    German: "Write the email in standard German.",
    French: "Write the email in standard French."
  };

  const advancedPrompt = `
Task: Generate an email based on the following requirements:

Original Prompt: ${prompt}

Tone Guidelines: ${toneMapping[tone] || toneMapping.professional}
Length Specification: ${lengthMapping[length] || lengthMapping.medium}
Language: ${languageMapping[language] || languageMapping.English}

Important Instructions:
- ONLY return the generated text
- Do NOT include any explanations, comments, or suggestions
- Provide ONLY the generated email/text content
- No metadata or extra information should be included
`;

  // Step 4: Gemini AI call
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' }); // fixed version

    const result = await model.generateContent(advancedPrompt);
    const response = await result.response;
    const text = response.text();

    if (!text) return res.status(500).json({ error: 'Gemini API returned empty response' });

    // Step 5: Log to DB
    await db.promise().query(
      `INSERT INTO logs (user_id, action, email_content, timestamp) VALUES (?, 'generated', ?, NOW())`,
      [userId, text]
    );

    // Step 6: Respond
    return res.json({
      email_content: text,
      settings: { tone, length, language }
    });
  } catch (err) {
    console.error('🔥 Gemini Error:', err);
    return res.status(500).json({ error: 'Failed to generate email', detail: err.message });
  }
  
}
