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

  handleCopy = (): void => {
    const text = this.state.error?.message ?? 'Unknown error';
    navigator.clipboard.writeText(text).catch(() => {});
  };

  override render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-bg-primary p-6 text-text-primary">
          <p className="text-sm font-semibold text-destructive">Something went wrong</p>
          <pre className="max-w-lg overflow-auto rounded border border-border bg-bg-secondary p-3 text-xs text-text-muted">
            {this.state.error?.message ?? 'Unknown error'}
          </pre>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-md border border-border bg-bg-primary px-4 py-1.5 text-sm text-text-primary transition-colors hover:bg-bg-secondary"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try again
            </button>
            <button
              type="button"
              className="rounded-md border border-border bg-bg-primary px-4 py-1.5 text-sm text-text-muted transition-colors hover:bg-bg-secondary"
              onClick={this.handleCopy}
            >
              Copy error
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
