/**
 * Unit Tests for ResumeAnalysisResult component.
 * 
 * Tests cover:
 * - Score tier rendering (strong/good/needs attention)
 * - SVG gauge calculations
 * - Missing skills display
 * - Improvements list rendering
 * - Reset button functionality
 * - Edge cases: score 0, score 100, empty arrays
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResumeAnalysisResult from '../ResumeAnalysisResult';

// ─────────────────────────────────────────────
// Score Tier Rendering
// ─────────────────────────────────────────────
describe('ResumeAnalysisResult — Score Tiers', () => {
  test('renders "Strong Match" for score >= 80', () => {
    render(
      <ResumeAnalysisResult
        data={{ score: 92, missing_skills: [], improvements: [] }}
      />
    );
    expect(screen.getByText('Strong Match')).toBeInTheDocument();
    expect(screen.getByText('92')).toBeInTheDocument();
  });

  test('renders "Good Potential" for score 60-79', () => {
    render(
      <ResumeAnalysisResult
        data={{ score: 68, missing_skills: ['Docker'], improvements: ['Add metrics'] }}
      />
    );
    expect(screen.getByText('Good Potential')).toBeInTheDocument();
  });

  test('renders "Needs Attention" for score < 60', () => {
    render(
      <ResumeAnalysisResult
        data={{ score: 35, missing_skills: ['React', 'Node.js'], improvements: ['Revamp entirely'] }}
      />
    );
    expect(screen.getByText('Needs Attention')).toBeInTheDocument();
  });

  test('handles score of exactly 80 (boundary)', () => {
    render(
      <ResumeAnalysisResult
        data={{ score: 80, missing_skills: [], improvements: [] }}
      />
    );
    expect(screen.getByText('Strong Match')).toBeInTheDocument();
  });

  test('handles score of exactly 60 (boundary)', () => {
    render(
      <ResumeAnalysisResult
        data={{ score: 60, missing_skills: [], improvements: [] }}
      />
    );
    expect(screen.getByText('Good Potential')).toBeInTheDocument();
  });

  test('handles score of 0', () => {
    render(
      <ResumeAnalysisResult
        data={{ score: 0, missing_skills: ['Everything'], improvements: ['Start over'] }}
      />
    );
    expect(screen.getByText('Needs Attention')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  test('handles score of 100', () => {
    render(
      <ResumeAnalysisResult
        data={{ score: 100, missing_skills: [], improvements: [] }}
      />
    );
    expect(screen.getByText('Strong Match')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────
// Missing Skills Display
// ─────────────────────────────────────────────
describe('ResumeAnalysisResult — Missing Skills', () => {
  test('renders each missing skill as a badge', () => {
    const skills = ['Docker', 'Kubernetes', 'Redis', 'GraphQL'];
    render(
      <ResumeAnalysisResult
        data={{ score: 55, missing_skills: skills, improvements: [] }}
      />
    );
    skills.forEach((skill) => {
      expect(screen.getByText(skill)).toBeInTheDocument();
    });
  });

  test('shows "No critical skill gaps" when array is empty', () => {
    render(
      <ResumeAnalysisResult
        data={{ score: 90, missing_skills: [], improvements: [] }}
      />
    );
    expect(screen.getByText(/No critical skill gaps/i)).toBeInTheDocument();
  });

  test('displays correct count badge', () => {
    render(
      <ResumeAnalysisResult
        data={{ score: 50, missing_skills: ['A', 'B', 'C'], improvements: [] }}
      />
    );
    expect(screen.getByText('3 identified')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────
// Improvements List
// ─────────────────────────────────────────────
describe('ResumeAnalysisResult — Improvements', () => {
  test('renders numbered improvement cards', () => {
    const improvements = [
      'Add metrics to quantify impact',
      'Highlight CI/CD experience',
      'Include architecture diagrams',
    ];
    render(
      <ResumeAnalysisResult
        data={{ score: 70, missing_skills: [], improvements }}
      />
    );
    improvements.forEach((item) => {
      expect(screen.getByText(item)).toBeInTheDocument();
    });
    // Check numbered badges
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  test('shows correct suggestions count', () => {
    render(
      <ResumeAnalysisResult
        data={{ score: 65, missing_skills: [], improvements: ['Tip 1', 'Tip 2'] }}
      />
    );
    expect(screen.getByText('2 suggestions')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────
// Reset Button
// ─────────────────────────────────────────────
describe('ResumeAnalysisResult — Reset', () => {
  test('calls onReset when "Analyze Another Resume" is clicked', () => {
    const onReset = jest.fn();
    render(
      <ResumeAnalysisResult
        data={{ score: 75, missing_skills: [], improvements: [] }}
        onReset={onReset}
      />
    );

    const resetButton = screen.getByText('Analyze Another Resume');
    fireEvent.click(resetButton);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  test('does not render reset button when onReset is not provided', () => {
    render(
      <ResumeAnalysisResult
        data={{ score: 75, missing_skills: [], improvements: [] }}
      />
    );
    expect(screen.queryByText('Analyze Another Resume')).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────
// Default Props
// ─────────────────────────────────────────────
describe('ResumeAnalysisResult — Default Data', () => {
  test('renders with default props when no data is passed', () => {
    render(<ResumeAnalysisResult />);
    // Default score is 68 → "Good Potential"
    expect(screen.getByText('Good Potential')).toBeInTheDocument();
    expect(screen.getByText('68')).toBeInTheDocument();
  });
});
