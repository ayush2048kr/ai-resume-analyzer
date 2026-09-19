'use client';

import React from 'react';

/**
 * @typedef {Object} AnalysisData
 * @property {number} score - Overall resume score (0-100)
 * @property {string[]} missing_skills - List of detected missing key skills
 * @property {string[]} improvements - Actionable feedback/recommendations
 */

/**
 * Props for ResumeAnalysisResult
 * @param {{ data?: AnalysisData, onReset?: () => void }} props
 */
export default function ResumeAnalysisResult({
  data = {
    score: 68,
    missing_skills: ['Docker', 'Kubernetes', 'Redis'],
    improvements: [
      'Include metrics to quantify impact (e.g., increased revenue by 20%, reduced latency by 35ms)',
      'Highlight JWT and authentication architecture experience in backend roles'
    ]
  },
  onReset
}) {
  const { score = 0, missing_skills = [], improvements = [] } = data;

  // Configuration based on score tier
  const getScoreTheme = (val) => {
    if (val >= 80) {
      return {
        label: 'Strong Match',
        description: 'Your resume is highly aligned with industry benchmarks and core technical requirements.',
        strokeColor: '#10B981', // emerald-500
        bgColor: 'bg-emerald-500/10',
        textColor: 'text-emerald-600 dark:text-emerald-400',
        badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
        ringGlow: 'shadow-[0_0_30px_rgba(16,185,129,0.2)]'
      };
    } else if (val >= 60) {
      return {
        label: 'Good Potential',
        description: 'Solid foundation, but addressing high-priority skill gaps will significantly boost your interview rate.',
        strokeColor: '#F59E0B', // amber-500
        bgColor: 'bg-amber-500/10',
        textColor: 'text-amber-600 dark:text-amber-400',
        badgeBg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
        ringGlow: 'shadow-[0_0_30px_rgba(245,158,11,0.2)]'
      };
    } else {
      return {
        label: 'Needs Attention',
        description: 'Your resume is missing critical technical keywords and quantifiable impact metrics for targeted roles.',
        strokeColor: '#F43F5E', // rose-500
        bgColor: 'bg-rose-500/10',
        textColor: 'text-rose-600 dark:text-rose-400',
        badgeBg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800',
        ringGlow: 'shadow-[0_0_30px_rgba(244,63,94,0.2)]'
      };
    }
  };

  const theme = getScoreTheme(score);

  // SVG Circular Gauge Calculations
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.min(100, Math.max(0, score));
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 transition-all duration-300">
      {/* Main Header / Top Score Banner Card */}
      <div className={`relative overflow-hidden rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 md:p-8 shadow-xl shadow-gray-100/50 dark:shadow-none ${theme.ringGlow}`}>
        {/* Subtle Background Accent Mesh */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-500 bg-current" style={{ color: theme.strokeColor }} />
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center relative z-10">
          
          {/* Left: Circular Progress Gauge */}
          <div className="md:col-span-5 flex flex-col items-center justify-center">
            <div className="relative flex items-center justify-center">
              <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 160 160">
                {/* Background Track Circle */}
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  strokeWidth="12"
                  className="stroke-gray-100 dark:stroke-gray-800 fill-none"
                />
                {/* Animated Score Progress Circle */}
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  strokeWidth="12"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  stroke={theme.strokeColor}
                  className="fill-none transition-all duration-1000 ease-out"
                />
              </svg>

              {/* Inside Gauge Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                  {score}
                  <span className="text-xl font-medium text-gray-400 dark:text-gray-500">/100</span>
                </span>
                <span className="text-xs uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500 mt-0.5">
                  ATS Score
                </span>
              </div>
            </div>

            {/* Score Tier Badge */}
            <span className={`mt-3 inline-flex items-center px-3.5 py-1 rounded-full text-xs font-semibold border ${theme.badgeBg}`}>
              <span className="w-1.5 h-1.5 rounded-full mr-2" style={{ backgroundColor: theme.strokeColor }} />
              {theme.label}
            </span>
          </div>

          {/* Right: Summary & Executive Overview */}
          <div className="md:col-span-7 flex flex-col justify-center text-left space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50">
                  AI Evaluation Report
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                Resume Health Overview
              </h2>
              <p className="mt-2 text-sm md:text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                {theme.description}
              </p>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800/80">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Missing Skills</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                  {missing_skills.length} identified
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800/80">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Key Recommendations</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                  {improvements.length} suggestions
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Grid for Missing Skills and Recommended Improvements */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Section 1: Missing Skills (5 cols) */}
        <div className="lg:col-span-5 rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-lg shadow-gray-100/40 dark:shadow-none flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Missing Skills
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Industry keywords missing from your profile
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                {missing_skills.length}
              </span>
            </div>

            {/* Missing Skills Pills / Badges */}
            {missing_skills.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-2">
                {missing_skills.map((skill, index) => (
                  <div
                    key={index}
                    className="group inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium bg-rose-50/70 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/50 hover:bg-rose-100/80 dark:hover:bg-rose-900/60 transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    <span>{skill}</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-rose-400 dark:text-rose-500 ml-1">
                      +Add
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-sm flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                No critical skill gaps detected!
              </div>
            )}
          </div>

          <p className="text-xs text-gray-400 dark:text-gray-500 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
            Tip: Integrate these tools into your project descriptions or skills section.
          </p>
        </div>

        {/* Section 2: Actionable Improvements (7 cols) */}
        <div className="lg:col-span-7 rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-lg shadow-gray-100/40 dark:shadow-none flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Actionable Improvements
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    High-impact tweaks to increase recruiter callback rate
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                {improvements.length} tips
              </span>
            </div>

            {/* List of styled recommendation cards */}
            <div className="space-y-3 pt-2">
              {improvements.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-gray-50/80 dark:bg-gray-850 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 hover:border-amber-200 dark:hover:border-amber-900/60 transition-all group"
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center text-xs font-bold mt-0.5">
                    {index + 1}
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {onReset && (
            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
              <button
                onClick={onReset}
                className="px-4 py-2 text-sm font-medium rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors inline-flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Analyze Another Resume
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
