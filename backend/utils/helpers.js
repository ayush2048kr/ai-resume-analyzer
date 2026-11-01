/**
 * Utility helpers extracted for testability.
 */

/**
 * Cleans potential markdown code-fence wrappers from a JSON string.
 * @param {string} raw - The raw string from the AI model.
 * @returns {string} - Cleaned string ready for JSON.parse().
 */
function cleanJsonResponse(raw) {
  if (typeof raw !== 'string') return '';
  let cleaned = raw.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned;
}

/**
 * Validates and normalises an analysis object into the expected response shape.
 * @param {object} analysis - Parsed JSON from Gemini.
 * @returns {{ score: number, missing_skills: string[], improvements: string[] }}
 */
function normalizeAnalysis(analysis) {
  if (!analysis || typeof analysis !== 'object') {
    return { score: 0, missing_skills: [], improvements: [] };
  }
  return {
    score: typeof analysis.score === 'number' ? Math.min(100, Math.max(0, analysis.score)) : 0,
    missing_skills: Array.isArray(analysis.missing_skills) ? analysis.missing_skills : [],
    improvements: Array.isArray(analysis.improvements) ? analysis.improvements : [],
  };
}

/**
 * Validates that an uploaded file is present and is a PDF.
 * @param {object|null} file - The multer file object.
 * @returns {{ valid: boolean, error?: string }}
 */
function validateUploadedFile(file) {
  if (!file) {
    return { valid: false, error: 'No resume PDF file uploaded.' };
  }
  if (file.mimetype && file.mimetype !== 'application/pdf') {
    return { valid: false, error: 'Only PDF files are accepted.' };
  }
  return { valid: true };
}

/**
 * Validates that an API key is real (not a placeholder).
 * @param {string|undefined} apiKey
 * @returns {boolean}
 */
function isValidApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') return false;
  const trimmed = apiKey.trim();
  if (trimmed === '') return false;
  if (trimmed.includes('your_') || trimmed.includes('placeholder')) return false;
  return true;
}

/**
 * Safely extracts plain text from a PDF Buffer using pdf-parse across library versions.
 * @param {Buffer} buffer
 * @param {any} [pdfLib]
 * @returns {Promise<string>}
 */
async function extractPdfText(buffer, pdfLib = require('pdf-parse')) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('Invalid PDF buffer provided.');
  }

  if (typeof pdfLib === 'function') {
    const data = await pdfLib(buffer);
    return data.text || '';
  }

  const Target = pdfLib.PDFParse || pdfLib.default;
  if (Target) {
    if (Target.prototype && typeof Target.prototype.getText === 'function') {
      const parser = new Target({ data: buffer });
      const result = await parser.getText();
      return typeof result === 'string' ? result : (result.text || '');
    }
    if (typeof Target === 'function') {
      const data = await Target(buffer);
      return data.text || '';
    }
  }

  throw new Error('Unsupported pdf-parse interface');
}

module.exports = {
  cleanJsonResponse,
  normalizeAnalysis,
  validateUploadedFile,
  isValidApiKey,
  extractPdfText,
};

