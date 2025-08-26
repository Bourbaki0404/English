import React, { useState } from 'react';
import { X, Settings, User, Bot, ChevronRight, ChevronLeft, Palette, HelpCircle, FileText, Zap, PenTool } from 'lucide-react';
import { Button } from './ui/button';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

interface AppSettings {
  general: {
    languageLevel: string;
  };
  llm: {
    apiKey: string;
    provider: string;
    model: string;
  };
}

type SettingsView = 'main' | 'general' | 'llm' | 'quiz' | 'editor' | 'appearance' | 'about';

interface SettingsOption {
  id: SettingsView;
  title: string;
  icon: React.ReactNode;
  description?: string;
}

const languageLevels = [
  { value: 'junior', label: 'Junior School' },
  { value: 'high', label: 'High School' },
  { value: 'cet4', label: 'CET-4' },
  { value: 'cet6', label: 'CET-6' },
  { value: 'ielts', label: 'IELTS' },
  { value: 'toefl', label: 'TOEFL' },
  { value: 'sat', label: 'SAT' },
  { value: 'advanced', label: 'Advanced' }
];

const settingsOptions: SettingsOption[] = [
  {
    id: 'general',
    title: 'General',
    icon: <User className="w-5 h-5" />,
    description: 'Language level and basic preferences'
  },
  {
    id: 'llm',
    title: 'AI Configuration',
    icon: <Bot className="w-5 h-5" />,
    description: 'API keys and AI model settings'
  },
  {
    id: 'appearance',
    title: 'Appearance',
    icon: <Palette className="w-5 h-5" />,
    description: 'Theme and display settings'
  },
  {
    id: 'about',
    title: 'About',
    icon: <HelpCircle className="w-5 h-5" />,
    description: 'App information and help'
  }
];

export default function SettingsModal({ isOpen, onClose, settings, onSettingsChange }: SettingsModalProps) {
  const [currentView, setCurrentView] = useState<SettingsView>('main');

  if (!isOpen) return null;

  const updateSettings = (section: keyof AppSettings, key: string, value: string) => {
    const newSettings = {
      ...settings,
      [section]: {
        ...settings[section],
        [key]: value
      }
    };
    onSettingsChange(newSettings);
  };

  const getViewTitle = (view: SettingsView): string => {
    const option = settingsOptions.find(opt => opt.id === view);
    return option?.title || 'Settings';
  };

  const renderMainOptions = () => (
    <div className="p-4">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Options</h2>
      <div className="space-y-2">
        {settingsOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => setCurrentView(option.id)}
            className="w-full flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 transition-colors text-left border border-gray-100"
          >
            <div className="flex items-center space-x-3">
              <div className="text-gray-600">
                {option.icon}
              </div>
              <div>
                <div className="font-medium text-gray-900">{option.title}</div>
                {option.description && (
                  <div className="text-sm text-gray-500">{option.description}</div>
                )}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        ))}
      </div>
    </div>
  );

  const renderGeneralSettings = () => (
    <div className="p-4">
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Language Level
          </label>
          <p className="text-sm text-gray-500 mb-3">
            Select your current English proficiency level. This helps generate appropriate quiz content.
          </p>
          <select
            value={settings.general.languageLevel}
            onChange={(e) => updateSettings('general', 'languageLevel', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select your level...</option>
            {languageLevels.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );

  const renderLLMSettings = () => (
    <div className="p-4">
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Provider
          </label>
          <p className="text-sm text-gray-500 mb-3">
            Select your LLM provider for quiz generation.
          </p>
          <select
            value={settings.llm.provider}
            onChange={(e) => updateSettings('llm', 'provider', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="gemini">Google Gemini</option>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic Claude</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Model
          </label>
          <p className="text-sm text-gray-500 mb-3">
            Select the specific model to use for generation.
          </p>
          <select
            value={settings.llm.model}
            onChange={(e) => updateSettings('llm', 'model', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {settings.llm.provider === 'gemini' && (
              <>
                <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Experimental)</option>
                <option value="gemini-1.5-flash-latest">Gemini 1.5 Flash (Latest)</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                <option value="gemini-1.5-pro-latest">Gemini 1.5 Pro (Latest)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                <option value="gemini-pro">Gemini Pro</option>
              </>
            )}
            {settings.llm.provider === 'openai' && (
              <>
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              </>
            )}
            {settings.llm.provider === 'anthropic' && (
              <>
                <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                <option value="claude-3-haiku">Claude 3 Haiku</option>
              </>
            )}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            API Key
          </label>
          <p className="text-sm text-gray-500 mb-3">
            Enter your API key for the selected provider. This will be stored securely.
          </p>
          <input
            type="password"
            value={settings.llm.apiKey}
            onChange={(e) => updateSettings('llm', 'apiKey', e.target.value)}
            placeholder="Enter your API key..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {settings.llm.apiKey && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-700">✓ API key configured</p>
            </div>
          )}
        </div>

        {settings.llm.provider === 'gemini' && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Getting Started with Gemini</h4>
            <p className="text-sm text-blue-700">
              Get your free API key from{' '}
              <a
                href="https://makersuite.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-blue-800"
              >
                Google AI Studio
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderQuizSettings = () => (
    <div className="p-4">
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Default Quiz Difficulty
          </label>
          <p className="text-sm text-gray-500 mb-3">
            Set the default difficulty level for generated quizzes.
          </p>
          <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option>Easy</option>
            <option>Medium</option>
            <option>Hard</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Question Count
          </label>
          <p className="text-sm text-gray-500 mb-3">
            Default number of questions to generate per quiz.
          </p>
          <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option>3 questions</option>
            <option>5 questions</option>
            <option>8 questions</option>
            <option>10 questions</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderEditorSettings = () => (
    <div className="p-4">
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Default Mode
          </label>
          <p className="text-sm text-gray-500 mb-3">
            Choose whether to start in edit mode or preview mode.
          </p>
          <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option>Preview Mode</option>
            <option>Edit Mode</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Auto-save
          </label>
          <p className="text-sm text-gray-500 mb-3">
            Automatically save changes while typing.
          </p>
          <div className="flex items-center space-x-3">
            <input type="checkbox" defaultChecked className="rounded" />
            <span className="text-sm text-gray-700">Enable auto-save</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAppearanceSettings = () => (
    <div className="p-4">
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Theme
          </label>
          <p className="text-sm text-gray-500 mb-3">
            Choose your preferred theme.
          </p>
          <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option>Light</option>
            <option>Dark</option>
            <option>Auto (System)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Font Size
          </label>
          <p className="text-sm text-gray-500 mb-3">
            Adjust the reading font size.
          </p>
          <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option>Small</option>
            <option>Medium</option>
            <option>Large</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderAboutSettings = () => (
    <div className="p-4">
      <div className="space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-4">📚</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">English Learning App</h3>
          <p className="text-sm text-gray-500 mb-4">Version 1.0.0</p>
        </div>
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Need Help?</h4>
            <p className="text-sm text-blue-700">
              Visit our help center for tutorials and support.
            </p>
          </div>
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <h4 className="text-sm font-medium text-green-800 mb-2">Feedback</h4>
            <p className="text-sm text-green-700">
              We'd love to hear your thoughts and suggestions!
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCurrentView = () => {
    switch (currentView) {
      case 'main':
        return renderMainOptions();
      case 'general':
        return renderGeneralSettings();
      case 'llm':
        return renderLLMSettings();
      case 'quiz':
        return renderQuizSettings();
      case 'editor':
        return renderEditorSettings();
      case 'appearance':
        return renderAppearanceSettings();
      case 'about':
        return renderAboutSettings();
      default:
        return renderMainOptions();
    }
  };

  return (
    <div className="bg-white rounded-t-xl w-full max-w-sm mx-auto h-full flex flex-col overflow-hidden shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center">
          {currentView !== 'main' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentView('main')}
              className="text-gray-500 hover:text-gray-700 mr-2 p-1"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}
          <h1 className="text-lg font-semibold text-gray-800 flex items-center">
            {currentView === 'main' && <Settings className="w-5 h-5 mr-2" />}
            {currentView === 'main' ? 'Settings' : getViewTitle(currentView)}
          </h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {renderCurrentView()}
      </div>

      {/* Footer - Only show save/cancel on secondary views */}
      {currentView !== 'main' && currentView !== 'about' && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex space-x-3">
            <Button variant="outline" onClick={() => setCurrentView('main')} className="flex-1">
              Cancel
            </Button>
            <Button onClick={() => setCurrentView('main')} className="flex-1">
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export type { AppSettings };
