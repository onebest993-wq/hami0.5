import React from 'react';
import { ErrorBoundary } from '@/app/components/ui/ErrorBoundary';

export function ProfileErrorBoundary({
    onBack,
    children,
}: {
    onBack?: () => void;
    children: React.ReactNode;
}) {
    return (
        <ErrorBoundary
            fallback={
                <div className="min-h-screen bg-[#05060D] flex flex-col items-center justify-center gap-4 px-6 text-center">
                    <p className="text-white/70 text-sm max-w-xs">تعذّر تحميل الملف المهني.</p>
                    {onBack ? (
                        <button
                            type="button"
                            onClick={onBack}
                            className="min-h-[48px] px-8 rounded-2xl bg-[#E6C673]/12 text-[#E6C673] border border-[#E6C673]/25 text-sm font-bold"
                        >
                            العودة
                        </button>
                    ) : null}
                </div>
            }
        >
            {children}
        </ErrorBoundary>
    );
}
