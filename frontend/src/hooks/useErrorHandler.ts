import { useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

export type ErrorContext = {
  component?: string;
  action?: string;
  metadata?: Record<string, unknown>;
};

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Centralized error handling hook
 * Provides utilities for logging, displaying, and reporting errors
 */
export function useErrorHandler() {
  /**
   * Log error to backend
   */
  const logError = useCallback(
    async (
      error: Error | string,
      context?: ErrorContext,
      severity: ErrorSeverity = 'error'
    ) => {
      const errorMessage = typeof error === 'string' ? error : error.message;
      const errorStack = typeof error === 'string' ? '' : error.stack || '';

      try {
        await invoke('log_frontend_error', {
          message: errorMessage,
          stack: errorStack,
          componentStack: context?.component || '',
          action: context?.action || '',
          metadata: JSON.stringify(context?.metadata || {}),
          severity,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Failed to log error to backend:', err);
      }

      // Also log to console
      console.error('[Error]', errorMessage, context);
    },
    []
  );

  /**
   * Handle Tauri command errors
   */
  const handleTauriError = useCallback(
    (error: unknown, context?: ErrorContext) => {
      const err = error as Error;
      logError(err, {
        ...context,
        action: context?.action || 'tauri_command',
      });

      // Return user-friendly message
      return getTauriErrorMessage(err);
    },
    [logError]
  );

  /**
   * Handle network/API errors
   */
  const handleApiError = useCallback(
    (error: unknown, context?: ErrorContext) => {
      const err = error as Error;
      logError(err, {
        ...context,
        action: context?.action || 'api_request',
      });

      // Return user-friendly message
      return getApiErrorMessage(err);
    },
    [logError]
  );

  /**
   * Handle validation errors
   */
  const handleValidationError = useCallback(
    (message: string, context?: ErrorContext) => {
      logError(message, {
        ...context,
        action: context?.action || 'validation',
      }, 'warning');

      return message;
    },
    [logError]
  );

  /**
   * Create error handler for async operations
   */
  const withErrorHandler = useCallback(
    <T,>(
      asyncFn: () => Promise<T>,
      context?: ErrorContext,
      onError?: (error: Error) => void
    ): Promise<T | null> => {
      return asyncFn().catch((error: Error) => {
        handleTauriError(error, context);
        onError?.(error);
        return null;
      });
    },
    [handleTauriError]
  );

  return {
    logError,
    handleTauriError,
    handleApiError,
    handleValidationError,
    withErrorHandler,
  };
}

/**
 * Get user-friendly error message for Tauri errors
 */
function getTauriErrorMessage(error: Error): string {
  const message = error.message.toLowerCase();

  if (message.includes('connection')) {
    return 'Unable to connect to the backend. Please check if the application is running correctly.';
  }

  if (message.includes('timeout')) {
    return 'The operation took too long to complete. Please try again.';
  }

  if (message.includes('permission')) {
    return 'Permission denied. Please check application permissions.';
  }

  if (message.includes('not found')) {
    return 'The requested resource was not found.';
  }

  if (message.includes('database')) {
    return 'A database error occurred. Please try again or restart the application.';
  }

  // Default message
  return error.message || 'An unexpected error occurred. Please try again.';
}

/**
 * Get user-friendly error message for API errors
 */
function getApiErrorMessage(error: Error): string {
  const message = error.message.toLowerCase();

  if (message.includes('network') || message.includes('fetch')) {
    return 'Network error. Please check your internet connection.';
  }

  if (message.includes('401') || message.includes('unauthorized')) {
    return 'Authentication failed. Please check your API credentials.';
  }

  if (message.includes('403') || message.includes('forbidden')) {
    return 'Access denied. You do not have permission to perform this action.';
  }

  if (message.includes('404')) {
    return 'Resource not found.';
  }

  if (message.includes('429') || message.includes('rate limit')) {
    return 'Too many requests. Please wait a moment and try again.';
  }

  if (message.includes('500') || message.includes('server error')) {
    return 'Server error. Please try again later.';
  }

  if (message.includes('503') || message.includes('unavailable')) {
    return 'Service temporarily unavailable. Please try again later.';
  }

  return error.message || 'An error occurred while communicating with the server.';
}

/**
 * Check if user is online
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

// React import for useOnlineStatus
import React from 'react';
