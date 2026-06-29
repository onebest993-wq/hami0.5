import React from 'react';

type RepositoryErrorBoundaryProps = {
    children: React.ReactNode;
    onClose: () => void;
};

type RepositoryErrorBoundaryState = {
    hasError: boolean;
};

export class RepositoryErrorBoundary extends React.Component<
    RepositoryErrorBoundaryProps,
    RepositoryErrorBoundaryState
> {
    state: RepositoryErrorBoundaryState = { hasError: false };

    static getDerivedStateFromError(): RepositoryErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: unknown) {
        if (import.meta.env.DEV) {
            console.error('[RepositoryErrorBoundary]', error);
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div
                    className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-6"
                    dir="rtl"
                    data-testid="repository-error-boundary"
                >
                    <div className="max-w-md text-center space-y-4">
                        <p className="text-[#E6C673] font-bold">تعذّر تحميل المستودع الذكي</p>
                        <button
                            type="button"
                            onClick={this.props.onClose}
                            className="inline-flex items-center justify-center min-h-[44px] px-4 py-2 rounded-xl bg-white/10 text-white touch-manipulation"
                        >
                            إغلاق
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
