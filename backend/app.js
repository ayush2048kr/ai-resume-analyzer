/**
 * Express application setup — separated from server.js for testability.
 * server.js imports this and calls app.listen().
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
const uploadRoutes = require('./routes/upload');
const { cleanJsonResponse, normalizeAnalysis, validateUploadedFile, isValidApiKey, extractPdfText } = require('./utils/helpers');

const app = express();

app.use(cors());
app.use(express.json());

// Mount the markdown-response upload route at /api
app.use('/api', uploadRoutes);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

/**
 * System instruction and schema definition for strict JSON output
 */
const SYSTEM_PROMPT = `
You are an expert ATS (Applicant Tracking System) and Technical Resume Evaluator.
Your task is to analyze a candidate's resume text against a target job description (if provided) or general industry standards.

Evaluation Criteria:
1. Score (0-100):
   - 80-100: Strong match with required skills, clear quantifiable achievements, and relevant experience.
   - 60-79: Good potential, but missing some key technical proficiencies or impact metrics.
   - 0-59: Significant skill gaps, poor relevance, or lack of critical keywords.
2. Missing Skills: List specific technologies, frameworks, tools, or core competencies required in the job description that are missing or weak in the resume.
3. Improvements: Actionable, concise, and high-impact suggestions (e.g., adding metrics, rephrasing weak verbs, emphasizing specific architectures).

CRITICAL REQUIREMENT:
You must respond strictly with a valid JSON object matching the requested schema. Do not include markdown code blocks, conversational text, or explanations outside the JSON.
`;

const responseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    score: {
      type: SchemaType.INTEGER,
      description: "Overall ATS compatibility and resume quality score between 0 and 100",
    },
    missing_skills: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "List of key skills and technologies missing from the resume",
    },
    improvements: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "Actionable suggestions to improve the resume for this position",
    },
  },
  required: ["score", "missing_skills", "improvements"],
};

/**
 * POST /api/analyze — JSON-response resume analysis endpoint.
 * Accepts: multipart/form-data with 'file' (PDF) and optional 'jobDescription'.
 * Returns: { score, missing_skills, improvements }
 */
const analyzeUpload = upload.fields([{ name: 'file', maxCount: 1 }, { name: 'resume', maxCount: 1 }]);
const analyzeUploadMiddleware = (req, res, next) => {
  analyzeUpload(req, res, (err) => {
    if (err) return next(err);
    if (!req.file && req.files) {
      req.file = (req.files.file && req.files.file[0]) || (req.files.resume && req.files.resume[0]);
    }
    next();
  });
};

app.post('/api/analyze', analyzeUploadMiddleware, async (req, res) => {
  try {
    // 1. Validate file
    const fileCheck = validateUploadedFile(req.file);
    if (!fileCheck.valid) {
      return res.status(400).json({ error: fileCheck.error });
    }

    const jobDescription = req.body.jobDescription?.trim() || 'General Full Stack Software Engineer role';

    // 2. Extract text from uploaded PDF
    let resumeText;
    try {
      resumeText = await extractPdfText(req.file.buffer);
    } catch (pdfError) {
      console.error('PDF parse error:', pdfError);
      return res.status(400).json({ error: 'Could not parse the PDF. Ensure the file contains selectable text.' });
    }

    if (!resumeText || resumeText.trim().length === 0) {
      return res.status(400).json({ error: 'Could not extract text from the PDF. Please ensure the file contains selectable text.' });
    }

    // 3. Validate Gemini API key configuration
    const apiKey = process.env.GEMINI_API_KEY;
    if (!isValidApiKey(apiKey)) {
      return res.status(500).json({
        error: 'Invalid or placeholder GEMINI_API_KEY in backend/.env. Please replace it with your real key from https://aistudio.google.com/app/apikey'
      });
    }

    // 4. Initialize Gemini model with candidate fallback chain
    const candidateModels = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    const genAI = new GoogleGenerativeAI(apiKey);

    const userPrompt = `
Analyze this resume text against the target job description:

=== TARGET JOB DESCRIPTION ===
${jobDescription}

=== CANDIDATE RESUME TEXT ===
${resumeText}
`;

    let responseText = null;
    let lastError = null;

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: SYSTEM_PROMPT,
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: responseSchema,
            temperature: 0.2,
          },
        });
        const result = await model.generateContent(userPrompt);
        responseText = result.response.text();
        if (responseText) break;
      } catch (aiErr) {
        console.warn(`Model ${modelName} analysis attempt failed:`, aiErr.message);
        lastError = aiErr;
      }
    }

    if (!responseText) {
      console.error('All Gemini candidate models failed:', lastError);
      return res.status(500).json({ error: lastError?.message || 'Failed to generate resume analysis from AI.' });
    }

    // 5. Safely parse JSON output
    let analysis;
    try {
      const cleaned = cleanJsonResponse(responseText);
      analysis = JSON.parse(cleaned);
    } catch (parseError) {
      console.error('Failed to parse Gemini output:', responseText, parseError);
      return res.status(500).json({ error: 'Model response was not valid JSON.' });
    }

    // Return the structured analysis
    return res.json(normalizeAnalysis(analysis));

  } catch (error) {
    console.error('Error during resume analysis:', error);
    return res.status(500).json({
      error: error.message || 'An unexpected error occurred during resume analysis.'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = app;
