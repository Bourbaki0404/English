import React from 'react';
import { Button } from './ui/button';
import { ErrorHandler } from '@/lib/error-handler';

/**
 * Mobile-optimized error testing component
 * This component can be temporarily added to test error boundaries on mobile
 */
export const MobileErrorTest: React.FC = () => {
  const testErrors = [
    {
      name: 'Network Error',
      action: () => ErrorHandler.handle(new Error('Network error: Unable to connect'), 'Test')
    },
    {
      name: 'Region Block',
      action: () => ErrorHandler.handle(new Error('User location is not supported for the API use'), 'Test')
    },
    {
      name: 'API Key',
      action: () => ErrorHandler.handle(new Error('API key not configured'), 'Test')
    },
    {
      name: 'Warning',
      action: () => ErrorHandler.showWarning('Test Warning', 'This is a mobile warning test.')
    }
  ];

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h3 className="text-sm font-semibold mb-3">Mobile Error Tests</h3>
      <div className="grid grid-cols-2 gap-2">
        {testErrors.map((test) => (
          <Button
            key={test.name}
            variant="outline"
            size="sm"
            onClick={test.action}
            className="text-xs h-8"
          >
            {test.name}
          </Button>
        ))}
      </div>
      <p className="text-xs text-gray-600 mt-2">
        Tap buttons to test mobile error notifications
      </p>
    </div>
  );
};

export default MobileErrorTest;
