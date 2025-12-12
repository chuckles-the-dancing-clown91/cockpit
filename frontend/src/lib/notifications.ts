import { toast } from 'sonner';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * Enhanced toast notifications with consistent styling and behavior
 * 
 * Built on Sonner v2 for improved performance and accessibility.
 * All notifications are automatically positioned and dismissable.
 * 
 * @example
 * notify.success('Article saved', 'Your changes have been saved successfully')
 * notify.error('Failed to sync', 'Check your API key settings')
 */
export const notify = {
  success: (message: string, description?: string) => {
    toast.success(message, {
      description,
      duration: 4000,
    });
  },

  error: (message: string, description?: string) => {
    toast.error(message, {
      description,
      duration: 6000,
    });
  },

  warning: (message: string, description?: string) => {
    toast.warning(message, {
      description,
      duration: 5000,
    });
  },

  info: (message: string, description?: string) => {
    toast.info(message, {
      description,
      duration: 4000,
    });
  },

  loading: (message: string) => {
    return toast.loading(message);
  },

  dismiss: (toastId?: string | number) => {
    toast.dismiss(toastId);
  },

  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    }
  ) => {
    return toast.promise(promise, messages);
  },
};

/**
 * Format error for display
 */
export function formatError(error: unknown): { title: string; description?: string } {
  if (error instanceof Error) {
    return {
      title: 'Error',
      description: error.message,
    };
  }

  if (typeof error === 'string') {
    return {
      title: 'Error',
      description: error,
    };
  }

  return {
    title: 'Error',
    description: 'An unexpected error occurred',
  };
}

/**
 * Show error toast with formatted message
 */
export function showError(error: unknown, fallbackMessage?: string) {
  const formatted = formatError(error);
  notify.error(
    formatted.title,
    formatted.description || fallbackMessage || 'Please try again'
  );
}

/**
 * Show network error with retry suggestion
 */
export function showNetworkError() {
  notify.error(
    'Network Error',
    'Please check your connection and try again'
  );
}

/**
 * Show validation error
 */
export function showValidationError(message: string) {
  notify.warning('Validation Error', message);
}
