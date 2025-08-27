import React from 'react';
import { Button } from './ui/button';
import { getLLMService } from '../services/llmService';
import { ErrorHandler } from '@/lib/error-handler';

interface AppSettings {
  general: { languageLevel: string };
  llm: { apiKey: string; provider: string; model: string };
}

/**
 * Test component to verify LLM error handling fixes
 * This component can be temporarily added to test the fixed error handling
 */
export const LLMErrorTest: React.FC = () => {
  const [isLoading, setIsLoading] = React.useState(false);

  // Mock settings for testing
  const testSettings: AppSettings = {
    general: { languageLevel: 'cet4' },
    llm: {
      apiKey: 'invalid-key-for-testing', // Intentionally invalid for testing
      provider: 'gemini',
      model: 'gemini-2.0-flash-exp'
    }
  };

  const testLLMError = async () => {
    setIsLoading(true);
    try {
      const llmService = getLLMService(testSettings);
      await llmService.chatWithAI("Test message to trigger error");
    } catch (error) {
      // The error should now be properly handled by our ErrorHandler
      ErrorHandler.handle(error, "LLM Test");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <h3 className="text-sm font-semibold mb-2">LLM Error Test</h3>
      <p className="text-xs text-gray-600 mb-3">
        Test the fixed "body stream already read" error
      </p>
      <Button
        onClick={testLLMError}
        disabled={isLoading}
        size="sm"
        variant="outline"
      >
        {isLoading ? "Testing..." : "Test LLM Error"}
      </Button>
      <p className="text-xs text-gray-500 mt-2">
        Should show proper error toast without console errors
      </p>
    </div>
  );
};

export default LLMErrorTest;
