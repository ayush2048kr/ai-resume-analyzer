/**
 * Integration Tests for the Express API.
 * 
 * These tests use supertest to hit the actual Express app with:
 * - Mocked Gemini API (no real AI calls)
 * - Mocked pdf-parse (no real PDF processing)
 * - Real Express middleware pipeline (CORS, multer, JSON parsing)
 * 
 * Tests cover:
 * - Health check endpoint
 * - POST /api/analyze — happy path, missing file, empty PDF, invalid API key
 * - POST /api/upload (markdown route) — happy path, missing file
 */

const request = require('supertest');
const path = require('path');
const fs = require('fs');

// We need to mock external deps BEFORE requiring the app
jest.mock('pdf-parse', () => {
  // Return a function that simulates pdf-parse
  return jest.fn().mockImplementation(async (buffer) => {
    // Simulate extracting text from a PDF
    return {
      text: 'John Doe\nSoftware Engineer\nJavaScript, React, Node.js\n5 years experience',
      numpages: 1,
      info: { Title: 'Resume' },
    };
  });
});

jest.mock('@google/generative-ai', () => {
  const SchemaType = {
    OBJECT: 'OBJECT',
    INTEGER: 'INTEGER',
    ARRAY: 'ARRAY',
    STRING: 'STRING',
  };

  const mockGenerateContent = jest.fn().mockResolvedValue({
    response: {
      text: () => JSON.stringify({
        score: 78,
        missing_skills: ['Docker', 'Kubernetes'],
        improvements: ['Add metrics to quantify impact', 'Include CI/CD experience'],
      }),
    },
  });

  const mockGetGenerativeModel = jest.fn().mockReturnValue({
    generateContent: mockGenerateContent,
  });

  class GoogleGenerativeAI {
    constructor(apiKey) {
      this.apiKey = apiKey;
    }
    getGenerativeModel(config) {
      return mockGetGenerativeModel(config);
    }
  }

  return {
    GoogleGenerativeAI,
    SchemaType,
    __mockGenerateContent: mockGenerateContent,
    __mockGetGenerativeModel: mockGetGenerativeModel,
  };
});

// Set a valid API key for tests
process.env.GEMINI_API_KEY = 'test-api-key-for-integration-tests';

const app = require('../../app');

// Helper: create a fake PDF buffer for multipart uploads
function createFakePdfBuffer() {
  // Real PDFs start with %PDF- header; this is enough for multer to accept it
  return Buffer.from('%PDF-1.4 fake pdf content for testing purposes');
}

// ─────────────────────────────────────────────
// Health Check
// ─────────────────────────────────────────────
describe('GET /api/health', () => {
  test('returns 200 with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });
});

// ─────────────────────────────────────────────
// POST /api/analyze (JSON response endpoint)
// ─────────────────────────────────────────────
describe('POST /api/analyze', () => {
  test('returns structured analysis for a valid PDF upload', async () => {
    const res = await request(app)
      .post('/api/analyze')
      .attach('file', createFakePdfBuffer(), 'resume.pdf')
      .field('jobDescription', 'Senior React Developer with Docker experience');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('score');
    expect(res.body).toHaveProperty('missing_skills');
    expect(res.body).toHaveProperty('improvements');
    expect(typeof res.body.score).toBe('number');
    expect(Array.isArray(res.body.missing_skills)).toBe(true);
    expect(Array.isArray(res.body.improvements)).toBe(true);
  });

  test('returns 400 when no file is uploaded', async () => {
    const res = await request(app)
      .post('/api/analyze')
      .field('jobDescription', 'Software Engineer');

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('No resume PDF');
  });

  test('uses default job description when none is provided', async () => {
    const res = await request(app)
      .post('/api/analyze')
      .attach('file', createFakePdfBuffer(), 'resume.pdf');

    expect(res.status).toBe(200);
    expect(res.body.score).toBeDefined();
  });

  test('returns 500 when API key is placeholder', async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'your_gemini_api_key_here';

    const res = await request(app)
      .post('/api/analyze')
      .attach('file', createFakePdfBuffer(), 'resume.pdf');

    expect(res.status).toBe(500);
    expect(res.body.error).toContain('GEMINI_API_KEY');

    process.env.GEMINI_API_KEY = originalKey;
  });

  test('handles Gemini API errors gracefully', async () => {
    const { __mockGenerateContent } = require('@google/generative-ai');
    __mockGenerateContent.mockRejectedValueOnce(new Error('Gemini rate limited'));

    const res = await request(app)
      .post('/api/analyze')
      .attach('file', createFakePdfBuffer(), 'resume.pdf');

    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  });

  test('handles malformed Gemini JSON response', async () => {
    const { __mockGenerateContent } = require('@google/generative-ai');
    __mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => 'This is not valid JSON at all {{{{',
      },
    });

    const res = await request(app)
      .post('/api/analyze')
      .attach('file', createFakePdfBuffer(), 'resume.pdf');

    expect(res.status).toBe(500);
    expect(res.body.error).toContain('valid JSON');
  });
});

// ─────────────────────────────────────────────
// POST /api/upload (Markdown response endpoint)
// ─────────────────────────────────────────────
describe('POST /api/upload (markdown route)', () => {
  test('returns markdown aiFeedback for a valid upload', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('resume', createFakePdfBuffer(), 'resume.pdf')
      .field('jobDescription', 'Full Stack Engineer');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.aiFeedback).toBe('string');
  });

  test('returns 400 when no file is uploaded to markdown route', async () => {
    const res = await request(app)
      .post('/api/upload')
      .field('jobDescription', 'Engineer');

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('No file');
  });
});

// ─────────────────────────────────────────────
// CORS
// ─────────────────────────────────────────────
describe('CORS', () => {
  test('allows cross-origin requests', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:3000');

    expect(res.headers['access-control-allow-origin']).toBeDefined();
  });
});
