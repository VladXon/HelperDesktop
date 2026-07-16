import * as React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  override render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center gap-2 bg-bg-primary p-4 text-text-primary">
          <div className="text-lg font-semibold text-destructive">Something went wrong</div>
          <pre className="max-w-xl overflow-auto rounded border border-border bg-bg-secondary p-3 text-xs text-text-muted">
            {this.state.error?.message ?? 'Unknown error'}
          </pre>
          <button
            type="button"
            className="rounded-md border border-border bg-bg-primary px-4 py-1 text-sm text-text-primary hover:bg-bg-secondary"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
