/**
 * Unit Tests for backend/utils/helpers.js
 * 
 * Tests cover:
 * - cleanJsonResponse: markdown fence stripping
 * - normalizeAnalysis: shape enforcement + clamping
 * - validateUploadedFile: file presence + mimetype
 * - isValidApiKey: placeholder / empty key detection
 */

const {
  cleanJsonResponse,
  normalizeAnalysis,
  validateUploadedFile,
  isValidApiKey,
} = require('../../utils/helpers');

// ─────────────────────────────────────────────
// cleanJsonResponse
// ─────────────────────────────────────────────
describe('cleanJsonResponse', () => {
  test('returns clean JSON when no fences present', () => {
    const input = '{"score":85,"missing_skills":[],"improvements":[]}';
    expect(cleanJsonResponse(input)).toBe(input);
  });

  test('strips ```json ... ``` fences', () => {
    const input = '```json\n{"score":90}\n```';
    expect(cleanJsonResponse(input)).toBe('{"score":90}');
  });

  test('strips plain ``` fences', () => {
    const input = '```\n{"score":75}\n```';
    expect(cleanJsonResponse(input)).toBe('{"score":75}');
  });

  test('trims whitespace around result', () => {
    const input = '  \n {"score":50}  \n ';
    expect(cleanJsonResponse(input)).toBe('{"score":50}');
  });

  test('returns empty string for non-string input', () => {
    expect(cleanJsonResponse(null)).toBe('');
    expect(cleanJsonResponse(undefined)).toBe('');
    expect(cleanJsonResponse(42)).toBe('');
  });

  test('handles empty string', () => {
    expect(cleanJsonResponse('')).toBe('');
  });
});

// ─────────────────────────────────────────────
// normalizeAnalysis
// ─────────────────────────────────────────────
describe('normalizeAnalysis', () => {
  test('passes through a valid analysis object', () => {
    const input = { score: 85, missing_skills: ['Docker'], improvements: ['Add metrics'] };
    expect(normalizeAnalysis(input)).toEqual(input);
  });

  test('clamps score above 100 down to 100', () => {
    const result = normalizeAnalysis({ score: 150, missing_skills: [], improvements: [] });
    expect(result.score).toBe(100);
  });

  test('clamps negative score to 0', () => {
    const result = normalizeAnalysis({ score: -20, missing_skills: [], improvements: [] });
    expect(result.score).toBe(0);
  });

  test('defaults score to 0 when missing', () => {
    const result = normalizeAnalysis({ missing_skills: ['Go'], improvements: [] });
    expect(result.score).toBe(0);
  });

  test('defaults missing_skills to [] when not an array', () => {
    const result = normalizeAnalysis({ score: 70, missing_skills: 'Docker', improvements: [] });
    expect(result.missing_skills).toEqual([]);
  });

  test('defaults improvements to [] when not an array', () => {
    const result = normalizeAnalysis({ score: 70, missing_skills: [], improvements: 'Add stuff' });
    expect(result.improvements).toEqual([]);
  });

  test('returns safe defaults for null/undefined input', () => {
    expect(normalizeAnalysis(null)).toEqual({ score: 0, missing_skills: [], improvements: [] });
    expect(normalizeAnalysis(undefined)).toEqual({ score: 0, missing_skills: [], improvements: [] });
  });

  test('returns safe defaults for non-object input', () => {
    expect(normalizeAnalysis('invalid')).toEqual({ score: 0, missing_skills: [], improvements: [] });
    expect(normalizeAnalysis(123)).toEqual({ score: 0, missing_skills: [], improvements: [] });
  });
});

// ─────────────────────────────────────────────
// validateUploadedFile
// ─────────────────────────────────────────────
describe('validateUploadedFile', () => {
  test('returns valid for a correct PDF file object', () => {
    const file = { mimetype: 'application/pdf', buffer: Buffer.from('test'), size: 100 };
    expect(validateUploadedFile(file)).toEqual({ valid: true });
  });

  test('returns error when file is null', () => {
    const result = validateUploadedFile(null);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('No resume PDF');
  });

  test('returns error when file is undefined', () => {
    const result = validateUploadedFile(undefined);
    expect(result.valid).toBe(false);
  });

  test('returns error for non-PDF mimetype', () => {
    const file = { mimetype: 'image/png', buffer: Buffer.from('test') };
    const result = validateUploadedFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('PDF');
  });

  test('accepts file without mimetype (multer edge case)', () => {
    const file = { buffer: Buffer.from('test'), size: 100 };
    const result = validateUploadedFile(file);
    expect(result.valid).toBe(true);
  });
});

// ─────────────────────────────────────────────
// isValidApiKey
// ─────────────────────────────────────────────
describe('isValidApiKey', () => {
  test('returns true for a real-looking API key', () => {
    expect(isValidApiKey('AIzaSyB1234567890abcdef')).toBe(true);
  });

  test('returns false for empty string', () => {
    expect(isValidApiKey('')).toBe(false);
  });

  test('returns false for whitespace-only', () => {
    expect(isValidApiKey('   ')).toBe(false);
  });

  test('returns false for undefined', () => {
    expect(isValidApiKey(undefined)).toBe(false);
  });

  test('returns false for null', () => {
    expect(isValidApiKey(null)).toBe(false);
  });

  test('returns false for placeholder keys', () => {
    expect(isValidApiKey('your_gemini_api_key_here')).toBe(false);
    expect(isValidApiKey('placeholder_key')).toBe(false);
  });

  test('returns false for non-string input', () => {
    expect(isValidApiKey(12345)).toBe(false);
  });
});
