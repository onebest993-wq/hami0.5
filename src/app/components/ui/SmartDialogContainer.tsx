import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { SmartDialog, subscribeSmartDialog, type DialogPayload } from '@/app/components/ui/smartDialogBus';

export function SmartDialogContainer() {
    const [active, setActive] = useState<{ id: string; payload: DialogPayload } | null>(null);
    const [promptValue, setPromptValue] = useState('');
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

    return createPortal(
        <AnimatePresence>
            {active ? (
                <motion.div
                    className="fixed inset-0 z-[100100] flex items-center justify-center bg-black/70 px-4"
                    data-testid="smart-dialog-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onBackdrop}
                >
                    <motion.div
                        className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl p-5"
                        initial={{ y: 18, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 18, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-white font-extrabold text-sm">{labels.title}</div>
                        <div className="mt-3 text-white/80 text-sm font-bold whitespace-pre-wrap">
                            {active.payload.message}
                        </div>
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
                        <div className="mt-5 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={onCancel}
                                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-bold"
                            >
                                {labels.cancelText}
                            </button>
                            <button
                                type="button"
                                onClick={onConfirm}
                                className="px-4 py-2 rounded-xl bg-[#E6C673] hover:opacity-90 text-[#0B1021] text-sm font-extrabold"
                            >
                                {labels.confirmText}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>,
        document.body,
    );
}
