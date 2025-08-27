// Test utilities to verify error handling functionality
// This file demonstrates how different errors are handled

import { ErrorHandler } from './error-handler';

// Example test scenarios that can be triggered in the app
export const testErrorScenarios = {
  // Network error simulation
  networkError: () => {
    const error = new TypeError('fetch failed');
    ErrorHandler.handle(error, 'Network Test');
  },

  // API key error simulation
  apiKeyError: () => {
    const error = new Error('API key not configured');
    ErrorHandler.handle(error, 'API Key Test');
  },

  // Geographic restriction error (like the one mentioned in user context)
  geoRestrictionError: () => {
    const error = new Error('User location is not supported for the API use');
    ErrorHandler.handle(error, 'Geographic Test');
  },

  // Rate limit error simulation
  rateLimitError: () => {
    const error = new Error('Rate limit exceeded. Please try again later.');
    ErrorHandler.handle(error, 'Rate Limit Test');
  },

  // HTTP error simulation
  httpError: () => {
    const error = new Error('HTTP 500: Internal Server Error');
    ErrorHandler.handle(error, 'HTTP Test');
  },

  // JSON parsing error simulation
  jsonError: () => {
    const error = new Error('Failed to parse JSON response');
    ErrorHandler.handle(error, 'JSON Test');
  },

  // Warning message test
  warningTest: () => {
    ErrorHandler.showWarning('Test Warning', 'This is a test warning message.');
  },

  // Success message test
  successTest: () => {
    ErrorHandler.showSuccess('Test Success', 'This is a test success message.');
  }
};

// Function to test all error scenarios (for debugging)
export const runAllErrorTests = () => {
  console.log('Running error handling tests...');
  
  // Run tests with delays to see each toast
  Object.entries(testErrorScenarios).forEach(([name, testFn], index) => {
    setTimeout(() => {
      console.log(`Testing: ${name}`);
      testFn();
    }, index * 2000); // 2-second delay between tests
  });
};
