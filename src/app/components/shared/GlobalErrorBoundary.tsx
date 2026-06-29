import React, { Component, ErrorInfo, ReactNode } from "react";
import { debug } from "@/app/utils/debug";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

function isStaleChunkLoadError(error: Error): boolean {
  return /Failed to fetch dynamically imported module/i.test(error.message);
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
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (isAuthProviderHmrError(error) && import.meta.env.DEV) {
      debug.error('❌ [GlobalErrorBoundary] Auth context HMR glitch — soft reset');
      this.setState({ hasError: false, error: null, errorInfo: null });
      return;
    }

    if (isStaleChunkLoadError(error) && import.meta.env.DEV) {
      try {
        const reloadKey = 'hami:vite-stale-import-reload';
        if (!sessionStorage.getItem(reloadKey)) {
          sessionStorage.setItem(reloadKey, '1');
          void import('@/app/runtime/lawyerDashboardLoader').then((m) =>
            m.resetLawyerDashboardModuleCache(),
          );
          debug.error('❌ [GlobalErrorBoundary] Stale chunk — reloading once:', error.message);
          window.location.reload();
          return;
        }
      } catch {
        /* ignore */
      }
      debug.error('❌ [GlobalErrorBoundary] Stale chunk load (no auto-reload):', error.message);
    }

    debug.error("❌ [GlobalErrorBoundary] Uncaught error:", error, errorInfo);
    
    // Log to external service (e.g., Sentry) if configured
    // if (window.Sentry) {
    //   window.Sentry.captureException(error, { extra: errorInfo });
    // }
    
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
    void import('@/app/runtime/lawyerDashboardLoader').then((m) => m.resetLawyerDashboardModuleCache());
    void import('@/app/utils/lazyComponents').then((m) => m.resetArchivePortalPrefetch());
    this.setState({ hasError: false, error: null, errorInfo: null });
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
          <h1 className="text-2xl font-bold mb-2">عذراً، حدث خطأ غير متوقع</h1>
          <p className="text-white/60 mb-8 max-w-md">
            واجه النظام مشكلة تقنية تمنع عرض الصفحة. تم تسجيل الخطأ وسيتم مراجعته.
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
            المحاولة مرة أخرى
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
