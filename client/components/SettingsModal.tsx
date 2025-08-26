import React, { useState } from 'react';
import { X, Settings, User, Bot } from 'lucide-react';
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

type SettingsSection = 'general' | 'llm';

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

export default function SettingsModal({ isOpen, onClose, settings, onSettingsChange }: SettingsModalProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');

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

  const renderGeneralSettings = () => (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-6">General</h2>
      
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
    <div className="p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-6">Configure LLM</h2>
      
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

  return (
    <div className="bg-white rounded-t-xl w-full max-w-sm mx-auto h-full flex flex-col overflow-hidden shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h1 className="text-lg font-semibold text-gray-800 flex items-center">
          <Settings className="w-5 h-5 mr-2" />
          Settings
        </h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Mobile Tab Navigation */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        <button
          onClick={() => setActiveSection('general')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeSection === 'general'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <User className="w-4 h-4 inline mr-2" />
          General
        </button>

        <button
          onClick={() => setActiveSection('llm')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeSection === 'llm'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <Bot className="w-4 h-4 inline mr-2" />
          LLM Config
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeSection === 'general' && renderGeneralSettings()}
        {activeSection === 'llm' && renderLLMSettings()}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex space-x-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={onClose} className="flex-1">
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

export type { AppSettings };
