// frontend/src/lib/errorUtils.ts

/**
 * Extracts a user-friendly error message from various error types.
 * Prioritizes backend error messages from axios responses over generic Error messages.
 * 
 * @param error - The error object (axios error, Error, or unknown)
 * @param fallback - Default message if no specific error message can be extracted
 * @returns A user-friendly error message string
 */
export function extractErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null) {
    const axiosError = error as any;
    // Priority order: error field, message field, details field, Error.message, fallback
    return axiosError?.response?.data?.error 
      || axiosError?.response?.data?.message 
      || axiosError?.response?.data?.details
      || (error instanceof Error ? error.message : fallback);
  }
  return fallback;
}

