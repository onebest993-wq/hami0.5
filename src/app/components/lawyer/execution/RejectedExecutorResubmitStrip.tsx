import React, { useState } from 'react';
import { Send } from '@/app/components/ui/lucideIcons';

/** شريط إعادة التقديم بعد رفض نهائي — الطلب القديم مُغلق والجديد يحل محله */
export function RejectedExecutorResubmitStrip(props: {
    onConfirmSubmit: () => void;
    disabled?: boolean;
    submitting?: boolean;
    linkLabel?: string;
    confirmLabel?: string;
    hint?: string;
    /** يظهر تنبيه الاستبدال فقط عند وجود بطاقة/قرار غير منتهٍ في مركز القرارات */
    showReplaceHint?: boolean;
    children?: React.ReactNode;
}) {
    const [confirmOpen, setConfirmOpen] = useState(false);
    const disabled = Boolean(props.disabled || props.submitting);
    const confirmHint =
        props.hint ?? 'عند إرسال طلب جديد سيتم إنهاء الطلب الموجود.';
    const showReplaceHint = props.showReplaceHint === true;

    return (
        <div className="space-y-2 text-right" dir="rtl">
            {props.children}
            {confirmOpen ? (
                <>
                    {showReplaceHint ? (
                        <p className="text-[10px] leading-relaxed text-amber-200/90">{confirmHint}</p>
                    ) : null}
                <div className="flex flex-row-reverse gap-2">
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={(e) => {
                            e.stopPropagation();
                            props.onConfirmSubmit();
                            setConfirmOpen(false);
                        }}
                        className="flex flex-1 flex-row-reverse items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] py-2.5 text-[11px] font-bold text-slate-100 hover:border-white/25 hover:bg-white/[0.08] disabled:opacity-50"
                    >
                        <Send size={13} className="text-[#E6C673]/80" />
                        {props.confirmLabel ?? 'تأكيد وإرسال للقرارات'}
                    </button>
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={(e) => {
                            e.stopPropagation();
                            setConfirmOpen(false);
                        }}
                        className="rounded-xl bg-slate-800 px-4 py-2.5 text-[11px] font-bold text-slate-100 hover:bg-slate-700 disabled:opacity-50"
                    >
                        إلغاء
                    </button>
                </div>
                </>
            ) : (
                <button
                    type="button"
                    disabled={disabled}
                    onClick={(e) => {
                        e.stopPropagation();
                        setConfirmOpen(true);
                    }}
                    className="flex w-full flex-row-reverse items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/15 py-2.5 text-[10px] font-bold text-slate-400 hover:border-white/20 hover:text-slate-200 disabled:opacity-50"
                >
                    <Send size={13} className="opacity-70" />
                    {props.linkLabel ?? 'أو: إرسال طلب للقرارات'}
                </button>
            )}
        </div>
    );
}
