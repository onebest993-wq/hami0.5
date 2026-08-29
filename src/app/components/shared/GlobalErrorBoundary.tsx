import React, { Component, ErrorInfo, ReactNode } from "react";
import { resetLawyerDashboardModuleCache } from '@/app/runtime/lawyerDashboardLoader';
import { resetArchivePortalPrefetch } from '@/app/runtime/archivePortalPrefetch';
import { sentryCaptureException } from '@/app/observability/sentryClient';
import {
  isNamedExportMismatchMessage,
  isStaleChunkError,
  reloadOnceForStaleChunk,
} from '@/app/utils/lazy/staleChunkError';
import { debug } from "@/app/utils/debug";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isStaleChunk: boolean;
}

function isAuthProviderHmrError(error: Error): boolean {
  return /useAuth must be used within an AuthProvider/i.test(error.message);
}

export class GlobalErrorBoundary extends Component<Props, State> {
  private escapeListener: ((event: KeyboardEvent) => void) | null = null;

  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    isStaleChunk: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null, isStaleChunk: isStaleChunkError(error) };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (isAuthProviderHmrError(error) && import.meta.env.DEV) {
      debug.error('❌ [GlobalErrorBoundary] Auth context HMR glitch — soft reset');
      this.setState({ hasError: false, error: null, errorInfo: null, isStaleChunk: false });
      return;
    }

    /*
     * المقطع البائت يُشفى بإعادة تحميل واحدة لا بإعادة رسم.
     *
     * كان هذا الفرع يسجّل سطراً في التطوير ولا شيء في الإنتاج، فيهبط المستخدم على
     * شاشة «حدث خطأ غير متوقع» وزرّها يُعيد الرسم — فيطلب المقطع الميت نفسه ويسقط
     * مرّة أخرى. حلقةٌ لا مخرج منها إلّا إغلاق التطبيق قسراً، وتقع بعد كل نشرة على
     * كل من كان التطبيق مفتوحاً عنده.
     *
     * التطوير مستثنى من التلقائي عن قصد: HMR يُطلق هذا العطل طبيعياً، وإعادة
     * التحميل معه تُقاطع العمل بلا سبب. الزرّ اليدويّ يبقى متاحاً هناك.
     */
    if (this.state.isStaleChunk && !import.meta.env.DEV) {
      if (reloadOnceForStaleChunk()) return;
      debug.error('❌ [GlobalErrorBoundary] Stale chunk — reload budget spent, manual recovery only');
    }

    /*
     * تصدير HMR الناقص لا يُشفى بإعادة الرسم حتى في التطوير: `React.lazy` يحتفظ
     * بالوعد المرفوض. إعادة تحميل واحدة (نفس ميزانية المقطع البائت) أفضل من شاشة
     * عطل لا يخرج منها إلّا تحديث يدوي.
     */
    if (import.meta.env.DEV && isNamedExportMismatchMessage(error.message)) {
      if (reloadOnceForStaleChunk()) return;
    }

    debug.error("❌ [GlobalErrorBoundary] Uncaught error:", error, errorInfo);

    // قياس/تشخيص فقط — لا يظهر في واجهة الإنتاج المغلقة
    if (import.meta.env.VITE_SHELL_AUTH_OPEN === 'true' && typeof window !== 'undefined') {
      try {
        (window as Window & { __HAMI_LAST_BOUNDARY_ERROR?: string }).__HAMI_LAST_BOUNDARY_ERROR =
          `${error?.name || 'Error'}: ${error?.message || String(error)}\n${errorInfo?.componentStack || ''}`;
      } catch {
        /* ignore */
      }
    }

    // شبكة الأمان: إن وُجد VITE_SENTRY_DSN تُخزَّن ثم تُرسل بعد التهيئة
    void sentryCaptureException(error, {
      source: 'GlobalErrorBoundary',
      componentStack: errorInfo?.componentStack ?? '',
    });

    this.setState({ errorInfo });
  }

  public componentDidUpdate(_prevProps: Props, prevState: State): void {
    if (this.state.hasError && !prevState.hasError) {
      this.escapeListener = (event: KeyboardEvent) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        this.handleReset();
      };
      window.addEventListener('keydown', this.escapeListener, true);
      return;
    }
    if (!this.state.hasError && prevState.hasError && this.escapeListener) {
      window.removeEventListener('keydown', this.escapeListener, true);
      this.escapeListener = null;
    }
  }

  public componentWillUnmount(): void {
    if (this.escapeListener) {
      window.removeEventListener('keydown', this.escapeListener, true);
    }
  }

  private handleReset = () => {
    /*
     * زرّ واحد بسلوكين لأن العطلين مختلفان في طبيعتهما: عطل عابر في مكوّن يشفيه
     * إعادة الرسم، ومقطعٌ محذوف من الخادم لا يشفيه إلّا جلب `index.html` جديد.
     * كان الزرّ يُعيد الرسم في الحالتين، فلا يعمل في الثانية أبداً.
     */
    if (
      (this.state.isStaleChunk || isNamedExportMismatchMessage(this.state.error?.message ?? '')) &&
      typeof window !== 'undefined'
    ) {
      window.location.reload();
      return;
    }
    resetLawyerDashboardModuleCache();
    resetArchivePortalPrefetch();
    this.setState({ hasError: false, error: null, errorInfo: null, isStaleChunk: false });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0F172A] text-white p-6 text-center font-sans"
          dir="rtl"
          role="alertdialog"
          aria-label="خطأ عام في التطبيق"
          data-testid="global-error-boundary-fallback"
        >
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20 animate-pulse">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden className="text-red-500">
              <path
                d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">
            {this.state.isStaleChunk ? 'صدر تحديث للتطبيق' : 'عذراً، حدث خطأ غير متوقع'}
          </h1>
          <p className="text-white/60 mb-8 max-w-md">
            {this.state.isStaleChunk
              ? 'نسخة أحدث من التطبيق أصبحت متاحة، وهذه الصفحة ما تزال على النسخة السابقة. أعد التحميل للمتابعة — لا تفقد شيئاً من بياناتك.'
              : 'واجه النظام مشكلة تقنية تمنع عرض الصفحة. تم تسجيل الخطأ وسيتم مراجعته.'}
          </p>
          
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-black/30 p-4 rounded-lg border border-white/10 mb-8 max-w-2xl w-full overflow-auto text-left ltr" dir="ltr">
              <code className="text-xs text-red-400 font-mono break-all whitespace-pre-wrap">
                {this.state.error?.toString()}
                {this.state.errorInfo?.componentStack}
              </code>
            </div>
          )}

          <button
            type="button"
            onClick={this.handleReset}
            data-testid="global-error-boundary-retry"
            className="flex items-center gap-2 px-6 py-3 bg-[#E6C673] text-[#0F172A] rounded-xl font-bold hover:bg-[#F4D03F] transition-all"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 003.51 15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {this.state.isStaleChunk ? 'إعادة التحميل' : 'المحاولة مرة أخرى'}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
