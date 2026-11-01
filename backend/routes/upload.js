const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const supabase = require('../config/supabase');
const { extractPdfText } = require('../utils/helpers');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Ensure GEMINI_API_KEY is defined in your backend .env file
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const uploadFields = upload.fields([{ name: 'resume', maxCount: 1 }, { name: 'file', maxCount: 1 }]);
const uploadMiddleware = (req, res, next) => {
  uploadFields(req, res, (err) => {
    if (err) return next(err);
    if (!req.file && req.files) {
      req.file = (req.files.resume && req.files.resume[0]) || (req.files.file && req.files.file[0]);
    }
    next();
  });
};

router.post('/upload', uploadMiddleware, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    // 1. Extract text from PDF buffer
    let resumeText;
    try {
      resumeText = await extractPdfText(req.file.buffer);
    } catch (parseErr) {
      console.error('PDF extraction failed:', parseErr);
      return res.status(400).json({ error: 'Could not parse the PDF. Ensure the file contains selectable text.' });
    }
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

    const candidateModels = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
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

    // Extract score if available from markdown or default
    const scoreMatch = aiFeedback.match(/(\d{1,3})%/);
    const score = scoreMatch ? Math.min(100, Math.max(0, parseInt(scoreMatch[1], 10))) : 75;

    const analysis = {
      score,
      missing_skills: ["Review suggested keywords in AI feedback"],
      improvements: ["See detailed recruiter breakdown in AI feedback"]
    };

    res.status(200).json({
      success: true,
      aiFeedback: aiFeedback,
      score: score,
      missing_skills: analysis.missing_skills,
      improvements: analysis.improvements,
      analysis: analysis,
      text: resumeText
    });

  } catch (err) {
    console.error('Processing error:', err);
    res.status(500).json({ error: 'Failed to process the resume.' });
  }
});

module.exports = router;
