import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from '@/app/components/ui/icons/AlertTriangle';
import { RefreshCw } from '@/app/components/ui/icons/RefreshCw';
import { FORUM_PLUM_DEEP, FORUM_PUBLISH_BTN, FORUM_TEXT_MUTED, FORUM_TEXT_PRIMARY } from './forumPlumTheme';
import { tearDownForumFloatingState } from '@/app/components/lawyer/CommunityScreen/tearDownForumFloatingState';

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
        tearDownForumFloatingState();
        this.setState({ hasError: false, message: '' });
        this.props.onReset?.();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div
                    dir="rtl"
                    data-testid="forum-error-fallback"
                    className="w-full h-full flex flex-col items-center justify-center p-4 text-center"
                    style={{ backgroundColor: FORUM_PLUM_DEEP }}
                >
                    <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-3">
                        <AlertTriangle size={22} className="text-red-400" />
                    </div>
                    <h2 className={`${FORUM_TEXT_PRIMARY} font-bold text-base mb-2`}>تعذّر عرض المنتدى</h2>
                    <p className={`${FORUM_TEXT_MUTED} text-sm mb-6 max-w-sm`}>
                        حدث خطأ داخل المنتدى فقط. يمكنك المحاولة مجدداً دون الخروج من التطبيق.
                    </p>
                    {import.meta.env.DEV && this.state.message ? (
                        <p className="text-red-300/80 text-[11px] mb-4 max-w-md break-all">{this.state.message}</p>
                    ) : null}
                    <button
                        type="button"
                        data-testid="forum-error-retry"
                        onClick={this.handleRetry}
                        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold ${FORUM_PUBLISH_BTN}`}
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
