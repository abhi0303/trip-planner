import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

/**
 * A render crash should cost the user one section, not the whole screen.
 * React has no hook equivalent, so this stays a class.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Render error:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-surface text-brand ring-1 ring-inset ring-line-soft lit">
          <Icon name="compass" size={24} />
        </span>
        <h1 className="mb-1 text-lg font-semibold">This page hit a snag</h1>
        <p className="mb-4 max-w-sm text-sm text-ink-soft">
          Something went wrong rendering it. Reloading usually clears it.
        </p>
        <div className="flex gap-2">
          <Button onClick={() => window.location.reload()}>Reload</Button>
          <Button variant="outline" to="/">Go home</Button>
        </div>
      </div>
    );
  }
}
