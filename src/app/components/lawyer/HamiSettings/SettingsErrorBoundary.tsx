import React, { useCallback, useRef } from 'react';
import { ErrorBoundary } from '@/app/components/ui/ErrorBoundary';

export function SettingsErrorBoundary({
    onClose,
    onShellReset,
    children,
}: {
    onClose: () => void;
    onShellReset?: () => void;
    children: React.ReactNode;
}) {
    const shellResetOnceRef = useRef(false);

    const handleError = useCallback(() => {
        if (shellResetOnceRef.current) return;
        shellResetOnceRef.current = true;
        onShellReset?.();
    }, [onShellReset]);

    return (
        <ErrorBoundary
            onError={handleError}
            fallback={
                <div
                    className="fixed inset-0 z-[150] flex flex-col items-center justify-center px-6 bg-[#0B1021]"
                    role="alertdialog"
                    aria-label="خطأ في الإعدادات"
                    data-testid="settings-error-fallback"
                >
                    <p className="text-white/70 text-sm max-w-xs text-center leading-relaxed mb-4">
                        تعذّر تحميل مركز الإعدادات. أغلق وحاول مرة أخرى.
                    </p>
                    <button
                        type="button"
                        onClick={onClose}
                        data-testid="settings-error-close"
                        className="min-h-[44px] min-w-[44px] px-6 rounded-xl bg-[#E6C673]/12 text-[#E6C673] border border-[#E6C673]/25 active:bg-[#E6C673]/20 text-sm font-bold"
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
