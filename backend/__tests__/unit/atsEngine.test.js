const {
  COMMON_TECH_SKILLS,
  extractSkillTokens,
  evaluateResumeHeuristically,
} = require('../../utils/atsEngine');

describe('ATS Heuristic Engine', () => {
  describe('extractSkillTokens', () => {
    test('extracts common tech skills from text', () => {
      const text = 'Senior engineer with React, TypeScript, Node.js, and Docker experience.';
      const skills = extractSkillTokens(text);
      expect(skills.has('react')).toBe(true);
      expect(skills.has('typescript')).toBe(true);
      expect(skills.has('node.js')).toBe(true);
      expect(skills.has('docker')).toBe(true);
      expect(skills.has('ruby')).toBe(false);
    });

    test('handles empty or non-string input safely', () => {
      expect(extractSkillTokens('').size).toBe(0);
      expect(extractSkillTokens(null).size).toBe(0);
      expect(extractSkillTokens(undefined).size).toBe(0);
    });
  });

  describe('evaluateResumeHeuristically', () => {
    test('calculates high score when resume matches job description skills', () => {
      const resume = `
        Experience:
        Senior Software Engineer building scalable microservices.
        Optimized database queries in PostgreSQL reducing latency by 45%.
        Architected React and TypeScript frontends serving 50k users.
        Automated CI/CD with Docker and GitHub Actions.
        Education:
        B.S. in Computer Science.
        Skills: React, TypeScript, Node.js, Docker, PostgreSQL.
      `;
      const jd = 'Seeking a Full Stack Engineer with React, TypeScript, Docker, and PostgreSQL experience.';

      const result = evaluateResumeHeuristically(resume, jd);
      expect(result.score).toBeGreaterThanOrEqual(75);
      expect(Array.isArray(result.missing_skills)).toBe(true);
      expect(Array.isArray(result.improvements)).toBe(true);
    });

    test('identifies missing skills correctly', () => {
      const resume = 'Junior developer experienced in JavaScript and HTML.';
      const jd = 'Need developer with JavaScript, Python, Kubernetes, and AWS.';

      const result = evaluateResumeHeuristically(resume, jd);
      expect(result.missing_skills).toContain('Python');
      expect(result.missing_skills).toContain('Kubernetes');
      expect(result.missing_skills).toContain('Aws');
      expect(result.score).toBeLessThan(75);
    });

    test('clamps score within safe boundaries (25 to 95)', () => {
      const emptyResult = evaluateResumeHeuristically('', '');
      expect(emptyResult.score).toBeGreaterThanOrEqual(25);
      expect(emptyResult.score).toBeLessThanOrEqual(95);
    });
  });
});

