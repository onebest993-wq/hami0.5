import React, { useState } from 'react';
import { AlertTriangle, Send } from 'lucide-react';
import type { InlineActionGateKey } from '../types';

export type InlineActionGateMode = 'initial' | 'resubmit_warning';

export interface InlineActionGateProps {
    gateKey: InlineActionGateKey;
    activeKey: InlineActionGateKey | null;
    onConfirm: () => void;
    onCancel: () => void;
    mode?: InlineActionGateMode;
    warningMessage?: string;
    confirmLabel?: string;
}

export const InlineActionGate = React.memo(function InlineActionGate({
    gateKey,
    activeKey,
    onConfirm,
    onCancel,
    mode = 'initial',
    warningMessage,
    confirmLabel,
}: InlineActionGateProps) {
    const [busy, setBusy] = useState(false);
    const isVisible = activeKey === gateKey;
    const isResubmit = mode === 'resubmit_warning';

    if (!isVisible) return null;

    const confirmButton = (
        <button
            type="button"
            disabled={busy}
            onClick={(e) => {
                e.stopPropagation();
                if (busy) return;
                setBusy(true);
                try {
                    onConfirm();
                } finally {
                    setBusy(false);
                    onCancel();
                }
            }}
            className="rounded-xl border border-amber-500 bg-amber-600/20 px-3 py-2 text-[11px] font-black text-amber-100 hover:bg-amber-600/25 disabled:opacity-50 whitespace-nowrap"
        >
            <span className="flex flex-row-reverse items-center justify-center gap-2">
                <Send size={14} className="text-amber-200 shrink-0" />
                {confirmLabel || (isResubmit ? 'تقديم طلب جديد' : 'تأكيد وإرسال للقرارات')}
            </span>
        </button>
    );

    const cancelButton = (
        <button
            type="button"
            disabled={busy}
            onClick={(e) => {
                e.stopPropagation();
                if (busy) return;
                onCancel();
            }}
            className="rounded-xl bg-slate-800 px-3 py-2 text-[11px] font-bold text-slate-100 hover:bg-slate-700 disabled:opacity-50 whitespace-nowrap"
        >
            تراجع
        </button>
    );

    if (isResubmit) {
        return (
            <div
                className="border-t border-amber-500/25 bg-slate-950/85 px-3 py-3 backdrop-blur-xl z-20"
                dir="rtl"
                role="presentation"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mx-auto flex w-full max-w-md flex-col items-center gap-2.5 text-center">
                    <AlertTriangle size={18} className="text-amber-300 shrink-0" />
                    <p className="text-[11px] font-bold leading-relaxed text-amber-100">
                        {warningMessage ||
                            'سبق واتخاذ هذا الإجراء سابقاً. هل تريد تقديم طلب جديد؟'}
                    </p>
                    <div className="flex flex-row-reverse flex-wrap items-center justify-center gap-2 w-full">
                        {confirmButton}
                        {cancelButton}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-slate-950/45 px-3 py-2 backdrop-blur-xl"
            role="presentation"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex flex-row-reverse flex-wrap items-center justify-center gap-2">
                {confirmButton}
                {cancelButton}
            </div>
        </div>
    );
});
