import React, { useLayoutEffect, useRef } from 'react';
import { registerNativeBackHandler } from '@/app/runtime/nativeBackStack';

export type ArchivePortalConfirmDialogProps = {
    open: boolean;
    title: React.ReactNode;
    titleId: string;
    testId?: string;
    children: React.ReactNode;
    cancelLabel?: string;
    confirmLabel: string;
    confirmTestId?: string;
    cancelTestId?: string;
    onCancel: () => void;
    onConfirm: () => void;
    confirmClassName?: string;
};

const DIALOG_OVERLAY =
    'fixed inset-0 z-[10050] flex items-center justify-center bg-[#03050B]/82 overscroll-none ps-[max(1rem,env(safe-area-inset-left))] pe-[max(1rem,env(safe-area-inset-right))] pt-[max(16px,env(safe-area-inset-top))] pb-[max(16px,env(safe-area-inset-bottom))] font-["Tajawal"]';

const DIALOG_PANEL =
    'w-full max-w-md bg-[#0B1021] border border-white/10 rounded-2xl p-4 shadow-lg';

const DIALOG_TITLE =
    'text-white font-extrabold text-sm tracking-tight flex flex-row-reverse items-center justify-end gap-2';

const BTN_GHOST =
    'inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-xl border border-white/10 bg-white/[0.04] text-white/80 text-sm font-bold hover:bg-white/[0.08] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation';

const BTN_PRIMARY =
    'inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-xl border border-[#E6C673]/35 bg-[#E6C673]/12 text-[#F5F0E6] text-sm font-bold hover:bg-[#E6C673]/20 hover:border-[#E6C673]/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation';

export function ArchivePortalConfirmDialog({
    open,
    title,
    titleId,
    testId,
    children,
    cancelLabel = 'إلغاء',
    confirmLabel,
    confirmTestId,
    cancelTestId,
    onCancel,
    onConfirm,
    confirmClassName,
}: ArchivePortalConfirmDialogProps) {
    const onCancelRef = useRef(onCancel);
    onCancelRef.current = onCancel;
    const ignoreBackdropUntilRef = useRef(0);

    useLayoutEffect(() => {
        if (!open) return;
        ignoreBackdropUntilRef.current = performance.now() + 400;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            onCancelRef.current();
        };

        window.addEventListener('keydown', onKeyDown, true);
        const unregisterNativeBack = registerNativeBackHandler(() => {
            onCancelRef.current();
            return true;
        });
        return () => {
            window.removeEventListener('keydown', onKeyDown, true);
            unregisterNativeBack();
        };
    }, [open]);

    if (!open) return null;

    return (
        <div
            className={DIALOG_OVERLAY}
            onClick={() => {
                if (performance.now() < ignoreBackdropUntilRef.current) return;
                onCancel();
            }}
            role="presentation"
            data-hami-overlay-safe="1"
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                data-testid={testId}
                className={DIALOG_PANEL}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
            >
                <div id={titleId} className={DIALOG_TITLE}>
                    {title}
                </div>
                <div className="mt-2 space-y-2 text-white/75 text-sm leading-relaxed">{children}</div>
                <div className="mt-4 flex items-center justify-end gap-2 flex-wrap">
                    <button
                        type="button"
                        data-testid={cancelTestId}
                        onClick={(e) => {
                            e.stopPropagation();
                            onCancel();
                        }}
                        className={BTN_GHOST}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        data-testid={confirmTestId}
                        onClick={(e) => {
                            e.stopPropagation();
                            onConfirm();
                        }}
                        className={confirmClassName ?? BTN_PRIMARY}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
