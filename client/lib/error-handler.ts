import { toast } from "@/hooks/use-toast";

export interface ErrorDetails {
  title: string;
  description: string;
  variant?: "default" | "destructive";
}

/**
 * Centralized error handler that shows appropriate toast notifications
 * for different types of errors, especially HTTP and network issues
 */
export class ErrorHandler {
  /**
   * Handle and display errors with appropriate user-friendly messages
   */
  static handle(error: unknown, context?: string): void {
    const errorDetails = this.parseError(error, context);

    toast({
      title: errorDetails.title,
      description: errorDetails.description,
      variant: "destructive", // Always use destructive (red) for errors
    });

    // Also log to console for debugging
    console.error(`Error in ${context || "application"}:`, error);
  }

  /**
   * Parse different error types and return user-friendly messages
   */
  private static parseError(error: unknown, context?: string): ErrorDetails {
    // Handle Error objects
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      // Network connectivity issues
      if (
        message.includes("network error") ||
        message.includes("unable to connect")
      ) {
        return {
          title: "Connection Error",
          description: "Check your internet connection and try again.",
          variant: "destructive",
        };
      }

      // API key issues
      if (message.includes("api key")) {
        return {
          title: "API Key Required",
          description: "Check your API key in settings.",
          variant: "destructive",
        };
      }

      // Gemini API specific errors
      if (message.includes("user location is not supported")) {
        return {
          title: "Region Restricted",
          description:
            "AI service not available in your region. Try using a VPN.",
          variant: "destructive",
        };
      }

      // HTTP errors
      if (message.includes("http")) {
        const statusMatch = message.match(/http (\d+)/i);
        const status = statusMatch ? statusMatch[1] : "unknown";

        return {
          title: "Server Error",
          description: `Server error (${status}). Try again later.`,
          variant: "destructive",
        };
      }

      // Rate limiting
      if (message.includes("rate limit") || message.includes("quota")) {
        return {
          title: "Too Many Requests",
          description: "Wait a moment before trying again.",
          variant: "destructive",
        };
      }

      // Timeout errors
      if (message.includes("timeout")) {
        return {
          title: "Request Timeout",
          description: "Request took too long. Try again.",
          variant: "destructive",
        };
      }

      // JSON parsing errors
      if (message.includes("json") || message.includes("parse")) {
        return {
          title: "Data Error",
          description: "Unable to process response. Try again.",
          variant: "destructive",
        };
      }

      // Generic error with the actual message
      return {
        title: context ? `${context} Error` : "Error",
        description: error.message,
        variant: "destructive",
      };
    }

    // Handle fetch errors (TypeError)
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return {
        title: "Connection Error",
        description: "Check your internet connection.",
        variant: "destructive",
      };
    }

    // Handle string errors
    if (typeof error === "string") {
      return {
        title: context ? `${context} Error` : "Error",
        description: error,
        variant: "destructive",
      };
    }

    // Fallback for unknown error types
    return {
      title: "Error",
      description: "Something went wrong. Try again.",
      variant: "destructive",
    };
  }

  /**
   * Handle network-specific errors with retry suggestions
   */
  static handleNetworkError(error: unknown, context?: string): void {
    const errorDetails: ErrorDetails = {
      title: "🚨 Network Error",
      description:
        "Unable to connect to the AI service. Please check your internet connection and try again.",
      variant: "destructive",
    };

    // If it's a specific API error, provide more details
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      if (message.includes("user location is not supported")) {
        errorDetails.title = "Service Unavailable";
        errorDetails.description =
          "The AI service is not available in your region. Consider using a VPN or contact support for assistance.";
      } else if (message.includes("api key")) {
        errorDetails.title = "Configuration Error";
        errorDetails.description =
          "Please check your API key in the settings and try again.";
      }
    }

    toast(errorDetails);
    console.error(`Network error in ${context || "application"}:`, error);
  }

  /**
   * Handle API-specific errors with contextual messages
   */
  static handleApiError(error: unknown, apiName?: string): void {
    const contextName = apiName || "API";

    const errorDetails: ErrorDetails = {
      title: `🚨 ${contextName} Error`,
      description: "Unable to process your request. Please try again.",
      variant: "destructive",
    };

    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      if (message.includes("rate limit") || message.includes("quota")) {
        errorDetails.description =
          "Rate limit exceeded. Please wait a moment before trying again.";
      } else if (
        message.includes("unauthorized") ||
        message.includes("forbidden")
      ) {
        errorDetails.description =
          "Authentication failed. Please check your API credentials.";
      } else if (message.includes("not found")) {
        errorDetails.description = "The requested resource was not found.";
      } else {
        errorDetails.description = error.message;
      }
    }

    toast(errorDetails);
    console.error(`API error in ${apiName || "service"}:`, error);
  }

  /**
   * Show a warning toast (non-blocking)
   */
  static showWarning(title: string, description: string): void {
    toast({
      title,
      description,
      variant: "default", // Use default variant for warnings
    });
  }

  /**
   * Show a success toast
   */
  static showSuccess(title: string, description?: string): void {
    toast({
      title,
      description,
      variant: "default",
    });
  }
}
