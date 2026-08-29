import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { sentryCaptureException } from '@/app/observability/sentryClient';

type HomeLiteRetry = () => void;
type HomeLiteFallback = ReactNode | ((retry: HomeLiteRetry) => ReactNode);

/** Error boundary بلا lucide — لمسار HomeTab الحرج */
export class HomeLiteErrorBoundary extends Component<
    { children: ReactNode; fallback: HomeLiteFallback; source?: string },
    { hasError: boolean }
> {
    state = { hasError: false };

    static getDerivedStateFromError(): { hasError: boolean } {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: ErrorInfo): void {
        const source = this.props.source ?? 'HomeLiteErrorBoundary';
        console.error(`[${source}] render failed:`, error);
        void sentryCaptureException(error, {
            source,
            componentStack: info.componentStack?.slice(0, 2000) ?? null,
        });
    }

    private retry = (): void => {
        this.setState({ hasError: false });
    };

    render(): ReactNode {
        if (this.state.hasError) {
            const fallback = this.props.fallback;
            return typeof fallback === 'function' ? fallback(this.retry) : fallback;
        }
        return this.props.children;
    }
}

export function HomeLiteErrorFallback({
    testId,
    ariaLabel,
    message,
    onRetry,
    className,
}: {
    testId: string;
    ariaLabel: string;
    message: string;
    onRetry: () => void;
    className: string;
}): React.ReactElement {
    return (
        <div
            data-testid={testId}
            className={className}
            role="alert"
            aria-label={ariaLabel}
        >
            <p className="text-white/60 text-sm max-w-xs leading-relaxed">{message}</p>
            <button
                type="button"
                data-testid={`${testId}-retry`}
                onClick={onRetry}
                className="mt-4 min-h-[44px] px-4 text-sm text-white/70 touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/45"
            >
                إعادة المحاولة
            </button>
        </div>
    );
}
