import React from 'react';
import { ErrorBoundary } from '@/app/components/ui/ErrorBoundary';

export function GlobalSearchErrorBoundary({
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
                    className="hami-gs-error-layer fixed inset-0 z-[280] flex flex-col justify-end"
                    role="alertdialog"
                    aria-label="خطأ في البحث"
                >
                    <div className="absolute inset-0 bg-[#0A0F1C]/80" />
                    <div className="hami-gs-error-sheet relative w-full rounded-t-2xl border-t border-x border-rose-500/20 bg-[#0B1021] p-5 flex flex-col items-center gap-3 text-center pb-[max(16px,env(safe-area-inset-bottom))] ps-[max(1rem,env(safe-area-inset-left))] pe-[max(1rem,env(safe-area-inset-right))]">
                        <p className="text-white/70 text-sm max-w-xs leading-6">
                            تعذّر تحميل البحث. أغلق وحاول مرة أخرى.
                        </p>
                        <button
                            type="button"
                            onClick={onClose}
                            className="min-h-[44px] min-w-[44px] px-6 rounded-xl bg-[#E6C673]/12 text-[#E6C673] border border-[#E6C673]/25 active:bg-[#E6C673]/20 text-sm font-bold touch-manipulation"
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
