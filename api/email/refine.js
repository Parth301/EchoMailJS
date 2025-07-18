// /api/email/refine.js
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
    text,
    tone = "professional",
    length = "medium",
    language = "English",
  } = req.body;

  const userId = req.user.id;

  if (!text) {
    return res.status(400).json({ error: "Missing text to refine" });
  }

  const toneMapping = {
    professional: "Enhance the text to sound more professional, precise, and formal.",
    friendly: "Modify the text to sound warmer, more conversational, and approachable.",
    formal: "Revise the text to be more structured, traditional, and academically oriented.",
    casual: "Adjust the text to be more relaxed, informal, and personal.",
  };

  const lengthMapping = {
    short: "Condense the text while preserving key information. Aim to reduce overall length.",
    medium: "Refine and balance the text, ensuring it's neither too brief nor too verbose.",
    long: "Expand on key points, add more context and detail where appropriate.",
  };

  const languageMapping = {
    English: "Ensure the text follows standard American English grammar and style.",
    Spanish: "Adapt the text to standard Spanish language conventions.",
    German: "Modify the text to align with standard German language guidelines.",
    French: "Revise the text to conform to standard French language rules.",
  };

  const advancedPrompt = `
Task: Refine the following text with specific guidelines:

Original Text:
${text}

Refinement Guidelines:
1. Tone: ${toneMapping[tone] || toneMapping.professional}
2. Length Adjustment: ${lengthMapping[length] || lengthMapping.medium}
3. Language Styling: ${languageMapping[language] || languageMapping.English}

Important Instructions:
- ONLY return the refined text
- Do NOT include explanations, formatting, or extra text
- Just the refined body content
`;

  if (advancedPrompt.length > 12000) {
    return res.status(400).json({ error: "Prompt too long. Try simplifying the input." });
  }

  try {
    let refinedText = "";
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
      const result = await model.generateContentStream([advancedPrompt]);
      for await (const chunk of result.stream) {
        refinedText += chunk.text();
      }
    } catch (err) {
      console.warn("⚠️  Flash model failed, using fallback 1.5-pro...");
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      const result = await model.generateContentStream([advancedPrompt]);
      for await (const chunk of result.stream) {
        refinedText += chunk.text();
      }
    }

    if (!refinedText) {
      return res.status(500).json({ error: "Gemini API returned empty response" });
    }

    await db
      .promise()
      .query(
        `INSERT INTO logs (user_id, action, email_content, timestamp) VALUES (?, ?, ?, NOW())`,
        [userId, "refined", refinedText]
      );

    res.json({
      refined_email: refinedText,
      settings: {
        tone,
        length,
        language,
      },
    });
  } catch (err) {
    console.error("❌ Gemini Refine Error:", err);
    res.status(500).json({ error: "Failed to refine content" });
  }
}
