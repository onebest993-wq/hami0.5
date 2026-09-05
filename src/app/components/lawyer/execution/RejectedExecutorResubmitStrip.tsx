import React, { useState } from 'react';
import { Send } from '@/app/components/ui/icons/Send';
import {
    REQUEST_CONFIRM_HINT_CLASS,
    REQUEST_CONFIRM_PRIMARY_BTN_CLASS,
    REQUEST_CONFIRM_SECONDARY_BTN_CLASS,
} from '@/app/components/lawyer/shared/RequestConfirmStrip';

const RESUBMIT_BTN =
    'inline-flex min-h-[40px] w-full flex-row-reverse items-center justify-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.04] px-2.5 text-[11px] font-bold text-slate-200 hover:border-white/18 hover:bg-white/[0.07] disabled:opacity-50 touch-manipulation';

/** شريط إعادة التقديم / إرسال للقرارات — خفيف؛ يدعم حالة controlled لتفادي اختفاء التأكيد عند إعادة الرسم */
export function RejectedExecutorResubmitStrip(props: {
    onConfirmSubmit: () => void;
    disabled?: boolean;
    submitting?: boolean;
    linkLabel?: string;
    confirmLabel?: string;
    hint?: string;
    showReplaceHint?: boolean;
    children?: React.ReactNode;
    /** داخل صف أفعال جنب تفعيل بقرار — زر بعرض الصف */
    compact?: boolean;
    confirmOpen?: boolean;
    onConfirmOpenChange?: (open: boolean) => void;
}) {
    const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
    const isControlled = typeof props.confirmOpen === 'boolean';
    const confirmOpen = isControlled ? Boolean(props.confirmOpen) : uncontrolledOpen;
    const setConfirmOpen = (open: boolean) => {
        if (!isControlled) setUncontrolledOpen(open);
        props.onConfirmOpenChange?.(open);
    };
    const disabled = Boolean(props.disabled || props.submitting);
    const confirmHint = props.hint ?? 'عند إرسال طلب جديد سيتم إنهاء الطلب الموجود.';
    const showReplaceHint = props.showReplaceHint === true;

    return (
        <div className={`relative text-right ${props.compact ? '' : 'space-y-1.5'}`} dir="rtl">
            {props.children}
            {confirmOpen ? (
                <div className="flex flex-col gap-1.5 rounded-lg border border-white/10 bg-[#0A1122]/70 px-2 py-1.5">
                    {showReplaceHint ? (
                        <p className={REQUEST_CONFIRM_HINT_CLASS}>{confirmHint}</p>
                    ) : null}
                    <div className="flex flex-row-reverse flex-wrap items-center gap-1.5">
                        <button
                            type="button"
                            disabled={disabled}
                            onClick={(e) => {
                                e.stopPropagation();
                                props.onConfirmSubmit();
                                setConfirmOpen(false);
                            }}
                            className={REQUEST_CONFIRM_PRIMARY_BTN_CLASS}
                        >
                            <span className="flex flex-row-reverse items-center justify-center gap-1.5">
                                <Send size={12} className="text-[#E6C673]/90 shrink-0" aria-hidden />
                                {props.confirmLabel ?? 'تأكيد وإرسال للقرارات'}
                            </span>
                        </button>
                        <button
                            type="button"
                            disabled={disabled}
                            onClick={(e) => {
                                e.stopPropagation();
                                setConfirmOpen(false);
                            }}
                            className={REQUEST_CONFIRM_SECONDARY_BTN_CLASS}
                        >
                            إلغاء
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    disabled={disabled}
                    onClick={(e) => {
                        e.stopPropagation();
                        setConfirmOpen(true);
                    }}
                    className={RESUBMIT_BTN}
                >
                    <Send size={12} className="opacity-70 shrink-0" aria-hidden />
                    {props.linkLabel ?? 'إرسال طلب للقرارات'}
                </button>
            )}
        </div>
    );
}
