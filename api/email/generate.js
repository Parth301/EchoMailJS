// /api/email/generate.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import verifyToken from "../utils/verifyToken.js";
import db from "../utils/db.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  res.setTimeout(25000, () => {
    console.log("Request timed out");
    return res.status(504).json({ error: "Timeout exceeded. Try again later." });
  });

  try {
    await new Promise((resolve, reject) => {
      verifyToken(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const {
    prompt,
    tone = "professional",
    length = "medium",
    language = "English",
  } = req.body;

  const userId = req.user.id;

  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt" });
  }

  const toneMapping = {
    professional: "Use a formal, concise, and professional tone.",
    friendly: "Use a warm, conversational, and approachable tone.",
    formal: "Use a highly structured and traditional formal tone.",
    casual: "Use a relaxed, informal, and personal tone.",
  };

  const lengthMapping = {
    short: "Keep the email brief and to the point, under 100 words.",
    medium: "Aim for a balanced email length, around 150-250 words.",
    long: "Provide a comprehensive and detailed email, approximately 300-400 words.",
  };

  const languageMapping = {
    English: "Write the email in standard American English.",
    Spanish: "Write the email in standard Spanish.",
    German: "Write the email in standard German.",
    French: "Write the email in standard French.",
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

  if (advancedPrompt.length > 12000) {
    return res.status(400).json({ error: "Prompt too long. Try simplifying the input." });
  }

  try {
    let generatedText = "";
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContentStream([advancedPrompt]);
      for await (const chunk of result.stream) {
        generatedText += chunk.text();
      }
    } catch (err) {
      console.warn("⚠️ Flash model failed, using fallback 1.0-pro...");
      const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
      const result = await model.generateContentStream([advancedPrompt]);
      for await (const chunk of result.stream) {
        generatedText += chunk.text();
      }
    }

    if (!generatedText) {
      return res.status(500).json({ error: "Gemini API returned empty response" });
    }

    await db
      .promise()
      .query(
        `INSERT INTO logs (user_id, action, prompt, response, created_at) VALUES (?, ?, ?, ?, NOW())`,
        [userId, "generated", prompt, generatedText]
      );

    res.json({
      email_content: generatedText,
      settings: {
        tone,
        length,
        language,
      },
    });
  } catch (err) {
    console.error("❌ Gemini Generate Error:", err);
    res.status(500).json({ error: "Failed to generate content" });
  }
}
