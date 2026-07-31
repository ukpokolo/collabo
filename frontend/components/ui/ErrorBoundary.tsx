'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorState } from '@/components/ui/ErrorState';

interface Props {
  children: ReactNode;
  title?: string;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  error: Error | null;
}

/**
 * Isolates a render failure to one region instead of blanking the whole page.
 * Must be a class component: React exposes no hook equivalent.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
    if (process.env.NODE_ENV !== 'production') {
      console.error('ErrorBoundary caught:', error, info.componentStack);
    }
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return (
      <ErrorState
        title={this.props.title ?? 'This section failed to load'}
        error={error}
        onRetry={this.reset}
        className="m-3 sm:m-5"
      />
    );
  }
}
