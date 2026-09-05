import React, { useState } from 'react';
import { Send } from '@/app/components/ui/icons/Send';

/** ستارة تأكيد مضغوطة على وجه البطاقة — صف أزرار واحد بلا تمدّد */
export const REQUEST_CONFIRM_OVERLAY_CLASS =
    'absolute inset-0 z-20 flex flex-row-reverse items-center justify-center gap-1.5 rounded-[inherit] bg-[#0A1122]/94 px-2 text-right';

export const REQUEST_CONFIRM_HINT_CLASS =
    'max-w-[11rem] truncate text-[9px] font-semibold leading-none text-slate-400';

export const REQUEST_CONFIRM_PRIMARY_BTN_CLASS =
    'inline-flex min-h-[40px] shrink-0 flex-row-reverse items-center justify-center gap-1 rounded-lg border border-[#E6C673]/40 bg-[#E6C673]/14 px-3 text-[11px] font-bold text-amber-100 hover:bg-[#E6C673]/20 disabled:opacity-40 touch-manipulation';

export const REQUEST_CONFIRM_SECONDARY_BTN_CLASS =
    'inline-flex min-h-[40px] shrink-0 items-center justify-center rounded-lg border border-white/12 bg-white/[0.06] px-2.5 text-[11px] font-bold text-slate-300 hover:bg-white/[0.1] disabled:opacity-50 touch-manipulation';

export const REQUEST_CONFIRM_LINK_BTN_CLASS =
    'inline-flex min-h-[40px] shrink-0 flex-row-reverse items-center justify-center gap-1 rounded-lg border border-white/10 bg-transparent px-2.5 text-[11px] font-bold text-[#E6C673]/90 hover:border-[#E6C673]/30 hover:text-[#E6C673] disabled:opacity-50 touch-manipulation';

/** @deprecated استخدم REQUEST_CONFIRM_OVERLAY_CLASS */
export const REQUEST_CONFIRM_STRIP_CLASS = REQUEST_CONFIRM_OVERLAY_CLASS;

export type RequestConfirmStripProps = {
    onConfirm: () => void;
    onCancel: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
    hint?: string | null;
    disabled?: boolean;
    busy?: boolean;
    children?: React.ReactNode;
    className?: string;
};

/**
 * تأكيد خفيف على وجه البطاقة — تأكيد + تراجع فقط.
 * اختصار قرار المنفذ يُعرض بعد الإرسال على البطاقة، لا داخل ستارة التأكيد.
 */
export function RequestConfirmStrip({
    onConfirm,
    onCancel,
    confirmLabel = 'تأكيد وإرسال',
    cancelLabel = 'تراجع',
    hint = null,
    disabled = false,
    busy = false,
    children,
    className,
}: RequestConfirmStripProps) {
    const [localBusy, setLocalBusy] = useState(false);
    const isBusy = busy || localBusy;
    const hasExtra = Boolean(children);

    return (
        <div
            data-request-confirm=""
            className={
                className
                    ? `${REQUEST_CONFIRM_OVERLAY_CLASS} ${hasExtra ? 'flex-col justify-center gap-1 py-1.5' : ''} ${className}`
                    : `${REQUEST_CONFIRM_OVERLAY_CLASS}${hasExtra ? ' flex-col justify-center gap-1 py-1.5' : ''}`
            }
            dir="rtl"
            role="group"
            aria-label={hint ? `تأكيد الإرسال — ${hint}` : 'تأكيد الإرسال'}
            title={hint ?? undefined}
            onClick={(e) => e.stopPropagation()}
        >
            {children ? <div className="w-full min-w-0 px-0.5">{children}</div> : null}
            <div className="flex shrink-0 flex-row-reverse items-center justify-center gap-1.5">
                {hint && !children ? (
                    <span className={REQUEST_CONFIRM_HINT_CLASS} aria-hidden>
                        {hint}
                    </span>
                ) : null}
                <button
                    type="button"
                    disabled={isBusy || disabled}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (isBusy || disabled) return;
                        setLocalBusy(true);
                        try {
                            onConfirm();
                        } finally {
                            setLocalBusy(false);
                        }
                    }}
                    className={REQUEST_CONFIRM_PRIMARY_BTN_CLASS}
                >
                    <Send size={12} className="text-[#E6C673]/90 shrink-0" aria-hidden />
                    {confirmLabel}
                </button>
                <button
                    type="button"
                    disabled={isBusy}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (isBusy) return;
                        onCancel();
                    }}
                    className={REQUEST_CONFIRM_SECONDARY_BTN_CLASS}
                >
                    {cancelLabel}
                </button>
            </div>
        </div>
    );
}
