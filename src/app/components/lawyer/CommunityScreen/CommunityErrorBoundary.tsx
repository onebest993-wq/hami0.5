import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
    onReset?: () => void;
}

interface State {
    hasError: boolean;
    message: string;
}

/** يعزل أخطاء المنتدى عن بقية التطبيق — بدون إعادة تحميل الصفحة. */
export class CommunityErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false, message: '' };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, message: error.message || 'خطأ غير معروف' };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        if (import.meta.env.DEV) {
            console.error('[CommunityErrorBoundary]', error, info.componentStack);
        }
    }

    private handleRetry = () => {
        this.setState({ hasError: false, message: '' });
        this.props.onReset?.();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div
                    dir="rtl"
                    className="w-full h-full bg-[#151822] flex flex-col items-center justify-center p-6 text-center"
                >
                    <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                        <AlertTriangle size={28} className="text-red-400" />
                    </div>
                    <h2 className="text-white font-bold text-base mb-2">تعذّر عرض المنتدى</h2>
                    <p className="text-white/50 text-sm mb-6 max-w-sm">
                        حدث خطأ داخل المنتدى فقط. يمكنك المحاولة مجدداً دون الخروج من التطبيق.
                    </p>
                    {import.meta.env.DEV && this.state.message ? (
                        <p className="text-red-300/80 text-[11px] mb-4 max-w-md break-all">{this.state.message}</p>
                    ) : null}
                    <button
                        type="button"
                        onClick={this.handleRetry}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E6C673] text-black text-sm font-bold"
                    >
                        <RefreshCw size={16} />
                        إعادة المحاولة
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
