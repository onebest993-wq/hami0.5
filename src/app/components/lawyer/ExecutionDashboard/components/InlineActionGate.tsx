import React, { useState } from 'react';
import { Send } from 'lucide-react';
import type { InlineActionGateKey } from '../types';

export interface InlineActionGateProps {
    gateKey: InlineActionGateKey;
    activeKey: InlineActionGateKey | null;
    onConfirm: () => void;
    onCancel: () => void;
}

export const InlineActionGate = React.memo(function InlineActionGate({
    gateKey,
    activeKey,
    onConfirm,
    onCancel,
}: InlineActionGateProps) {
    const [busy, setBusy] = useState(false);
    const isVisible = activeKey === gateKey;

    return (
        <div
            className={`absolute inset-0 z-20 flex items-center justify-center gap-2 rounded-2xl bg-slate-950/45 px-3 backdrop-blur-xl transition-opacity duration-150 ${
                isVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
            role="presentation"
            onClick={(e) => e.stopPropagation()}
        >
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
                className="rounded-xl border border-amber-500 bg-amber-600/20 px-3 py-2 text-[11px] font-black text-amber-100 hover:bg-amber-600/25 disabled:opacity-50"
            >
                <span className="flex flex-row-reverse items-center justify-center gap-2">
                    <Send size={14} className="text-amber-200" />
                    تأكيد وإرسال للقرارات
                </span>
            </button>
            <button
                type="button"
                disabled={busy}
                onClick={(e) => {
                    e.stopPropagation();
                    if (busy) return;
                    onCancel();
                }}
                className="rounded-xl bg-slate-800 px-3 py-2 text-[11px] font-bold text-slate-100 hover:bg-slate-700 disabled:opacity-50"
            >
                إلغاء
            </button>
        </div>
    );
});
