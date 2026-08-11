/**
 * ErrorBoundary — wraps the app to catch unhandled render errors.
 *
 * Provides a clean abstraction so external services like Sentry can be
 * connected without changing call sites:
 *   reportError(error, info) — override this to forward to Sentry etc.
 */
import React from "react";

export function reportError(error: Error, info?: React.ErrorInfo): void {
  // TODO: wire to Sentry or similar before production launch
  // e.g. Sentry.captureException(error, { extra: info });
  console.error("[Daymark error boundary]", error, info?.componentStack);
}

interface State {
  hasError: boolean;
  message: string;
}

interface Props {
  children: React.ReactNode;
  /** Slot to render instead of the default error card */
  fallback?: React.ReactNode;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message ?? "Something went wrong." };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    reportError(error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="min-h-[100dvh] bg-[#FFF9F5] flex flex-col items-center justify-center px-6 text-center">
        <div className="mb-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-primary/20" />
          </div>
        </div>
        <h1 className="text-xl font-extrabold text-foreground mb-2">Something went sideways</h1>
        <p className="text-sm text-muted-foreground mb-6 max-w-[260px] leading-relaxed">
          Daymark hit an unexpected error. Your memories are safe.
        </p>
        <button
          onClick={this.handleRetry}
          className="h-11 px-6 bg-primary text-white rounded-full text-sm font-bold active:scale-95 transition-all"
        >
          Try again
        </button>
        <button
          onClick={() => window.location.replace("/")}
          className="mt-3 text-xs text-muted-foreground underline"
        >
          Go to home
        </button>
      </div>
    );
  }
}

/**
 * Lightweight section-level error boundary — wraps a single widget/card.
 * Renders an inline fallback instead of a full-page error.
 */
export function SectionErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="rounded-2xl border border-border/40 bg-white/60 p-4 text-center">
          <p className="text-xs text-muted-foreground">
            This section couldn't load. <button className="text-primary underline" onClick={() => window.location.reload()}>Refresh</button>
          </p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
