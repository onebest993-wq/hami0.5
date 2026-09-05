import React from 'react';
import { ErrorBoundary } from '@/app/components/ui/ErrorBoundary';

export function NotificationErrorBoundary({
    onClose,
    children,
}: {
    onClose: () => void;
    children: React.ReactNode;
}) {
    return (
        <ErrorBoundary
            fallback={
                <div
                    className="fixed inset-0 z-[200] flex flex-col justify-end sm:justify-center sm:items-center sm:px-4"
                    role="alertdialog"
                    aria-label="خطأ في الإشعارات"
                >
                    <div className="absolute inset-0 bg-[#010308]/70" />
                    <div className="relative w-full sm:max-w-sm rounded-t-xl sm:rounded-xl border-t border-x sm:border border-white/[0.08] bg-[#0b1021] p-5 flex flex-col items-center gap-3 text-center pb-[max(12px,env(safe-area-inset-bottom))]">
                        <p className="text-white/70 text-sm max-w-xs leading-relaxed">
                            تعذّر تحميل الإشعارات. أغلق وحاول مرة أخرى.
                        </p>
                        <button
                            type="button"
                            onClick={onClose}
                            className="min-h-[44px] px-6 rounded-xl bg-[#E6C673]/12 text-[#E6C673] border border-[#E6C673]/25 active:bg-[#E6C673]/20 text-sm font-semibold touch-manipulation"
                        >
                            إغلاق
                        </button>
                    </div>
                </div>
            }
        >
            {children}
        </ErrorBoundary>
    );
}
