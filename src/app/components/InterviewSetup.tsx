import React, { useState } from 'react';
import { InterviewConfig } from '../types/Interview';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface InterviewSetupProps {
  onCreateInterview: (config: InterviewConfig) => void;
}

const InterviewSetup: React.FC<InterviewSetupProps> = ({ onCreateInterview }) => {
  const [config, setConfig] = useState<InterviewConfig>({
    role: '',
    languages: [],
    difficulty: 'mid'
  });
  const [currentStep, setCurrentStep] = useState(0);
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

  const steps = [
    { title: 'Job Title', description: 'Select your target role' },
    { title: 'Technologies', description: 'Choose relevant technologies' },
    { title: 'Experience Level', description: 'Set your experience level' },
    { title: 'Confirm', description: 'Review your choices' }
  ];

  const handleLanguageToggle = (language: string) => {
    setConfig(prev => ({
      ...prev,
      languages: prev.languages.includes(language)
        ? prev.languages.filter(l => l !== language)
        : [...prev.languages, language]
    }));
  };

  const handleRoleSelect = (role: string) => {
    setConfig(prev => ({ ...prev, role }));
    setTimeout(() => setCurrentStep(1), 300);
  };

  const handleLanguagesNext = () => {
    if (config.languages.length > 0) {
      setTimeout(() => setCurrentStep(2), 300);
    }
  };

  const handleDifficultySelect = (difficulty: string) => {
    setConfig(prev => ({ ...prev, difficulty: difficulty as any }));
    setTimeout(() => setCurrentStep(3), 300);
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
            onCreateInterview(config);
          }, 500);
        } else {
          setLoadingMsg('Error warming up AI. Please try again.');
        }
      } catch (e) {
        setLoadingMsg('Error connecting to AI backend.');
      }
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getDifficultyLabel = (value: string) => {
    return difficulties.find(d => d.value === value)?.label || value;
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <motion.div
            key="step-0"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="text-center mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-1">Select Job Title</h3>
              <p className="text-sm text-gray-600">Choose the role you're interviewing for</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {roles.map((role, index) => (
                <motion.button
                  key={role}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleRoleSelect(role)}
                  className="p-4 rounded-lg border-2 border-gray-200 hover:border-gray-300 transition-all text-left hover:bg-gray-50 hover:scale-105 min-h-[80px] flex items-center"
                >
                  <div className="font-medium text-gray-900 text-sm leading-tight">{role}</div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        );

      case 1:
        return (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="text-center mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-1">Select Technologies</h3>
              <p className="text-sm text-gray-600">Choose the technologies you want to be tested on</p>
            </div>
            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
              {languages.map((language, index) => (
                <motion.button
                  key={language}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleLanguageToggle(language)}
                  className={`p-2 rounded-md text-xs transition-all ${
                    config.languages.includes(language)
                      ? 'bg-gray-900 text-white scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {language}
                </motion.button>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Selected: {config.languages.length} technologies
              </p>
              <motion.button
                onClick={handleLanguagesNext}
                disabled={config.languages.length === 0}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  config.languages.length > 0
                    ? 'bg-gray-900 hover:bg-gray-800 text-white'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                whileHover={config.languages.length > 0 ? { scale: 1.05 } : {}}
                whileTap={config.languages.length > 0 ? { scale: 0.95 } : {}}
              >
                Next
              </motion.button>
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            key="step-2"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="text-center mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-1">Experience Level</h3>
              <p className="text-sm text-gray-600">Select your experience level</p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {difficulties.map((diff, index) => (
                <motion.button
                  key={diff.value}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleDifficultySelect(diff.value)}
                  className={`p-4 rounded-lg border-2 transition-all text-center hover:scale-105 ${
                    config.difficulty === diff.value
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900">{diff.label}</div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            key="step-3"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="text-center mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-1">Confirm Your Choices</h3>
              <p className="text-sm text-gray-600">Review your interview configuration</p>
            </div>
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gray-50 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Job Title:</span>
                  <span className="text-sm text-gray-900">{config.role}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Technologies:</span>
                  <span className="text-sm text-gray-900">{config.languages.join(', ')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Experience Level:</span>
                  <span className="text-sm text-gray-900">{getDifficultyLabel(config.difficulty)}</span>
                </div>
              </motion.div>
              <motion.button
                onClick={handleSubmit}
                className="w-full py-3 px-6 rounded-lg font-medium bg-gray-900 hover:bg-gray-800 text-white transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Create Interview
              </motion.button>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl p-8 max-w-md w-full border border-gray-200 shadow-sm"
        >
          <div className="flex flex-col items-center justify-center">
            <motion.svg
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="h-10 w-10 text-gray-900 mb-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
            </motion.svg>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-gray-900 font-medium mb-2"
            >
              {loadingMsg}
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-sm text-gray-500"
            >
              This may take a few seconds the first time.
            </motion.div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full p-4">
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, height: "auto" }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: "auto" }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 30,
          duration: 0.4 
        }}
        className="bg-white rounded-2xl p-6 max-w-md w-full border border-gray-200 shadow-sm overflow-hidden"
      >
        <motion.div
          key={`content-${currentStep}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {/* Progress Indicator */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-6"
          >
            <div className="flex items-center space-x-2">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                      index <= currentStep
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {index < currentStep ? <Check size={14} /> : index + 1}
                  </motion.div>
                  {index < steps.length - 1 && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: index < currentStep ? 32 : 8 }}
                      className={`h-1 mx-2 ${
                        index < currentStep ? 'bg-gray-900' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>

          {/* Navigation */}
          {currentStep > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6"
            >
              <button
                onClick={goBack}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ChevronLeft size={16} className="mr-1" />
                Back
              </button>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default InterviewSetup;
