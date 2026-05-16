import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { debug } from "@/app/utils/debug";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    debug.error("❌ [GlobalErrorBoundary] Uncaught error:", error, errorInfo);
    
    // Log to external service (e.g., Sentry) if configured
    // if (window.Sentry) {
    //   window.Sentry.captureException(error, { extra: errorInfo });
    // }
    
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0F172A] text-white p-6 text-center font-sans" dir="rtl">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20 animate-pulse">
            <AlertTriangle size={40} className="text-red-500" />
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
            className="flex items-center gap-2 px-6 py-3 bg-[#E6C673] text-[#0F172A] rounded-xl font-bold hover:bg-[#F4D03F] transition-all"
          >
            <RefreshCw size={18} />
            المحاولة مرة أخرى
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
