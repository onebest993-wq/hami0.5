/**
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 * ðŸ›¡ï¸ ErrorBoundary - React Error Boundary Component
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 * 
 * Catches React component errors and displays fallback UI
 * ÙŠÙ„ØªÙ‚Ø· Ø£Ø®Ø·Ø§Ø¡ Ù…ÙƒÙˆÙ†Ø§Øª React ÙˆÙŠØ¹Ø±Ø¶ ÙˆØ§Ø¬Ù‡Ø© Ø¨Ø¯ÙŠÙ„Ø©
 * 
 * @version 1.0.0
 * @author Hami Legal System - Error Handling
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, FileText } from 'lucide-react';

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TYPES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ERROR BOUNDARY COMPONENT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        // Update state so the next render will show the fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        // Log error to console
        console.error('ðŸš¨ [ErrorBoundary] Caught error:', error);
        console.error('ðŸš¨ [ErrorBoundary] Component stack:', errorInfo.componentStack);

        // Update state with error info
        this.setState({
            error,
            errorInfo
        });

        // Call custom error handler if provided
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }

        // Log to external service (e.g., Sentry)
        // TODO: Add Sentry or other error tracking service
    }

    handleReset = (): void => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });
    };

    handleReload = (): void => {
        this.handleReset();
    };

    handleGoHome = (): void => {
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
        this.handleReset();
    };

    render(): ReactNode {
        if (this.state.hasError) {
            // Custom fallback UI
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default fallback UI
            return (
                <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 flex items-center justify-center p-4">
                    <div className="max-w-2xl w-full bg-navy-800/50 backdrop-blur-sm border border-navy-700 rounded-xl shadow-2xl p-8">
                        {/* Error Icon */}
                        <div className="flex justify-center mb-6">
                            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center">
                                <AlertTriangle className="w-10 h-10 text-red-400" />
                            </div>
                        </div>

                        {/* Error Title */}
                        <h1 className="text-2xl font-bold text-white text-center mb-4">
                            عذراً، حدث خطأ غير متوقع
                        </h1>

                        {/* Error Message */}
                        <p className="text-gray-400 text-center mb-6">
                            نعتذر عن الإزعاج. حدث خطأ في التطبيق. يمكنك المحاولة مرة أخرى أو العودة إلى الصفحة الرئيسية.
                        </p>

                        {/* Error Details (in development) */}
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <div className="mb-6 p-4 bg-navy-900/50 border border-red-500/30 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <FileText className="w-4 h-4 text-red-400" />
                                    <span className="text-sm font-semibold text-red-400">تفاصيل الخطأ (Development Mode)</span>
                                </div>
                                <pre className="text-xs text-red-300 overflow-auto max-h-40 whitespace-pre-wrap">
                                    {this.state.error.toString()}
                                </pre>
                                {this.state.errorInfo && (
                                    <details className="mt-2">
                                        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                                            Component Stack
                                        </summary>
                                        <pre className="text-xs text-gray-500 mt-2 overflow-auto max-h-40 whitespace-pre-wrap">
                                            {this.state.errorInfo.componentStack}
                                        </pre>
                                    </details>
                                )}
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button
                                type="button"
                                onClick={this.handleReset}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-lg transition-colors"
                            >
                                <RefreshCw className="w-5 h-5" />
                                <span>المحاولة مرة أخرى</span>
                            </button>

                            <button
                                type="button"
                                onClick={this.handleReload}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-navy-700 hover:bg-navy-600 text-white font-semibold rounded-lg transition-colors border border-navy-600"
                            >
                                <RefreshCw className="w-5 h-5" />
                                <span>إعادة تحميل الصفحة</span>
                            </button>

                            <button
                                type="button"
                                onClick={this.handleGoHome}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-navy-700 hover:bg-navy-600 text-white font-semibold rounded-lg transition-colors border border-navy-600"
                            >
                                <Home className="w-5 h-5" />
                                <span>الصفحة الرئيسية</span>
                            </button>
                        </div>

                        {/* Support Info */}
                        <div className="mt-8 pt-6 border-t border-navy-700">
                            <p className="text-sm text-gray-500 text-center">
                                إذا استمرت المشكلة، يرجى الاتصال بالدعم الفني
                            </p>
                            {process.env.NODE_ENV === 'development' && (
                                <p className="text-xs text-gray-600 text-center mt-2">
                                    تم حفظ تفاصيل الخطأ في وحدة تحكم المتصفح
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        // Normal render
        return this.props.children;
    }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// EXPORTS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export default ErrorBoundary;

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// USAGE EXAMPLE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * ÙÙŠ App.tsx:
 * 
 * ```tsx
 * import { ErrorBoundary } from './components/ui/ErrorBoundary';
 * 
 * function App() {
 *   return (
 *     <ErrorBoundary onError={(error, errorInfo) => {
 *       // Log to Sentry or other service
 *       console.error('App Error:', error);
 *     }}>
 *       <YourApp />
 *     </ErrorBoundary>
 *   );
 * }
 * ```
 * 
 * Ø£Ùˆ Ù„Ù…ÙƒÙˆÙ† Ù…Ø­Ø¯Ø¯:
 * 
 * ```tsx
 * <ErrorBoundary>
 *   <ExecutionDashboard />
 * </ErrorBoundary>
 * ```
 * 
 * Ù…Ø¹ fallback Ù…Ø®ØµØµ:
 * 
 * ```tsx
 * <ErrorBoundary fallback={<div>Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ù…ÙƒÙˆÙ†</div>}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
