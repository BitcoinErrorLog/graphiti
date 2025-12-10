/**
 * @fileoverview Onboarding component for first-time users.
 * 
 * Provides a guided tour of key features when the extension is first installed.
 */

import { useState, useEffect } from 'react';
import { storage } from '../../utils/storage';
import { getStorageValue } from '../../utils/storage-helpers';
import { STORAGE_CONSTANTS } from '../../utils/constants';

interface OnboardingStep {
  title: string;
  description: string;
  icon: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: 'Welcome to Graphiti!',
    description: 'Draw, annotate, and tag web pages with the decentralized Pubky network.',
    icon: '🎨',
  },
  {
    title: 'Drawing Mode',
    description: 'Press Ctrl+Shift+D (or Cmd+Shift+D on Mac) to draw graffiti on any page.',
    icon: '✏️',
  },
  {
    title: 'Text Annotations',
    description: 'Select any text and click "Add Annotation" to add comments.',
    icon: '💬',
  },
  {
    title: 'Bookmarks & Tags',
    description: 'Bookmark pages and add tags to organize your content.',
    icon: '🔖',
  },
  {
    title: 'Social Feed',
    description: 'Open the side panel to see posts and annotations about the current page.',
    icon: '📱',
  },
];

function Onboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const settings = await getStorageValue<Record<string, any>>(STORAGE_CONSTANTS.KEYS.SETTINGS, {});
      const hasSeenOnboarding = settings?.hasSeenOnboarding || false;
      if (!hasSeenOnboarding) {
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error('Failed to check onboarding status', error);
    }
  };

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    try {
      await storage.setSetting('hasSeenOnboarding', true);
      setShowOnboarding(false);
    } catch (error) {
      console.error('Failed to save onboarding status', error);
      setShowOnboarding(false);
    }
  };

  if (!showOnboarding) {
    return null;
  }

  const step = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1F1F1F] border border-[#3F3F3F] rounded-lg p-6 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">{step.icon}</div>
          <h2 className="text-2xl font-bold text-white mb-2">{step.title}</h2>
          <p className="text-gray-400">{step.description}</p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-6">
          {ONBOARDING_STEPS.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${
                index === currentStep
                  ? 'bg-blue-500 w-8'
                  : index < currentStep
                  ? 'bg-blue-500/50 w-2'
                  : 'bg-gray-600 w-2'
              }`}
            />
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSkip}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
          >
            Skip
          </button>
          <button
            onClick={handleNext}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg transition"
          >
            {isLastStep ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Onboarding;

