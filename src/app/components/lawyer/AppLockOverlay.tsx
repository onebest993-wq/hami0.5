import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    BootFingerprintIcon,
    BootLockIcon,
    BootLogOutIcon,
} from '@/app/components/lawyer/bootStemIcons';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { HAMI_APP_STATE_EVENT } from '@/app/runtime/appStateEvents';
import './appLockOverlay.css';

interface AppLockOverlayProps {
    requiresBiometric: boolean;
    unlocking: boolean;
    onUnlockBiometric: () => Promise<boolean>;
    onUnlockContinue: () => void;
    onLogout?: () => void;
}

export const AppLockOverlay: React.FC<AppLockOverlayProps> = ({
    requiresBiometric,
    unlocking,
    onUnlockBiometric,
    onUnlockContinue,
    onLogout,
}) => {
    const [attempting, setAttempting] = useState(false);
    const busy = unlocking || attempting;
    const logoutArmedRef = useRef(false);

    useBodyScrollLock(true);

    const handleBiometric = useCallback(async () => {
        if (busy) return;
        setAttempting(true);
        try {
            const ok = await onUnlockBiometric();
            if (!ok) SmartToast.warning('تعذر التحقق البيومتري — حاول مرة أخرى');
        } finally {
            setAttempting(false);
        }
    }, [busy, onUnlockBiometric]);

    const handleContinue = useCallback(() => {
        if (busy) return;
        onUnlockContinue();
    }, [busy, onUnlockContinue]);

    const handleBiometricRef = useRef(handleBiometric);
    handleBiometricRef.current = handleBiometric;

    useEffect(() => {
        if (!requiresBiometric) return undefined;
        let cancelled = false;
        let timer: number | undefined;

        const schedule = () => {
            if (cancelled) return;
            if (typeof document !== 'undefined' && document.hidden) return;
            window.clearTimeout(timer);
            timer = window.setTimeout(() => {
                if (cancelled) return;
                if (typeof document !== 'undefined' && document.hidden) return;
                void handleBiometricRef.current();
            }, 400);
        };

        schedule();
        const onVis = () => {
            if (!document.hidden) schedule();
        };
        const onApp = (event: Event) => {
            if ((event as CustomEvent<{ isActive?: boolean }>).detail?.isActive) schedule();
        };
        document.addEventListener('visibilitychange', onVis);
        window.addEventListener(HAMI_APP_STATE_EVENT, onApp);
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
            document.removeEventListener('visibilitychange', onVis);
            window.removeEventListener(HAMI_APP_STATE_EVENT, onApp);
        };
    }, [requiresBiometric]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape' || busy) return;
            event.preventDefault();
            event.stopPropagation();
            if (requiresBiometric) {
                void handleBiometric();
            } else {
                handleContinue();
            }
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [busy, requiresBiometric, handleContinue, handleBiometric]);

    if (typeof document === 'undefined') return null;

    const layer = (
        <div
            data-testid="app-lock-overlay"
            className="hami-app-lock-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="شاشة القفل"
        >
            <div className="hami-app-lock-overlay__panel">
                <div className="hami-app-lock-overlay__icon-box">
                    {requiresBiometric ? <BootFingerprintIcon size={36} /> : <BootLockIcon size={32} />}
                </div>

                <h2 className="hami-app-lock-overlay__title">الجلسة مقفلة</h2>
                <p className="hami-app-lock-overlay__desc">
                    {requiresBiometric
                        ? 'لحماية بيانات الموكلين، يلزم التحقق البيومتري للمتابعة.'
                        : 'انتهت مدة الخمول. اضغط متابعة للعودة إلى المكتب.'}
                </p>

                {requiresBiometric ? (
                    <button
                        type="button"
                        disabled={busy}
                        onPointerDown={(event) => {
                            if (event.button !== 0 || busy) return;
                            event.preventDefault();
                            void handleBiometric();
                        }}
                        onClick={(event) => {
                            event.preventDefault();
                            if (busy) return;
                            void handleBiometric();
                        }}
                        className="hami-app-lock-overlay__btn-primary"
                    >
                        <BootFingerprintIcon size={18} />
                        {busy ? 'جاري التحقق...' : 'فتح بالبصمة / Face ID'}
                    </button>
                ) : (
                    <button
                        type="button"
                        disabled={busy}
                        onPointerDown={(event) => {
                            if (event.button !== 0 || busy) return;
                            event.preventDefault();
                            event.stopPropagation();
                            handleContinue();
                        }}
                        onClick={(event) => {
                            event.preventDefault();
                            if (busy) return;
                            handleContinue();
                        }}
                        className="hami-app-lock-overlay__btn-primary"
                    >
                        متابعة العمل
                    </button>
                )}

                {onLogout ? (
                    <>
                        {requiresBiometric ? (
                            <button
                                type="button"
                                data-testid="app-lock-forgot-verify"
                                onPointerDown={(event) => {
                                    if (event.button !== 0 || logoutArmedRef.current) return;
                                    event.preventDefault();
                                    logoutArmedRef.current = true;
                                    SmartToast.info(
                                        'سيُغلق القفل. استعد الحساب من «نسيت كلمة المرور» بالبريد أو واتساب، أو سجّل الدخول من جديد.',
                                    );
                                    onLogout();
                                }}
                                onClick={(event) => {
                                    event.preventDefault();
                                    if (logoutArmedRef.current) return;
                                    logoutArmedRef.current = true;
                                    SmartToast.info(
                                        'سيُغلق القفل. استعد الحساب من «نسيت كلمة المرور» بالبريد أو واتساب، أو سجّل الدخول من جديد.',
                                    );
                                    onLogout();
                                }}
                                className="hami-app-lock-overlay__btn-logout"
                            >
                                نسيت التحقق؟
                            </button>
                        ) : null}
                        <button
                            type="button"
                            onPointerDown={(event) => {
                                if (event.button !== 0 || logoutArmedRef.current) return;
                                event.preventDefault();
                                logoutArmedRef.current = true;
                                onLogout();
                            }}
                            onClick={(event) => {
                                event.preventDefault();
                                if (logoutArmedRef.current) return;
                                logoutArmedRef.current = true;
                                onLogout();
                            }}
                            className="hami-app-lock-overlay__btn-logout"
                        >
                            <BootLogOutIcon size={14} />
                            تسجيل الخروج
                        </button>
                    </>
                ) : null}
            </div>
        </div>
    );

    return createPortal(layer, document.body);
};
