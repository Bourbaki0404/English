/**
 * Unified date formatting utilities
 */

export interface DateFormatOptions {
  showTime?: boolean;
  showSeconds?: boolean;
  locale?: string;
  hour12?: boolean;
}

/**
 * Format a date with consistent styling across the application
 * @param date - The date to format
 * @param options - Formatting options
 * @returns Formatted date string
 */
export function formatDate(date: Date, options: DateFormatOptions = {}): string {
  const {
    showTime = true,
    showSeconds = false,
    locale,
    hour12 = true,
  } = options;

  const formatOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  };

  if (showTime) {
    formatOptions.hour = "numeric";
    formatOptions.minute = "2-digit";
    formatOptions.hour12 = hour12;

    if (showSeconds) {
      formatOptions.second = "2-digit";
    }
  }

  return date.toLocaleString(locale, formatOptions);
}

/**
 * Format a date for quiz display (with time, precise to minute)
 */
export function formatQuizDate(date: Date): string {
  return formatDate(date, { showTime: true });
}

/**
 * Format a date for document display (with time, precise to minute)
 */
export function formatDocumentDate(date: Date): string {
  return formatDate(date, { showTime: true });
}

/**
 * Format a date for general display (date only)
 */
export function formatDateOnly(date: Date): string {
  return formatDate(date, { showTime: false });
}

/**
 * Format a date with full precision (including seconds)
 */
export function formatFullDate(date: Date): string {
  return formatDate(date, { showTime: true, showSeconds: true });
}
