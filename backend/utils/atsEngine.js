/**
 * Heuristic ATS Resume Analysis Engine
 * 
 * Provides deterministic, offline ATS evaluation when the AI model is
 * rate-limited, unreachable, or in testing environments.
 * 
 * Analyzes:
 * 1. Technical & soft skill keyword matching
 * 2. Section completeness (Experience, Education, Skills, Projects)
 * 3. Quantifiable metrics presence (percentages, dollar amounts, numbers)
 * 4. ATS format compliance and length
 */

const COMMON_TECH_SKILLS = [
  'javascript', 'typescript', 'react', 'next.js', 'vue', 'angular', 'node.js',
  'express', 'python', 'django', 'flask', 'fastapi', 'java', 'spring boot',
  'c#', '.net', 'c++', 'go', 'golang', 'rust', 'ruby', 'rails', 'php',
  'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch',
  'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'ci/cd', 'git', 'github actions',
  'graphql', 'rest api', 'tailwind', 'html', 'css', 'sass', 'jest', 'playwright',
  'cypress', 'webpack', 'vite', 'linux', 'microservices', 'serverless'
];

/**
 * Extracts words/tokens from a string.
 * @param {string} text 
 * @returns {Set<string>}
 */
function extractSkillTokens(text) {
  if (!text || typeof text !== 'string') return new Set();
  const lower = text.toLowerCase();
  const found = new Set();
  
  for (const skill of COMMON_TECH_SKILLS) {
    // Word boundary or common punctuation boundary
    const escaped = skill.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(^|[^a-zA-Z0-9_#+])${escaped}([^a-zA-Z0-9_#+]|$)`, 'i');
    if (regex.test(lower)) {
      found.add(skill);
    }
  }
  return found;
}

/**
 * Evaluates a resume text against a target job description.
 * @param {string} resumeText 
 * @param {string} jobDescription 
 * @returns {{ score: number, missing_skills: string[], improvements: string[] }}
 */
function evaluateResumeHeuristically(resumeText, jobDescription = '') {
  const resume = (resumeText || '').toLowerCase();
  const jd = (jobDescription || '').toLowerCase();

  const resumeSkills = extractSkillTokens(resume);
  const jdSkills = extractSkillTokens(jd);

  // 1. Skill Gap Analysis
  let missingSkills = [];
  if (jdSkills.size > 0) {
    for (const skill of jdSkills) {
      if (!resumeSkills.has(skill)) {
        missingSkills.push(capitalizeWords(skill));
      }
    }
  } else {
    // If no specific JD skills provided, check against modern full-stack essentials
    const essentials = ['docker', 'kubernetes', 'ci/cd', 'typescript', 'aws', 'postgresql', 'jest'];
    missingSkills = essentials
      .filter((s) => !resumeSkills.has(s))
      .slice(0, 4)
      .map(capitalizeWords);
  }

  // 2. ATS Score Calculation
  let baseScore = 50;

  // Matching skill bonus
  if (jdSkills.size > 0) {
    const matchedCount = [...jdSkills].filter((s) => resumeSkills.has(s)).length;
    const matchRatio = matchedCount / jdSkills.size;
    baseScore += Math.round(matchRatio * 30); // Up to +30
  } else {
    baseScore += Math.min(25, resumeSkills.size * 2);
  }

  // Section completeness bonus
  const sections = ['experience', 'education', 'skills', 'projects'];
  const foundSections = sections.filter((sec) => resume.includes(sec));
  baseScore += foundSections.length * 2.5; // Up to +10

  // Quantifiable metrics bonus (numbers, percentages, dollar signs)
  const metricMatches = resume.match(/\b\d+(\.\d+)?%|\$\d+(\.\d+)?|\b\d+\s*(ms|users|requests|million|thousand|k)\b/gi) || [];
  if (metricMatches.length >= 3) {
    baseScore += 10;
  } else if (metricMatches.length > 0) {
    baseScore += 5;
  }

  // Clamp score
  const finalScore = Math.min(95, Math.max(25, Math.round(baseScore)));

  // 3. Actionable Improvements
  const improvements = [];
  if (metricMatches.length < 3) {
    improvements.push('Add quantifiable impact metrics (e.g., "improved page load by 35%", "scaled API to 10k users").');
  }
  if (missingSkills.length > 0) {
    improvements.push(`Incorporate key required skills in project bullets: ${missingSkills.slice(0, 3).join(', ')}.`);
  }
  if (!resume.includes('github') && !resume.includes('linkedin')) {
    improvements.push('Include clickable links to your GitHub profile and LinkedIn.');
  }
  if (!resume.includes('education') || !resume.includes('experience')) {
    improvements.push('Ensure standard ATS section headers ("Experience", "Education", "Skills") are clearly delineated.');
  }
  if (improvements.length < 2) {
    improvements.push('Use strong action verbs (e.g., Architected, Optimized, Spearheaded) at the beginning of each bullet.');
  }

  return {
    score: finalScore,
    missing_skills: missingSkills.slice(0, 6),
    improvements: improvements.slice(0, 4),
  };
}

function capitalizeWords(str) {
  return str
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

module.exports = {
  COMMON_TECH_SKILLS,
  extractSkillTokens,
  evaluateResumeHeuristically,
};

