import React from 'react';
import { ErrorBoundary } from '@/app/components/ui/ErrorBoundary';

export function RadarErrorBoundary({
    onBack,
    children,
}: {
    onBack: () => void;
    children: React.ReactNode;
}) {
    return (
        <ErrorBoundary
            fallback={
                <div
                    className="flex flex-col h-full min-h-[100dvh] items-center justify-center px-6 bg-[#071221] text-white"
                    role="alertdialog"
                    aria-label="خطأ في رادار المواعيد"
                    data-testid="radar-error-fallback"
                >
                    <p className="text-white/70 text-sm max-w-xs text-center leading-relaxed mb-6">
                        تعذّر تحميل رادار المواعيد. ارجع للرئيسية وحاول مرة أخرى.
                    </p>
                    <button
                        type="button"
                        onClick={onBack}
                        data-testid="radar-error-back"
                        className="min-h-[48px] px-8 rounded-2xl bg-[#E6C673]/12 text-[#E6C673] border border-[#E6C673]/25 active:bg-[#E6C673]/20 transition-colors text-sm font-bold"
                    >
                        رجوع
                    </button>
                </div>
            }
        >
            {children}
        </ErrorBoundary>
    );
}
