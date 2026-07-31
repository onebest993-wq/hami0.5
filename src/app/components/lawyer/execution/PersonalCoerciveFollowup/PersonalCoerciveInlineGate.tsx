import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send } from 'lucide-react';
import type { PersonalCoerciveActionGateKey } from '@/app/components/lawyer/execution/PersonalCoerciveFollowup/personalCoercivePresentation';

export interface PersonalCoerciveInlineGateProps {
    gateKey: PersonalCoerciveActionGateKey;
    onConfirm: () => void;
    opts?: { confirmLabel?: string; gateExtra?: React.ReactNode };
    confirmingKey: PersonalCoerciveActionGateKey | null;
    sendingKey: PersonalCoerciveActionGateKey | null;
    setConfirmingKey: (key: PersonalCoerciveActionGateKey | null) => void;
}

/** بوابة تأكيد داخلية موحّدة — تظهر فوق البطاقة قبل إرسال أي طلب إكراهي لمركز القرارات */
export function PersonalCoerciveInlineGate({
    gateKey,
    onConfirm,
    opts,
    confirmingKey,
    sendingKey,
    setConfirmingKey,
}: PersonalCoerciveInlineGateProps) {
    return (
        <AnimatePresence initial={false}>
            {confirmingKey === gateKey ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.16 }}
                    className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-2xl border border-amber-500/15 bg-[#0A1122]/90 px-3 py-3 backdrop-blur-xl"
                >
                    {opts?.gateExtra}
                    <div className="flex w-full flex-row-reverse items-center justify-center gap-2">
                        <button
                            type="button"
                            disabled={sendingKey === gateKey}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (sendingKey === gateKey) return;
                                onConfirm();
                            }}
                            className="rounded-xl border border-amber-500 bg-amber-600/20 px-3 py-2 text-[11px] font-black text-amber-100 hover:bg-amber-600/25 disabled:opacity-50"
                        >
                            <span className="flex flex-row-reverse items-center justify-center gap-2">
                                <Send size={14} className="text-amber-200" />
                                {opts?.confirmLabel || 'تأكيد وإرسال للقرارات'}
                            </span>
                        </button>
                        <button
                            type="button"
                            disabled={sendingKey === gateKey}
                            onClick={(e) => {
                                e.stopPropagation();
                                setConfirmingKey(null);
                            }}
                            className="rounded-xl bg-slate-800 px-3 py-2 text-[11px] font-bold text-slate-100 hover:bg-slate-700 disabled:opacity-50"
                        >
                            إلغاء
                        </button>
                    </div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    );
}
