'use client';

import { useState } from 'react';
import ResumeAnalysisResult from './ResumeAnalysisResult';

export default function ResumeUpload() {
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'application/pdf') {
        setError('Please upload a valid PDF document.');
        setFile(null);
        return;
      }
      setError('');
      setFile(selectedFile);
    }
  };

  const handleUpload = async (e) => {
    e?.preventDefault();

    if (!file) {
      setError('Please select your resume PDF file first.');
      return;
    }

    setIsLoading(true);
    setError('');

    // Construct FormData with both the file and job description string
    const formData = new FormData();
    formData.append('file', file);
    formData.append('jobDescription', jobDescription.trim());

    try {
      const response = await fetch('http://localhost:8000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        // If the backend returns an analysis object, set it
        if (data.analysis || data.score !== undefined) {
          setAnalysisResult(data.analysis || data);
        } else if (data.text) {
          setExtractedText(data.text);
        }
      } else {
        console.error('Server error:', data.error);
        setError(data.error || 'Failed to process resume.');
      }
    } catch (err) {
      console.error('Network error:', err);
      setError('Failed to connect to the backend server. Make sure your server is running on http://localhost:8000.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setJobDescription('');
    setAnalysisResult(null);
    setExtractedText('');
    setError('');
  };

  // If analysis result is available, render the results view
  if (analysisResult) {
    return <ResumeAnalysisResult data={analysisResult} onReset={handleReset} />;
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/80 dark:border-gray-800 p-6 md:p-8 shadow-xl shadow-gray-100/50 dark:shadow-none space-y-6">
        
        {/* Header */}
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
            Analyze Resume against Job Description
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Provide the target role requirements and your resume to receive ATS scores and tailored suggestions.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-5">
          {/* 1. Job Description Textarea */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="jobDescription" className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                Job Description
              </label>
              <span className="text-xs text-gray-400 dark:text-gray-500">Optional but recommended</span>
            </div>
            <textarea
              id="jobDescription"
              name="jobDescription"
              rows={5}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the target job description, responsibilities, or required qualifications here..."
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-sm resize-y"
            />
          </div>

          {/* 2. Resume File Upload */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
              Upload Resume (PDF) <span className="text-rose-500">*</span>
            </label>

            <div className="relative border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-6 text-center hover:border-indigo-400 dark:hover:border-indigo-500/60 transition bg-gray-50/30 dark:bg-gray-800/30">
              <input
                type="file"
                id="resumeFile"
                accept="application/pdf"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              
              <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                
                {file ? (
                  <div className="text-sm">
                    <p className="font-semibold text-gray-900 dark:text-white">{file.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {(file.size / 1024).toFixed(1)} KB &bull; Click or drop another to replace
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">PDF files only (Max 10MB)</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. Submit Button */}
          <button
            type="submit"
            disabled={!file || isLoading}
            className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-600 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/20 disabled:shadow-none flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Analyzing Resume...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Analyze Resume
              </>
            )}
          </button>
        </form>

        {/* Fallback Display if server only returns extracted text */}
        {extractedText && (
          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">
              Extracted Resume Text:
            </h3>
            <pre className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 text-xs text-gray-700 dark:text-gray-300 font-mono overflow-auto max-h-60 whitespace-pre-wrap border border-gray-100 dark:border-gray-800">
              {extractedText}
            </pre>
          </div>
        )}

      </div>
    </div>
  );
}