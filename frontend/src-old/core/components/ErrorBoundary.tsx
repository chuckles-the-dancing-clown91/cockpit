import React, { Component, ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/core/components/ui/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * ErrorBoundary catches React errors and displays a fallback UI
 * Logs errors to backend for debugging
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log error to backend
    this.logErrorToBackend(error, errorInfo);
  }

  async logErrorToBackend(error: Error, errorInfo: React.ErrorInfo) {
    try {
      await invoke('log_frontend_error', {
        message: error.message,
        stack: error.stack || '',
        componentStack: errorInfo.componentStack || '',
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to log error to backend:', err);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] p-6">
          <div className="max-w-2xl w-full">
            <div className="bg-[var(--color-surface)] border border-red-500/20 rounded-lg p-8 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-red-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                  Something went wrong
                </h2>
              </div>

              <p className="text-[var(--color-text-secondary)] mb-4">
                The application encountered an unexpected error. The error has been logged.
              </p>

              {this.state.error && (
                <details className="mb-4">
                  <summary className="cursor-pointer text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] mb-2">
                    Error Details
                  </summary>
                  <div className="bg-black/20 rounded p-4 text-xs font-mono overflow-auto max-h-64">
                    <div className="text-red-400 mb-2">{this.state.error.message}</div>
                    {this.state.error.stack && (
                      <pre className="text-[var(--color-text-secondary)] whitespace-pre-wrap">
                        {this.state.error.stack}
                      </pre>
                    )}
                  </div>
                </details>
              )}

              <div className="flex gap-3">
                <Button onClick={this.handleReset} variant="outline">
                  Try Again
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                >
                  Reload Application
                </Button>
              </div>

              <p className="text-xs text-[var(--color-text-secondary)] mt-4">
                If this problem persists, please check the application logs for more details.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Lightweight error fallback for smaller components
 */
export function ErrorFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-red-400 mb-1">Error</h3>
          <p className="text-xs text-[var(--color-text-secondary)]">{error.message}</p>
          <button
            onClick={resetError}
            className="text-xs text-[var(--color-accent)] hover:underline mt-2"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
