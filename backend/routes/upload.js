const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const supabase = require('../config/supabase');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Ensure GEMINI_API_KEY is defined in your backend .env file
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post('/upload', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    // 1. Extract text from PDF buffer
    const parse = typeof pdfParse === 'function'
      ? pdfParse
      : (pdfParse.default || pdfParse.PDFParse
          ? async (buffer) => {
              const Target = pdfParse.PDFParse || pdfParse.default;
              if (Target.prototype && Target.prototype.getText) {
                const parser = new Target({ data: buffer });
                return await parser.getText();
              }
              return await Target(buffer);
            }
          : pdfParse);
    const pdfData = await parse(req.file.buffer);
    const resumeText = pdfData.text;
    req.file.buffer = null; // Enforce zero-retention in memory

    // 2. Gemini API Analysis
    const jobDescription = req.body.jobDescription || "General analysis (no specific job provided).";

    const prompt = `You are an expert technical recruiter. Analyze the following resume against the provided target job description.
Format your response cleanly in Markdown.
1. Provide a "Fit Score" percentage at the top.
2. List matching strengths and aligned technical skills.
3. Identify missing keywords or skills the candidate needs to add.
4. Check for standard ATS formatting.

TARGET JOB DESCRIPTION:
"""
${jobDescription}
"""

RESUME TEXT:
"""
${resumeText}
"""`;

    const candidateModels = ['gemini-3.6-flash', 'gemini-3.5-flash'];
    let aiFeedback = null;
    let lastError = null;

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        aiFeedback = result.response.text();
        if (aiFeedback) break;
      } catch (aiErr) {
        console.warn(`Model ${modelName} encountered error:`, aiErr.message);
        lastError = aiErr;
      }
    }

    if (!aiFeedback) {
      console.error('Gemini API Error:', lastError);
      return res.status(503).json({
        success: false,
        error: "AI is currently experiencing high traffic. Please try again."
      });
    }

    // 3. Log to Supabase (excluding raw resume text)
    const { data, error } = await supabase
      .from('resume_analyses')
      .insert([
        { 
          user_id: req.body.userId || 'anonymous', 
          feedback: aiFeedback,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.error('Supabase Error:', error.message);
      return res.status(500).json({ error: 'Database logging failed.' });
    }

    res.status(200).json({ success: true, aiFeedback: aiFeedback });

  } catch (err) {
    console.error('Processing error:', err);
    res.status(500).json({ error: 'Failed to process the resume.' });
  }
});

module.exports = router;
