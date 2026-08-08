import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { SecuritySettings } from '@/app/services/settings/types';
import { whenNativeCapacitorBootComplete } from '@/app/runtime/nativeCapacitorBoot';
import { snapAppLockClose, snapAppLockOpen } from '@/app/runtime/appLockInstantPaint';
import '@/app/components/lawyer/appLockOverlay.css';
import {
    hasBiometricSessionEnrollment,
    verifyBiometricSessionUnlock,
} from '@/app/services/security/biometricSessionService';

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll', 'pointerdown'] as const;
const TICK_MS = 4_000;

function lockDelayMs(minutes: SecuritySettings['autoLockMinutes']): number {
    return minutes > 0 ? minutes * 60_000 : 0;
}

function loadNativeBiometricBridge() {
    return import('@/app/runtime/nativeBiometricBridge');
}

function loadNativeBiometricLifecycle() {
    return import('@/app/runtime/nativeBiometricLifecycle');
}

/**
 * قفل الجلسة — التحقق عبر BiometricSessionService؛ الجسر الأصلي للـ lifecycle فقط.
 */
export function useAppLock(security: SecuritySettings) {
    const [locked, setLocked] = useState(false);
    const [unlocking, setUnlocking] = useState(false);
    const [nativeEnrolled, setNativeEnrolled] = useState(false);
    const lastActivityRef = useRef(Date.now());
    const hiddenAtRef = useRef<number | null>(null);

    useEffect(() => {
        if (!security.biometricLock) {
            setNativeEnrolled(false);
            return;
        }
        let cancelled = false;
        void loadNativeBiometricBridge()
            .then((m) => {
                if (!cancelled) setNativeEnrolled(m.hasNativeBiometricEnrollment());
            })
            .catch(() => {
                if (!cancelled) setNativeEnrolled(false);
            });
        return () => {
            cancelled = true;
        };
    }, [security.biometricLock]);

    const idleLockEnabled = security.autoLockMinutes > 0;
    const biometricAvailable = security.biometricLock && hasBiometricSessionEnrollment();
    const resumeLockEnabled = biometricAvailable;
    const requiresBiometricToUnlock = biometricAvailable;
    const sessionGuardEnabled = idleLockEnabled || resumeLockEnabled;

    const touchActivity = useCallback(() => {
        if (!locked) lastActivityRef.current = Date.now();
    }, [locked]);

    const lockNow = useCallback(() => {
        setLocked(true);
    }, []);

    useLayoutEffect(() => {
        if (locked) snapAppLockOpen();
        else snapAppLockClose();
    }, [locked]);

    useEffect(() => {
        return () => {
            snapAppLockClose();
        };
    }, []);

    useEffect(() => {
        if (!sessionGuardEnabled) return undefined;

        const onActivity = () => touchActivity();
        for (const ev of ACTIVITY_EVENTS) {
            window.addEventListener(ev, onActivity, { passive: true });
        }

        const tick = window.setInterval(() => {
            if (locked || !idleLockEnabled) return;
            const delay = lockDelayMs(security.autoLockMinutes);
            if (delay > 0 && Date.now() - lastActivityRef.current >= delay) {
                setLocked(true);
            }
        }, TICK_MS);

        const onVisibility = () => {
            if (document.hidden) {
                hiddenAtRef.current = Date.now();
                return;
            }
            const hiddenAt = hiddenAtRef.current;
            hiddenAtRef.current = null;
            if (locked || !hiddenAt) {
                lastActivityRef.current = Date.now();
                return;
            }
            if (resumeLockEnabled) {
                setLocked(true);
                return;
            }
            if (idleLockEnabled) {
                const delay = lockDelayMs(security.autoLockMinutes);
                if (delay > 0 && Date.now() - hiddenAt >= delay) {
                    setLocked(true);
                    return;
                }
            }
            lastActivityRef.current = Date.now();
        };
        document.addEventListener('visibilitychange', onVisibility);

        return () => {
            for (const ev of ACTIVITY_EVENTS) {
                window.removeEventListener(ev, onActivity);
            }
            window.clearInterval(tick);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [sessionGuardEnabled, idleLockEnabled, resumeLockEnabled, locked, security.autoLockMinutes, touchActivity]);

    useEffect(() => {
        if (!security.biometricLock || !nativeEnrolled) return undefined;

        let dispose: () => void = () => undefined;
        let cancelled = false;
        void whenNativeCapacitorBootComplete()
            .then(() => loadNativeBiometricLifecycle())
            .then((m) => m.wireNativeBiometricAvailabilityListener((available) => {
                if (!available) {
                    setLocked(true);
                }
            }))
            .then((cleanup) => {
                if (cancelled) {
                    cleanup();
                    return;
                }
                dispose = cleanup;
            })
            .catch(() => undefined);

        return () => {
            cancelled = true;
            dispose();
        };
    }, [security.biometricLock, nativeEnrolled]);

    const unlockWithBiometric = useCallback(async (): Promise<boolean> => {
        setUnlocking(true);
        try {
            await whenNativeCapacitorBootComplete();
            const ok = await verifyBiometricSessionUnlock();
            if (ok) {
                setLocked(false);
                snapAppLockClose();
                lastActivityRef.current = Date.now();
            }
            return Boolean(ok);
        } finally {
            setUnlocking(false);
        }
    }, []);

    const unlockContinue = useCallback(() => {
        snapAppLockClose();
        setLocked(false);
        lastActivityRef.current = Date.now();
    }, []);

    return {
        locked,
        unlocking,
        autoLockEnabled: idleLockEnabled,
        requiresBiometricToUnlock,
        lockNow,
        unlockWithBiometric,
        unlockContinue,
        touchActivity,
    };
}
