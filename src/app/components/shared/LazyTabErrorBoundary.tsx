import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw, ArrowRight } from 'lucide-react';

type LazyTabErrorBoundaryProps = {
    children: ReactNode;
    tabLabel: string;
    onBack?: () => void;
    onRetry?: () => void;
};

type LazyTabErrorBoundaryState = {
    error: Error | null;
    retryKey: number;
};

/** يمنع إعادة تحميل التطبيق بالكامل عند فشل chunk تبويب واحد */
export class LazyTabErrorBoundary extends Component<LazyTabErrorBoundaryProps, LazyTabErrorBoundaryState> {
    state: LazyTabErrorBoundaryState = { error: null, retryKey: 0 };

    static getDerivedStateFromError(error: Error): Partial<LazyTabErrorBoundaryState> {
        return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        if (import.meta.env.DEV) {
            console.error(`[LazyTabErrorBoundary:${this.props.tabLabel}]`, error, info.componentStack);
        }
    }

    private handleRetry = () => {
        this.props.onRetry?.();
        this.setState((prev) => ({ error: null, retryKey: prev.retryKey + 1 }));
    };

    render() {
        if (this.state.error) {
            return (
                <div
                    dir="rtl"
                    className="w-full h-[100dvh] bg-[#151822] flex flex-col items-center justify-center p-6 text-center gap-4"
                >
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 max-w-md w-full space-y-4">
                        <h2 className="text-white font-bold text-lg">تعذّر فتح {this.props.tabLabel}</h2>
                        <p className="text-white/45 text-sm">
                            حدث خطأ أثناء تحميل هذا القسم. يمكنك إعادة المحاولة دون إعادة تشغيل التطبيق.
                        </p>
                        {import.meta.env.DEV ? (
                            <pre className="text-red-300/90 text-[10px] text-right whitespace-pre-wrap break-all bg-black/30 rounded-lg p-3 max-h-28 overflow-auto">
                                {this.state.error.message}
                            </pre>
                        ) : null}
                        <div className="flex flex-col sm:flex-row gap-2">
                            <button
                                type="button"
                                onClick={this.handleRetry}
                                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#E6C673] text-[#0F172A] font-bold text-sm hover:bg-[#F4D03F] transition-colors"
                            >
                                <RefreshCw size={16} />
                                إعادة المحاولة
                            </button>
                            {this.props.onBack ? (
                                <button
                                    type="button"
                                    onClick={this.props.onBack}
                                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/80 font-bold text-sm hover:bg-white/10 transition-colors"
                                >
                                    <ArrowRight size={16} />
                                    رجوع
                                </button>
                            ) : null}
                        </div>
                    </div>
                </div>
            );
        }

        return <React.Fragment key={this.state.retryKey}>{this.props.children}</React.Fragment>;
    }
}
