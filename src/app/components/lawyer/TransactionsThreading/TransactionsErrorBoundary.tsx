import React from 'react';
import { ErrorBoundary } from '@/app/components/ui/ErrorBoundary';

export function TransactionsErrorBoundary({
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
                    className="fixed inset-0 z-[200] flex flex-col items-center justify-center px-6 bg-[#061014]/98"
                    dir="rtl"
                    role="alertdialog"
                    aria-label="خطأ في المعاملات"
                    data-testid="transactions-error-fallback"
                >
                    <p className="text-[#D8D4CE]/70 text-sm max-w-xs text-center leading-relaxed mb-6">
                        تعذّر تحميل مركز المعاملات. أغلق وحاول مرة أخرى.
                    </p>
                    <button
                        type="button"
                        onClick={onClose}
                        data-testid="transactions-error-close"
                        className="min-h-[48px] px-8 rounded-sm bg-[#C4782F]/15 text-[#D49248] border border-[#C4782F]/35 active:bg-[#C4782F]/25 transition-colors text-sm font-bold"
                    >
                        إغلاق
                    </button>
                </div>
            }
        >
            {children}
        </ErrorBoundary>
    );
}
