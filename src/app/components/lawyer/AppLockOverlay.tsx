import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Fingerprint, Lock, LogOut } from '@/app/components/ui/lucideIcons';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
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
                    {requiresBiometric ? <Fingerprint size={36} /> : <Lock size={32} />}
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
                        }}
                        className="hami-app-lock-overlay__btn-primary"
                    >
                        <Fingerprint size={18} />
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
                        }}
                        className="hami-app-lock-overlay__btn-primary"
                    >
                        متابعة العمل
                    </button>
                )}

                {onLogout ? (
                    <button
                        type="button"
                        onPointerDown={(event) => {
                            if (event.button !== 0) return;
                            event.preventDefault();
                            onLogout();
                        }}
                        onClick={(event) => {
                            event.preventDefault();
                        }}
                        className="hami-app-lock-overlay__btn-logout"
                    >
                        <LogOut size={14} />
                        تسجيل الخروج
                    </button>
                ) : null}
            </div>
        </div>
    );

    return createPortal(layer, document.body);
};
