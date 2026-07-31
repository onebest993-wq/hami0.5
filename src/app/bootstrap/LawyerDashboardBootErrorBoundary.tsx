import React, { Component, type ErrorInfo, type ReactNode } from 'react';

type LawyerDashboardBootErrorBoundaryProps = {
    /** يُزيد عند إعادة المحاولة لإعادة تركيب الحدّ ومسح حالة الخطأ */
    bootKey: number;
    onReset: () => void;
    children: ReactNode;
};

type LawyerDashboardBootErrorBoundaryState = {
    hasError: boolean;
    error: Error | null;
};

class LawyerDashboardBootErrorBoundaryInner extends Component<
    LawyerDashboardBootErrorBoundaryProps,
    LawyerDashboardBootErrorBoundaryState
> {
    state: LawyerDashboardBootErrorBoundaryState = { hasError: false, error: null };

    static getDerivedStateFromError(error: Error): Partial<LawyerDashboardBootErrorBoundaryState> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        console.error('[LawyerDashboardBoot] load/render failed:', error);
        console.error('[LawyerDashboardBoot] component stack:', errorInfo.componentStack);
    }

    private handleRetry = (): void => {
        this.setState({ hasError: false, error: null });
        this.props.onReset();
    };

    render(): ReactNode {
        if (this.state.hasError) {
            const detailMessage = this.state.error?.message ?? null;

            return (
                <div
                    className="min-h-screen w-full flex flex-col items-center justify-center px-6 bg-[#000000] text-white"
                    dir="rtl"
                    role="alertdialog"
                    aria-label="خطأ في تحميل لوحة المحامي"
                    data-testid="lawyer-dashboard-boot-error"
                    data-boot-error-message={detailMessage ?? undefined}
                    data-boot-error-stack={this.state.error?.stack?.slice(0, 1500) ?? undefined}
                >
                    <p className="text-white/70 text-sm max-w-xs text-center leading-relaxed mb-6">
                        تعذّر تحميل لوحة المحامي. يمكنك المحاولة مجدداً دون إعادة تحميل الصفحة
                        بالكامل.
                    </p>
                    {import.meta.env.DEV && detailMessage ? (
                        <pre
                            className="text-[11px] text-red-300/90 max-w-sm w-full mb-4 p-3 rounded-lg bg-white/5 border border-white/10 overflow-auto text-left direction-ltr whitespace-pre-wrap"
                            data-testid="lawyer-dashboard-boot-error-detail"
                        >
                            {detailMessage}
                        </pre>
                    ) : null}
                    <button
                        type="button"
                        onClick={this.handleRetry}
                        data-testid="lawyer-dashboard-boot-error-retry"
                        className="min-h-[48px] px-8 rounded-2xl bg-[#E6C673]/12 text-[#E6C673] border border-[#E6C673]/25 active:bg-[#E6C673]/20 transition-colors text-sm font-bold"
                    >
                        إعادة المحاولة
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export function LawyerDashboardBootErrorBoundary({
    bootKey,
    onReset,
    children,
}: LawyerDashboardBootErrorBoundaryProps) {
    return (
        <LawyerDashboardBootErrorBoundaryInner key={bootKey} bootKey={bootKey} onReset={onReset}>
            {children}
        </LawyerDashboardBootErrorBoundaryInner>
    );
}
