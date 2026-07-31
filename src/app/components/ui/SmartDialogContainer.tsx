import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { SmartDialog, subscribeSmartDialog, type DialogPayload } from '@/app/components/ui/smartDialogBus';
import {
    URGENT_DOSSIER_BTN_PRIMARY,
    URGENT_DOSSIER_DIALOG_OVERLAY,
    URGENT_DOSSIER_DIALOG_PANEL,
} from '@/app/components/lawyer/Dashboard_Active_Order_File/layout/urgentDossierUi';

export function SmartDialogContainer() {
    const [active, setActive] = useState<{ id: string; payload: DialogPayload } | null>(null);
    const [promptValue, setPromptValue] = useState('');
    const [confirmSecondsLeft, setConfirmSecondsLeft] = useState(0);
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        return subscribeSmartDialog((ev) => {
            if (ev.intent === 'dismiss') {
                setActive((cur) => (cur?.id === ev.id ? null : cur));
                return;
            }
            if (ev.intent === 'show' && ev.payload) {
                setActive({ id: ev.id, payload: ev.payload });
                if (ev.payload.kind === 'prompt') {
                    setPromptValue(ev.payload.defaultValue ?? '');
                } else {
                    setPromptValue('');
                }
            }
        });
    }, []);

    useEffect(() => {
        if (!active || active.payload.kind !== 'prompt') return;
        const t = window.setTimeout(() => inputRef.current?.focus(), 0);
        return () => window.clearTimeout(t);
    }, [active]);

    useEffect(() => {
        if (!active || active.payload.kind !== 'confirm') {
            setConfirmSecondsLeft(0);
            return;
        }
        const delayMs = Math.max(0, active.payload.confirmDelayMs ?? 0);
        if (delayMs <= 0) {
            setConfirmSecondsLeft(0);
            return;
        }
        const startedAt = Date.now();
        const tick = () => {
            const leftMs = Math.max(0, delayMs - (Date.now() - startedAt));
            setConfirmSecondsLeft(Math.ceil(leftMs / 1000));
            return leftMs;
        };
        tick();
        const id = window.setInterval(() => {
            if (tick() <= 0) window.clearInterval(id);
        }, 200);
        return () => window.clearInterval(id);
    }, [active]);

    const labels = useMemo(() => {
        const title = active?.payload.title ?? 'تأكيد';
        const confirmText = active?.payload.confirmText ?? 'تأكيد';
        const cancelText = active?.payload.cancelText ?? 'إلغاء';
        return { title, confirmText, cancelText };
    }, [active]);

    if (typeof document === 'undefined') return null;

    const onCancel = () => {
        if (!active) return;
        SmartDialog.dismiss(active.id, null);
    };

    const onConfirm = () => {
        if (!active) return;
        if (active.payload.kind === 'confirm' && confirmSecondsLeft > 0) return;
        if (active.payload.kind === 'prompt') {
            SmartDialog.dismiss(active.id, String(promptValue ?? ''));
            return;
        }
        SmartDialog.dismiss(active.id, true);
    };

    const onBackdrop = () => {
        if (!active) return;
        SmartDialog.dismiss(active.id, null);
    };

    const confirmLocked = active?.payload.kind === 'confirm' && confirmSecondsLeft > 0;

    return createPortal(
        <AnimatePresence>
            {active ? (
                <motion.div
                    className={`${URGENT_DOSSIER_DIALOG_OVERLAY} z-[100100]`}
                    data-testid="smart-dialog-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onBackdrop}
                >
                    <motion.div
                        className={URGENT_DOSSIER_DIALOG_PANEL}
                        initial={{ y: 18, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 18, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-white font-extrabold text-sm">{labels.title}</div>
                        <div className="mt-2 text-white/75 text-sm leading-relaxed whitespace-pre-wrap">
                            {active.payload.message}
                        </div>
                        {confirmLocked ? (
                            <p
                                className="mt-3 text-[12px] font-bold text-[#E6C673]/85 tabular-nums"
                                data-testid="smart-dialog-confirm-countdown"
                            >
                                انتظر {confirmSecondsLeft} ثانية قبل التأكيد…
                            </p>
                        ) : null}
                        {active.payload.kind === 'prompt' ? (
                            <div className="mt-4">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={promptValue}
                                    onChange={(e) => setPromptValue(e.target.value)}
                                    placeholder={active.payload.placeholder ?? ''}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-amber-500/50 focus:outline-none"
                                />
                            </div>
                        ) : null}
                        <div className="mt-4 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={onCancel}
                                className="px-4 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-colors font-bold text-sm touch-manipulation"
                            >
                                {labels.cancelText}
                            </button>
                            <button
                                type="button"
                                onClick={onConfirm}
                                disabled={confirmLocked}
                                data-testid="smart-dialog-confirm"
                                className={`${URGENT_DOSSIER_BTN_PRIMARY} min-h-[40px] py-2 text-xs disabled:opacity-40 disabled:pointer-events-none tabular-nums`}
                            >
                                {confirmLocked ? `${confirmSecondsLeft}ث` : labels.confirmText}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>,
        document.body,
    );
}
