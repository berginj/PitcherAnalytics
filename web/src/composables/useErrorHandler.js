/**
 * Error handling composable
 * Provides consistent error handling across components
 */

import { ref } from "vue";

/**
 * Creates an error handler with state management
 * @returns {{ error: Ref<string>, clearError: Function, handleError: Function }}
 */
export function useErrorHandler() {
  const error = ref("");

  /**
   * Clears the current error
   */
  function clearError() {
    error.value = "";
  }

  /**
   * Handles an error and sets the error message
   * @param {Error|string} err - Error object or message
   * @param {string} fallbackMessage - Fallback message if error doesn't have a message
   */
  function handleError(err, fallbackMessage = "An error occurred") {
    if (err instanceof Error) {
      error.value = err.message || fallbackMessage;
    } else if (typeof err === "string") {
      error.value = err;
    } else {
      error.value = fallbackMessage;
    }

    // Log to console for debugging
    console.error("Error:", err);
  }

  return {
    error,
    clearError,
    handleError
  };
}

/**
 * Wraps an async function with error handling
 * @param {Function} fn - Async function to wrap
 * @param {Function} errorHandler - Error handler function
 * @returns {Function} Wrapped function
 */
export function withErrorHandling(fn, errorHandler) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      errorHandler(error);
      throw error; // Re-throw to allow caller to handle if needed
    }
  };
}
