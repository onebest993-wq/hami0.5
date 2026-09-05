import React from 'react';
import { motion, AnimatePresence } from '@/app/motion/overlayMotionRuntime';
import { RequestConfirmStrip } from '@/app/components/lawyer/shared/RequestConfirmStrip';

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
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="absolute inset-0 z-20"
                >
                    <RequestConfirmStrip
                        className="rounded-xl"
                        onConfirm={() => {
                            if (sendingKey === key) return;
                            setConfirmingKey(null);
                            onConfirm();
                        }}
                        onCancel={() => setConfirmingKey(null)}
                        confirmLabel={opts?.confirmLabel || 'تأكيد وإرسال للقرارات'}
                        cancelLabel="إلغاء"
                        disabled={sendingKey === key}
                        busy={sendingKey === key}
                    >
                        {opts?.gateExtra ? (
                            <div className="text-[10px] leading-snug text-slate-400 text-center">
                                {opts.gateExtra}
                            </div>
                        ) : null}
                    </RequestConfirmStrip>
                </motion.div>
            ) : null}
        </AnimatePresence>
    );
}
