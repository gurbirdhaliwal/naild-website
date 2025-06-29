import React, { useState } from 'react';
import { InterviewConfig } from '../types/Interview';

interface InterviewSetupProps {
  onCreateInterview: (config: InterviewConfig) => void;
}

const InterviewSetup: React.FC<InterviewSetupProps> = ({ onCreateInterview }) => {
  const [config, setConfig] = useState<InterviewConfig>({
    role: '',
    languages: [],
    difficulty: 'mid'
  });
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');

  const roles = [
    'Frontend Developer',
    'Backend Developer',
    'Full Stack Developer',
    'DevOps Engineer',
    'Data Scientist',
    'Machine Learning Engineer',
    'Mobile Developer',
    'Software Engineer'
  ];

  const languages = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go',
    'Rust', 'PHP', 'Ruby', 'Swift', 'Kotlin', 'React', 'Node.js',
    'Angular', 'Vue.js', 'Django', 'Flask', 'Spring', 'Docker'
  ];

  const difficulties = [
    { value: 'junior', label: 'Junior (0-2 years)' },
    { value: 'mid', label: 'Mid-level (2-5 years)' },
    { value: 'senior', label: 'Senior (5+ years)' }
  ];

  const handleLanguageToggle = (language: string) => {
    setConfig(prev => ({
      ...prev,
      languages: prev.languages.includes(language)
        ? prev.languages.filter(l => l !== language)
        : [...prev.languages, language]
    }));
  };

  const handleSubmit = async () => {
    if (config.role && config.languages.length > 0) {
      setLoading(true);
      setLoadingMsg('Warming up AI, please wait...');
      try {
        const res = await fetch('http://localhost:8081/warmup');
        const data = await res.json();
        if (data.status === 'ready') {
          setLoadingMsg('AI is ready! Creating your interview...');
          setTimeout(() => {
            setLoading(false);
            onCreateInterview(config);
          }, 500); // brief pause for UX
        } else {
          setLoadingMsg('Error warming up AI. Please try again.');
        }
      } catch (e) {
        setLoadingMsg('Error connecting to AI backend.');
      }
    }
  };

  const isValid = config.role && config.languages.length > 0;

  return (
    <div className="flex items-center justify-center h-full p-2 sm:p-4">
      <div className="bg-white rounded-2xl p-4 sm:p-6 max-w-2xl w-full border border-gray-200 shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <svg className="animate-spin h-10 w-10 text-gray-900 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
            </svg>
            <div className="text-lg text-gray-900 font-medium mb-2">{loadingMsg}</div>
            <div className="text-sm text-gray-500">This may take a few seconds the first time.</div>
          </div>
        ) : (
        <div className="mb-4 sm:mb-6 text-center">
          <h2 className="text-xl sm:text-2xl font-light text-gray-900 mb-1">Setup Your Interview</h2>
          <p className="text-xs sm:text-sm text-gray-600">Configure your mock technical interview session</p>
        </div>
        )}

        <div className="space-y-4 sm:space-y-6">
          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2 sm:mb-3">
              Job Title
            </label>
            <div className="grid grid-cols-2 gap-2">
              {roles.map((role) => (
                <button
                  key={role}
                  onClick={() => setConfig(prev => ({ ...prev, role }))}
                  className={`p-2 sm:p-3 rounded-lg border-2 transition-all text-left ${
                    config.role === role
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900 text-xs sm:text-sm">{role}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Languages/Technologies */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2 sm:mb-3">
              Technologies & Languages
            </label>
            <div className="grid grid-cols-4 gap-1 sm:gap-2 max-h-24 sm:max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2 sm:p-3">
              {languages.map((language) => (
                <button
                  key={language}
                  onClick={() => handleLanguageToggle(language)}
                  className={`p-1 sm:p-1.5 rounded-md text-xs transition-all ${
                    config.languages.includes(language)
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {language}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Selected: {config.languages.length} technologies
            </p>
          </div>

          {/* Difficulty Level */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2 sm:mb-3">
              Experience Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {difficulties.map((diff) => (
                <button
                  key={diff.value}
                  onClick={() => setConfig(prev => ({ ...prev, difficulty: diff.value as any }))}
                  className={`p-2 sm:p-3 rounded-lg border-2 transition-all text-center ${
                    config.difficulty === diff.value
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900 text-xs sm:text-sm">{diff.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Start Button */}
          <div className="pt-1 sm:pt-2">
            <button
              onClick={handleSubmit}
              disabled={!isValid}
              className={`w-full py-2 sm:py-3 px-6 rounded-lg font-medium transition-all ${
                isValid
                  ? 'bg-gray-900 hover:bg-gray-800 text-white'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Start Interview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewSetup;
