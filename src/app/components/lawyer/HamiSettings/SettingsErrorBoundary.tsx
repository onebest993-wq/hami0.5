import React from 'react';
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
    return (
        <ErrorBoundary
            onError={() => {
                onShellReset?.();
            }}
            fallback={
                <div
                    className="fixed inset-0 z-[150] flex flex-col items-center justify-center px-6 bg-[#010308]/95"
                    role="alertdialog"
                    aria-label="خطأ في الإعدادات"
                    data-testid="settings-error-fallback"
                >
                    <p className="text-white/70 text-sm max-w-xs text-center leading-relaxed mb-6">
                        تعذّر تحميل مركز الإعدادات. أغلق وحاول مرة أخرى.
                    </p>
                    <button
                        type="button"
                        onClick={onClose}
                        data-testid="settings-error-close"
                        className="min-h-[48px] px-8 rounded-2xl bg-[#E6C673]/12 text-[#E6C673] border border-[#E6C673]/25 active:bg-[#E6C673]/20 transition-colors text-sm font-bold"
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
