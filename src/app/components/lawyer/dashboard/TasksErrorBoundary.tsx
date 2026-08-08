import React from 'react';
import { ErrorBoundary } from '@/app/components/ui/ErrorBoundary';

export function TasksErrorBoundary({
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
                    className="fixed inset-0 z-[230] flex flex-col items-center justify-center px-6 bg-[#05060D]/95 text-[#F4F4F5]"
                    role="alertdialog"
                    aria-label="خطأ في أجندة المهام"
                    data-testid="tasks-manager-error-fallback"
                >
                    <p className="text-white/70 text-sm max-w-xs text-center leading-relaxed mb-6">
                        تعذّر تحميل أجندة المهام. أغلق وحاول مرة أخرى.
                    </p>
                    <button
                        type="button"
                        onClick={onClose}
                        data-testid="tasks-manager-error-close"
                        className="min-h-[48px] px-8 rounded-2xl bg-[#E6C673]/15 text-[#E6C673] border border-[#E6C673]/35 active:bg-[#E6C673]/25 transition-colors text-sm font-bold"
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
