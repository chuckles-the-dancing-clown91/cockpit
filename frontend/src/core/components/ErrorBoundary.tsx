import { Component, ReactNode } from 'react';
import { Button, Flex, Heading, Text, Card } from '@radix-ui/themes';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: { componentStack?: string } | null;
}

/**
 * ErrorBoundary catches React errors and displays a fallback UI
 * Prevents entire app from crashing due to component errors
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

  componentDidCatch(error: Error, errorInfo: { componentStack?: string }) {
    this.setState({ errorInfo });
    
    // Log to console (could send to backend logging service)
    console.error('ErrorBoundary caught error:', error, errorInfo);
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
        <Flex
          align="center"
          justify="center"
          style={{
            minHeight: '100vh',
            backgroundColor: 'var(--gray-1)',
            padding: '1.5rem',
          }}
        >
          <Card style={{ maxWidth: '600px', width: '100%' }}>
            <Flex direction="column" gap="4" p="6">
              {/* Header */}
              <Flex align="center" gap="3">
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--red-3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AlertTriangle size={24} color="var(--red-9)" />
                </div>
                <Heading size="6">Something went wrong</Heading>
              </Flex>

              {/* Description */}
              <Text color="gray" size="3">
                The application encountered an unexpected error. You can try reloading the page or resetting the component.
              </Text>

              {/* Error Details */}
              {this.state.error && (
                <details>
                  <summary
                    style={{
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      color: 'var(--gray-11)',
                      marginBottom: '0.5rem',
                    }}
                  >
                    Error Details
                  </summary>
                  <div
                    style={{
                      backgroundColor: 'var(--gray-3)',
                      borderRadius: 'var(--radius-2)',
                      padding: '1rem',
                      fontSize: '0.75rem',
                      fontFamily: 'monospace',
                      overflow: 'auto',
                      maxHeight: '200px',
                    }}
                  >
                    <div style={{ color: 'var(--red-11)', marginBottom: '0.5rem' }}>
                      {this.state.error.message}
                    </div>
                    {this.state.error.stack && (
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--gray-11)' }}>
                        {this.state.error.stack}
                      </pre>
                    )}
                  </div>
                </details>
              )}

              {/* Actions */}
              <Flex gap="3" mt="2">
                <Button onClick={this.handleReset} variant="soft">
                  Try Again
                </Button>
                <Button onClick={() => window.location.reload()} variant="soft" color="gray">
                  Reload Page
                </Button>
              </Flex>

              <Text size="1" color="gray" style={{ marginTop: '0.5rem' }}>
                If this problem persists, please check the application logs.
              </Text>
            </Flex>
          </Card>
        </Flex>
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
    <Card
      style={{
        backgroundColor: 'var(--red-3)',
        border: '1px solid var(--red-6)',
      }}
    >
      <Flex align="start" gap="3" p="4">
        <div
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: 'var(--red-4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginTop: '2px',
          }}
        >
          <AlertTriangle size={12} color="var(--red-9)" />
        </div>
        <Flex direction="column" gap="2" style={{ flex: 1, minWidth: 0 }}>
          <Text size="2" weight="medium" color="red">
            Error
          </Text>
          <Text size="1" color="gray">
            {error.message}
          </Text>
          <Button size="1" variant="soft" color="red" onClick={resetError} style={{ alignSelf: 'flex-start' }}>
            Try again
          </Button>
        </Flex>
      </Flex>
    </Card>
  );
}
