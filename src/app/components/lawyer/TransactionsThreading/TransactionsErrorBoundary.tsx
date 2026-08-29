import React from 'react';
import { createPortal } from 'react-dom';
import { ErrorBoundary } from '@/app/components/ui/ErrorBoundary';
import { getHamiOverlayPortalRoot } from '@/app/utils/overlayPortal';

function TransactionsErrorFallback({ onClose }: { onClose: () => void }) {
    const node = (
        <div
            className="fixed inset-0 z-[230] flex flex-col items-center justify-center px-6 bg-[#0A0F1C]"
            dir="rtl"
            role="alertdialog"
            aria-label="خطأ في المعاملات"
            data-testid="transactions-error-fallback"
        >
            <p className="text-white/50 text-sm max-w-xs text-center leading-relaxed mb-6">
                تعذّر تحميل مركز المعاملات. أغلق وحاول مرة أخرى.
            </p>
            <button
                type="button"
                onClick={onClose}
                data-testid="transactions-error-close"
                className="min-h-[48px] px-8 rounded-xl bg-[#E6C673]/15 text-[#E6C673] border border-[#E6C673]/35 active:bg-[#E6C673]/25 transition-colors text-sm font-bold"
            >
                إغلاق
            </button>
        </div>
    );
    if (typeof document === 'undefined') return node;
    return createPortal(node, getHamiOverlayPortalRoot({ id: 'hami-overlay-portal', zIndex: 229 }));
}

export function TransactionsErrorBoundary({
    onClose,
    children,
}: {
    onClose: () => void;
    children: React.ReactNode;
}) {
    return (
        <ErrorBoundary fallback={<TransactionsErrorFallback onClose={onClose} />}>
            {children}
        </ErrorBoundary>
    );
}
