require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { PDFParse } = require('pdf-parse');
const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

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

app.post('/api/upload', upload.single('file'), async (req, res) => {
  let parser = null;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No resume PDF file uploaded.' });
    }

    const jobDescription = req.body.jobDescription?.trim() || 'General Full Stack Software Engineer role';

    // 1. Extract text from uploaded PDF
    parser = new PDFParse({ data: req.file.buffer });
    const pdfData = await parser.getText();
    const resumeText = pdfData.text;

    if (!resumeText || resumeText.trim().length === 0) {
      return res.status(400).json({ error: 'Could not extract text from the PDF. Please ensure the file contains selectable text.' });
    }

    // 2. Validate Gemini API key configuration
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_') || apiKey.includes('placeholder')) {
      return res.status(500).json({
        error: 'Invalid or placeholder GEMINI_API_KEY in backend/.env. Please replace it with your real key from https://aistudio.google.com/app/apikey'
      });
    }

    // 3. Initialize Gemini model with JSON response enforcement
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.6-flash',
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
        temperature: 0.2,
      },
    });

    const userPrompt = `
Analyze this resume text against the target job description:

=== TARGET JOB DESCRIPTION ===
${jobDescription}

=== CANDIDATE RESUME TEXT ===
${resumeText}
`;

    // 4. Send request to Gemini
    const result = await model.generateContent(userPrompt);
    const responseText = result.response.text();

    // 5. Safely parse JSON output
    let analysis;
    try {
      let cleaned = responseText.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      analysis = JSON.parse(cleaned);
    } catch (parseError) {
      console.error('Failed to parse Gemini output:', responseText, parseError);
      return res.status(500).json({ error: 'Model response was not valid JSON.' });
    }

    // Return the structured analysis directly matching the frontend contract
    return res.json({
      score: analysis.score,
      missing_skills: analysis.missing_skills || [],
      improvements: analysis.improvements || [],
    });

  } catch (error) {
    console.error('Error during resume analysis:', error);
    return res.status(500).json({
      error: error.message || 'An unexpected error occurred during resume analysis.'
    });
  } finally {
    if (parser && typeof parser.destroy === 'function') {
      try {
        await parser.destroy();
      } catch (destroyError) {
        console.warn('PDFParse destroy warning:', destroyError.message);
      }
    }
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});