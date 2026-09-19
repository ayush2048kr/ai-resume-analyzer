import ResumeUpload from '../components/ResumeUpload';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-24 bg-gray-50">
      <h1 className="text-4xl font-bold text-gray-900 mb-2">AI Resume Analyzer</h1>
      <p className="text-gray-500 mb-8">Upload your resume to extract insights.</p>
      
      <ResumeUpload />
    </main>
  );
}