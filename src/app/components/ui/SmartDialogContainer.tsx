import React, {
    useEffect,
    useMemo,
    useRef,
    useState,
    type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from '@/app/motion/overlayMotionRuntime';
import { SmartDialog, subscribeSmartDialog, type DialogPayload } from '@/app/components/ui/smartDialogBus';
import {
    URGENT_DOSSIER_BTN_PRIMARY,
    URGENT_DOSSIER_DIALOG_OVERLAY,
    URGENT_DOSSIER_DIALOG_PANEL,
} from '@/app/components/lawyer/Dashboard_Active_Order_File/layout/urgentDossierUi';
import { useMobileKeyboardInset } from '@/app/hooks/useMobileKeyboardInset';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';

export function SmartDialogContainer() {
    const [active, setActive] = useState<{ id: string; payload: DialogPayload } | null>(null);
    const [promptValue, setPromptValue] = useState('');
    const [confirmSecondsLeft, setConfirmSecondsLeft] = useState(0);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const panelRef = useRef<HTMLDivElement | null>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);
    const keyboardInset = useMobileKeyboardInset(Boolean(active), true);
    const reduceMotion = useReduceMotion();

    useEffect(() => {
        return subscribeSmartDialog((ev) => {
            if (ev.intent === 'dismiss') {
                setActive((cur) => (cur?.id === ev.id ? null : cur));
                setPromptValue('');
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
        if (!active) return;
        previousFocusRef.current =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const frame = window.requestAnimationFrame(() => {
            const target =
                active.payload.kind === 'prompt'
                    ? inputRef.current
                    : panelRef.current?.querySelector<HTMLElement>('[data-testid="smart-dialog-confirm"]');
            (target ?? panelRef.current)?.focus({ preventScroll: true });
        });
        return () => {
            window.cancelAnimationFrame(frame);
            const previous = previousFocusRef.current;
            previousFocusRef.current = null;
            if (previous?.isConnected) previous.focus({ preventScroll: true });
        };
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

    useEffect(() => {
        if (!active || active.payload.kind !== 'prompt' || keyboardInset <= 0) return;
        const input = inputRef.current;
        if (!input || typeof input.scrollIntoView !== 'function') return;
        input.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    }, [active, keyboardInset, reduceMotion]);

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

    const onPanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (!active) return;
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            onCancel();
            return;
        }
        if (
            event.key === 'Enter' &&
            active.payload.kind === 'prompt' &&
            event.target === inputRef.current &&
            !event.nativeEvent.isComposing
        ) {
            event.preventDefault();
            onConfirm();
            return;
        }
        if (event.key !== 'Tab' || !panelRef.current) return;
        const focusable = Array.from(
            panelRef.current.querySelectorAll<HTMLElement>(
                'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
            ),
        );
        if (focusable.length === 0) {
            event.preventDefault();
            panelRef.current.focus();
            return;
        }
        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    };

    const confirmLocked = active?.payload.kind === 'confirm' && confirmSecondsLeft > 0;

    return createPortal(
        <AnimatePresence>
            {active ? (
                <motion.div
                    className={`${URGENT_DOSSIER_DIALOG_OVERLAY} z-[100100]`}
                    data-testid="smart-dialog-overlay"
                    data-keyboard-inset={keyboardInset}
                    style={{
                        paddingBottom: `calc(max(16px, env(safe-area-inset-bottom, 0px)) + ${keyboardInset}px)`,
                    }}
                    initial={reduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={reduceMotion ? undefined : { opacity: 0 }}
                    onClick={onBackdrop}
                >
                    <motion.div
                        ref={panelRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="smart-dialog-title"
                        aria-describedby="smart-dialog-description"
                        tabIndex={-1}
                        className={`${URGENT_DOSSIER_DIALOG_PANEL} max-h-[min(92dvh,calc(100dvh-2rem))] overflow-y-auto overscroll-contain`}
                        initial={reduceMotion ? false : { y: 18, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={reduceMotion ? undefined : { y: 18, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={onPanelKeyDown}
                    >
                        <div id="smart-dialog-title" className="text-white font-extrabold text-sm">{labels.title}</div>
                        <div id="smart-dialog-description" className="mt-2 text-white/75 text-sm leading-relaxed whitespace-pre-wrap">
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
                                    type={active.payload.inputType ?? 'text'}
                                    value={promptValue}
                                    onChange={(e) => setPromptValue(e.target.value)}
                                    placeholder={active.payload.placeholder ?? ''}
                                    autoComplete={active.payload.autoComplete}
                                    aria-label={active.payload.ariaLabel}
                                    maxLength={active.payload.maxLength}
                                    className="w-full min-h-[44px] bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-amber-500/50 focus:outline-none"
                                />
                            </div>
                        ) : null}
                        <div className="mt-4 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={onCancel}
                                className="min-h-[44px] min-w-[44px] px-4 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-colors font-bold text-sm touch-manipulation"
                            >
                                {labels.cancelText}
                            </button>
                            <button
                                type="button"
                                onClick={onConfirm}
                                disabled={confirmLocked}
                                data-testid="smart-dialog-confirm"
                                className={`${URGENT_DOSSIER_BTN_PRIMARY} min-w-[44px] py-2 text-xs disabled:opacity-40 disabled:pointer-events-none tabular-nums`}
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
