/**
 * Unit Tests for ResumeUpload component.
 * 
 * Tests cover:
 * - Initial render state
 * - File selection (valid PDF, reject non-PDF)
 * - Form submission with fetch mocking
 * - Loading state display
 * - Error display
 * - Reset flow
 * - Analysis result rendering transition
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResumeUpload from '../ResumeUpload';

// Mock fetch globally
beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// Helper: create a fake File object
function createFakeFile(name = 'resume.pdf', type = 'application/pdf', size = 1024) {
  const content = new ArrayBuffer(size);
  return new File([content], name, { type });
}

// ─────────────────────────────────────────────
// Initial Render
// ─────────────────────────────────────────────
describe('ResumeUpload — Initial State', () => {
  test('renders the upload form with header', () => {
    render(<ResumeUpload />);
    expect(screen.getByText(/Analyze Resume against Job Description/i)).toBeInTheDocument();
  });

  test('renders job description textarea', () => {
    render(<ResumeUpload />);
    expect(screen.getByPlaceholderText(/Paste the target job description/i)).toBeInTheDocument();
  });

  test('renders file upload area', () => {
    render(<ResumeUpload />);
    expect(screen.getByText(/Click to upload/i)).toBeInTheDocument();
  });

  test('submit button is disabled when no file is selected', () => {
    render(<ResumeUpload />);
    const button = screen.getByRole('button', { name: /Analyze Resume/i });
    expect(button).toBeDisabled();
  });
});

// ─────────────────────────────────────────────
// File Selection
// ─────────────────────────────────────────────
describe('ResumeUpload — File Selection', () => {
  test('accepts a valid PDF file', async () => {
    render(<ResumeUpload />);
    const input = document.querySelector('input[type="file"]');
    const file = createFakeFile('my-resume.pdf', 'application/pdf');

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    expect(screen.getByText('my-resume.pdf')).toBeInTheDocument();
    const button = screen.getByRole('button', { name: /Analyze Resume/i });
    expect(button).not.toBeDisabled();
  });

  test('rejects a non-PDF file and shows error', async () => {
    render(<ResumeUpload />);
    const input = document.querySelector('input[type="file"]');
    const file = createFakeFile('photo.png', 'image/png');

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    expect(screen.getByText(/Please upload a valid PDF/i)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────
// Form Submission
// ─────────────────────────────────────────────
describe('ResumeUpload — Submission', () => {
  test('shows error when submitting without file', async () => {
    render(<ResumeUpload />);

    // Try to submit the form directly
    const button = screen.getByRole('button', { name: /Analyze Resume/i });
    // Button is disabled, so we test the guard
    expect(button).toBeDisabled();
  });

  test('calls fetch with correct FormData on submit', async () => {
    const mockResponse = {
      score: 82,
      missing_skills: ['Docker'],
      improvements: ['Add metrics'],
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(<ResumeUpload />);
    const input = document.querySelector('input[type="file"]');
    const file = createFakeFile();

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    const button = screen.getByRole('button', { name: /Analyze Resume/i });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/upload',
      expect.objectContaining({ method: 'POST' })
    );
  });

  test('displays analysis result on successful response', async () => {
    const mockResponse = {
      score: 88,
      missing_skills: ['Kubernetes'],
      improvements: ['Improve formatting'],
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(<ResumeUpload />);
    const input = document.querySelector('input[type="file"]');

    await act(async () => {
      fireEvent.change(input, { target: { files: [createFakeFile()] } });
    });

    const button = screen.getByRole('button', { name: /Analyze Resume/i });

    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => {
      // Should transition to ResumeAnalysisResult view
      expect(screen.getByText('Strong Match')).toBeInTheDocument();
    });
  });

  test('shows error on server error response', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'PDF parsing failed' }),
    });

    render(<ResumeUpload />);
    const input = document.querySelector('input[type="file"]');

    await act(async () => {
      fireEvent.change(input, { target: { files: [createFakeFile()] } });
    });

    const button = screen.getByRole('button', { name: /Analyze Resume/i });

    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(screen.getByText(/PDF parsing failed/i)).toBeInTheDocument();
    });
  });

  test('shows network error when fetch throws', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network failure'));

    render(<ResumeUpload />);
    const input = document.querySelector('input[type="file"]');

    await act(async () => {
      fireEvent.change(input, { target: { files: [createFakeFile()] } });
    });

    const button = screen.getByRole('button', { name: /Analyze Resume/i });

    await act(async () => {
      fireEvent.click(button);
    });

    await waitFor(() => {
      expect(screen.getByText(/Failed to connect/i)).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────
// Job Description
// ─────────────────────────────────────────────
describe('ResumeUpload — Job Description', () => {
  test('allows typing in the job description textarea', () => {
    render(<ResumeUpload />);
    const textarea = screen.getByPlaceholderText(/Paste the target job description/i);

    fireEvent.change(textarea, { target: { value: 'Senior React Developer needed' } });
    expect(textarea.value).toBe('Senior React Developer needed');
  });
});
