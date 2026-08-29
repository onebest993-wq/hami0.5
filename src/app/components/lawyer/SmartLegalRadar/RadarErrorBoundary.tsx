import React, { Component, type ErrorInfo, type ReactNode } from 'react';

type RadarErrorBoundaryProps = {
    onBack: () => void;
    children: ReactNode;
};

type RadarErrorBoundaryState = {
    hasError: boolean;
};

export class RadarErrorBoundary extends Component<RadarErrorBoundaryProps, RadarErrorBoundaryState> {
    state: RadarErrorBoundaryState = { hasError: false };

    static getDerivedStateFromError(): RadarErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        void import('@/app/observability/sentryClient').then((m) => {
            void m.sentryCaptureException(error, {
                area: 'radar-error-boundary',
                componentStack: errorInfo.componentStack,
            });
        });
    }

    render(): ReactNode {
        if (!this.state.hasError) return this.props.children;

        return (
            <div
                className="flex flex-col h-full min-h-[100dvh] items-center justify-center px-6 bg-[#0A0F1C] text-white"
                role="alertdialog"
                aria-label="خطأ في رادار المواعيد"
                data-testid="radar-error-fallback"
            >
                <p className="text-white/70 text-sm max-w-xs text-center leading-relaxed mb-6">
                    تعذّر تحميل رادار المواعيد. ارجع للرئيسية وحاول مرة أخرى.
                </p>
                <button
                    type="button"
                    onClick={this.props.onBack}
                    data-testid="radar-error-back"
                    className="min-h-[44px] px-8 rounded-2xl bg-[#E6C673]/12 text-[#E6C673] border border-[#E6C673]/25 active:bg-[#E6C673]/20 transition-colors text-sm font-semibold"
                >
                    رجوع
                </button>
            </div>
        );
    }
}
