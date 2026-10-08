import { Component } from "react";
import { useLocation } from "react-router-dom";

/**
 * Catches render errors below it. `resetKey` change (e.g. the route path) clears the error.
 *   <ErrorBoundary resetKey={pathname} fallback={(error, reset) => …}>…</ErrorBoundary>
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
    this.reset = this.reset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("UI error", error, info?.componentStack);
  }

  componentDidUpdate(prev) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.reset();
  }

  reset() {
    this.setState({ error: null });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (typeof this.props.fallback === "function") return this.props.fallback(error, this.reset);
    if (this.props.fallback) return this.props.fallback;
    const chunk = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(String(error?.message));
    return (
      <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-14 text-center">
        <p className="text-ui-lg font-semibold text-fg">{chunk ? "A new version is available" : "Something went wrong on this page"}</p>
        <p className="text-ui-sm text-fg-muted">{chunk ? "Reload to get the latest version." : error?.message || "Unexpected error"}</p>
        <button
          type="button"
          onClick={chunk ? () => window.location.reload() : this.reset}
          className="h-8 rounded-md border border-border-strong bg-surface px-3 text-ui-sm font-medium text-fg hover:bg-surface-hover"
        >
          {chunk ? "Reload" : "Try again"}
        </button>
      </div>
    );
  }
}

/** ErrorBoundary that resets when the route changes. */
export function RouteErrorBoundary({ children }) {
  const { pathname } = useLocation();
  return <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>;
}

export default ErrorBoundary;
