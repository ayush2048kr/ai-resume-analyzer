"use client";

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import ReactMarkdown from 'react-markdown';

export default function ResumeUploader() {
  const [jobDesc, setJobDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState(null);

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setFeedback(null);

    const formData = new FormData();
    formData.append('resume', file);
    formData.append('jobDescription', jobDesc);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/upload`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setFeedback(data.aiFeedback);
      } else {
        setError(data.error || 'Failed to analyze resume.');
      }
    } catch (err) {
      console.error(err);
      setError('Network error. Ensure your backend is running.');
    } finally {
      setLoading(false);
    }
  }, [jobDesc]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false
  });

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <textarea 
        className="w-full p-4 border rounded-md mb-4 text-gray-700"
        rows="4"
        placeholder="Paste the target job description here (optional)..."
        value={jobDesc}
        onChange={(e) => setJobDesc(e.target.value)}
      />

      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed p-12 text-center rounded-lg cursor-pointer transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p className="text-blue-500 font-semibold">Drop the PDF here...</p>
        ) : (
          <p className="text-gray-600">Drag &amp; drop your resume PDF here, or click to select a file</p>
        )}
      </div>

      {loading && (
        <div className="text-center text-blue-600 font-medium animate-pulse">
          Analyzing resume with Gemini AI...
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {feedback && (
        <div className="bg-white p-6 shadow rounded-lg prose prose-blue max-w-none">
          <ReactMarkdown>{feedback}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
