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
                    className="fixed inset-0 z-[230] flex flex-col items-center justify-center px-6 bg-[#051410]/95 text-[#E8F5F0]"
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
                        className="min-h-[48px] px-8 rounded-2xl bg-[#A67C52]/15 text-[#D4B896] border border-[#A67C52]/35 active:bg-[#A67C52]/25 transition-colors text-sm font-bold"
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
