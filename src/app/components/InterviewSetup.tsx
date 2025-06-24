
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

  const handleSubmit = () => {
    if (config.role && config.languages.length > 0) {
      onCreateInterview(config);
    }
  };

  const isValid = config.role && config.languages.length > 0;

  return (
    <div className="flex items-center justify-center h-full p-8 bg-gray-50">
      <div className="bg-white rounded-2xl p-8 max-w-2xl w-full border border-gray-200 shadow-sm">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-light text-gray-900 mb-2">Setup Your Interview</h2>
          <p className="text-gray-600">Configure your mock technical interview session</p>
        </div>

        <div className="space-y-8">
          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-4">
              Job Title
            </label>
            <div className="grid grid-cols-2 gap-3">
              {roles.map((role) => (
                <button
                  key={role}
                  onClick={() => setConfig(prev => ({ ...prev, role }))}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    config.role === role
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900">{role}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Languages/Technologies */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-4">
              Technologies & Languages
            </label>
            <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-4">
              {languages.map((language) => (
                <button
                  key={language}
                  onClick={() => handleLanguageToggle(language)}
                  className={`p-2 rounded-lg text-sm transition-all ${
                    config.languages.includes(language)
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {language}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Selected: {config.languages.length} technologies
            </p>
          </div>

          {/* Difficulty Level */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-4">
              Experience Level
            </label>
            <div className="grid grid-cols-3 gap-3">
              {difficulties.map((diff) => (
                <button
                  key={diff.value}
                  onClick={() => setConfig(prev => ({ ...prev, difficulty: diff.value as any }))}
                  className={`p-4 rounded-xl border-2 transition-all text-center ${
                    config.difficulty === diff.value
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900">{diff.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Start Button */}
          <div className="pt-4">
            <button
              onClick={handleSubmit}
              disabled={!isValid}
              className={`w-full py-4 px-6 rounded-xl font-medium transition-all ${
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
