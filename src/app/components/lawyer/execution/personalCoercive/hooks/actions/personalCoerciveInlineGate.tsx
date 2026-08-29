import React from 'react';
import { motion, AnimatePresence } from '@/app/motion/overlayMotionRuntime';
import { Send } from '@/app/components/ui/icons/Send';

export type PersonalCoerciveActionGateKey =
    | 'forced_bring_in'
    | 'arrest_warrant_investigation'
    | 'travel_ban'
    | 'travel_ban_withdraw'
    | 'executive_dossier_presentation'
    | 'release_debtor';

export function renderPersonalCoerciveInlineGate(params: {
    key: PersonalCoerciveActionGateKey;
    confirmingKey: PersonalCoerciveActionGateKey | null;
    sendingKey: PersonalCoerciveActionGateKey | null;
    setConfirmingKey: (key: PersonalCoerciveActionGateKey | null) => void;
    onConfirm: () => void;
    opts?: { confirmLabel?: string; gateExtra?: React.ReactNode };
}) {
    const { key, confirmingKey, sendingKey, setConfirmingKey, onConfirm, opts } = params;
    return (
        <AnimatePresence initial={false}>
            {confirmingKey === key ? (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.16 }}
                    className="overflow-hidden border-t border-amber-500/25 bg-gradient-to-b from-amber-950/30 to-transparent px-3 py-3 space-y-2"
                >
                    {opts?.gateExtra}
                    <div className="flex flex-row-reverse flex-wrap items-center justify-end gap-2">
                        <button
                            type="button"
                            disabled={sendingKey === key}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (sendingKey === key) return;
                                setConfirmingKey(null);
                                onConfirm();
                            }}
                            className="rounded-xl border border-amber-500/45 bg-amber-600/20 px-3 py-2.5 text-[11px] font-black text-amber-100 hover:bg-amber-600/25 disabled:opacity-50 min-h-[44px] touch-manipulation"
                        >
                            <span className="flex flex-row-reverse items-center justify-center gap-2">
                                <Send size={14} className="text-amber-200" />
                                {opts?.confirmLabel || 'تأكيد وإرسال للقرارات'}
                            </span>
                        </button>
                        <button
                            type="button"
                            disabled={sendingKey === key}
                            onClick={(e) => {
                                e.stopPropagation();
                                setConfirmingKey(null);
                            }}
                            className="rounded-xl bg-slate-800 px-3 py-2.5 text-[11px] font-bold text-slate-100 hover:bg-slate-700 disabled:opacity-50 min-h-[44px] touch-manipulation"
                        >
                            إلغاء
                        </button>
                    </div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    );
}
