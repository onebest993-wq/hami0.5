import React, { Suspense, useEffect, useLayoutEffect, useState, type ReactElement } from 'react';

import { FontInjector } from './components/shared/FontInjector';
import { HamiMotionConfig } from './components/shared/HamiMotionConfig';
import { AppProvider } from './context/AppContext';
import { useAuth, useAppRootAuth } from '@/app/context/authHooks';
import { isSuperAdminUser } from '@/app/context/authRoleUtils';
import { SecurityInitializerGate as AppSecurityInitializer } from '@/app/bootstrap/SecurityInitializerGate';
import { removeStaticBootShell } from '@/app/bootstrap/bootStaticShell';
import { isShellDemoUserId } from '@/app/services/auth/shellAuth';
import { GUEST_LAWYER_ID } from '@/app/utils/guestLawyerSession';
import {
    applyPlainDocumentSurface,
    clearPlainDocumentSurface,
} from '@/boot/plainDocumentPath';
import { computeHqAdminPending, computeHqNeedsLogin, HQ_POST_LOGIN_HOLD_MS } from '@/app/components/admin/hqAdminEntryGate';
import {
    clearHqDoorSession,
    restoreHqDoorEntry,
    writeHqDoorSession,
} from '@/app/components/admin/hqDoorSession';

type AdminAccessDenyInfo = {
    userId: string | null;
    userEmail: string | null;
    isGuest: boolean;
    verifyReason: string | null;
    profileRole: string | null;
    uuidMatches: boolean | null;
    verifyFailed: boolean;
};

function isGuestLikeUser(user: { id?: string } | null | undefined): boolean {
    const id = user?.id;
    return !id || id === GUEST_LAWYER_ID || isShellDemoUserId(id);
}

const LazySmartToastContainer = React.lazy(() =>
    import('./components/ui/SmartToastContainer').then((m) => ({ default: m.SmartToastContainer })),
);
const LazySmartDialogContainer = React.lazy(() =>
    import('./components/ui/SmartDialogContainer').then((m) => ({ default: m.SmartDialogContainer })),
);
const HostInner = React.lazy(() => import('@/app/surface/inner'));
const HiddenDoor = React.lazy(() => import('@/app/surface/host'));

if (typeof window !== 'undefined') {
    void import('@/app/surface/inner');
}

const ADMIN_ENTRY_FALLBACK: React.ReactNode = (
    <div style={{ minHeight: '100dvh', background: '#ffffff' }} aria-hidden />
);

const ADMIN_HOME_PATH = '/admin';
const ADMIN_LIBRARY_PATH = '/admin/library';

function normalizeAppPathname(pathname: string): string {
    return pathname.replace(/\/+$/u, '') || '/';
}

function isAdminPath(pathname: string): boolean {
    const normalized = normalizeAppPathname(pathname);
    return normalized === ADMIN_HOME_PATH || normalized === ADMIN_LIBRARY_PATH;
}

export function HqRuntimeShell(): ReactElement {
    return (
        <HamiMotionConfig>
            <HqContent />
        </HamiMotionConfig>
    );
}

function HqContent(): ReactElement {
    const rootAuth = useAppRootAuth();
    const fullAuth = useAuth();
    const user = fullAuth.user ?? rootAuth.user;
    const isLoading = fullAuth.isLoading || rootAuth.isLoading;
    const isMetaAdmin = isSuperAdminUser(user);
    const [serverAdmin, setServerAdmin] = useState<boolean | null>(null);
    const [adminDenyInfo, setAdminDenyInfo] = useState<AdminAccessDenyInfo>({
        userId: null,
        userEmail: null,
        isGuest: false,
        verifyReason: null,
        profileRole: null,
        uuidMatches: null,
        verifyFailed: false,
    });
    const [overlayContainersReady, setOverlayContainersReady] = React.useState(false);
    const [hqDoorUnlocked, setHqDoorUnlocked] = React.useState(() => restoreHqDoorEntry().unlocked);
    const [hqDevBypass, setHqDevBypass] = React.useState(() => restoreHqDoorEntry().devBypass);
    const [hqDevSessionReady, setHqDevSessionReady] = React.useState(() => restoreHqDoorEntry().sessionReady);
    const [hqVerifyEpoch, setHqVerifyEpoch] = React.useState(0);
    const [hqPostLoginHold, setHqPostLoginHold] = React.useState(false);
    const hqVerifiedUserIdRef = React.useRef<string | null>(null);

    const canEnterHeadquarters = serverAdmin === true;
    const guestLikeSession = isGuestLikeUser(user);
    const hqNeedsLogin = computeHqNeedsLogin({
        serverAdmin,
        guestLike: guestLikeSession,
        verifyReason: adminDenyInfo.verifyReason,
        postLoginHold: hqPostLoginHold,
    });
    const adminEntryPending = computeHqAdminPending({
        doorUnlocked: hqDoorUnlocked,
        serverAdmin,
        postLoginHold: hqPostLoginHold,
    });

    const lockDoor = React.useCallback(() => {
        clearHqDoorSession();
        setHqDoorUnlocked(false);
        setHqDevBypass(false);
        setHqDevSessionReady(false);
        applyPlainDocumentSurface();
    }, []);

    const adminBypassLogin = fullAuth.adminBypassLogin;
    const runHqDevBootstrap = React.useCallback(async (): Promise<boolean> => {
        if (!import.meta.env.DEV) return false;
        try {
            await adminBypassLogin();
            const { bootstrapHeadquartersDevSession } = await import(
                '@/app/services/admin/hqDevSessionBootstrap'
            );
            const ok = await bootstrapHeadquartersDevSession();
            if (!ok) return false;
            const { clearSecureApiAuthPause } = await import('@/app/services/SecureAPIClient');
            const { clearWifeSignAuthCircuit } = await import('@/app/utils/bffWifeSign');
            clearSecureApiAuthPause();
            clearWifeSignAuthCircuit();
            return true;
        } catch {
            return false;
        }
    }, [adminBypassLogin]);

    useEffect(() => {
        if (!hqDoorUnlocked || !hqDevBypass || hqDevSessionReady) return;
        let cancelled = false;
        void (async () => {
            const ok = await runHqDevBootstrap();
            if (cancelled) return;
            if (ok) {
                writeHqDoorSession('dev');
                setServerAdmin(true);
                setHqDevSessionReady(true);
                return;
            }
            setHqDevBypass(false);
            writeHqDoorSession('open');
            setHqDevSessionReady(true);
        })();
        return () => {
            cancelled = true;
        };
    }, [hqDoorUnlocked, hqDevBypass, hqDevSessionReady, runHqDevBootstrap]);

    useEffect(() => {
        const path = normalizeAppPathname(window.location.pathname);
        if (!isAdminPath(path)) {
            window.history.replaceState({ screen: 'admin' }, '', ADMIN_HOME_PATH);
        }
    }, []);

    useEffect(() => {
        if (!hqDoorUnlocked) return;
        const enable = () => {
            setOverlayContainersReady(true);
            void import('@/app/components/ui/SmartDialogContainer').catch(() => undefined);
        };
        if (typeof requestIdleCallback !== 'undefined') {
            const idleId = requestIdleCallback(enable, { timeout: 1200 });
            return () => cancelIdleCallback(idleId);
        }
        const timer = window.setTimeout(enable, 120);
        return () => window.clearTimeout(timer);
    }, [hqDoorUnlocked]);

    useEffect(() => {
        if (!hqPostLoginHold) return;
        if (!guestLikeSession && user?.id) {
            setHqPostLoginHold(false);
            return;
        }
        const timer = window.setTimeout(() => setHqPostLoginHold(false), HQ_POST_LOGIN_HOLD_MS);
        return () => window.clearTimeout(timer);
    }, [guestLikeSession, hqPostLoginHold, user?.id]);

    useEffect(() => {
        if (hqDevBypass) return;
        if (hqPostLoginHold || !guestLikeSession) return;
        hqVerifiedUserIdRef.current = null;
        setServerAdmin((was) => (was === true ? false : was));
    }, [guestLikeSession, hqDevBypass, hqPostLoginHold, user?.id]);

    useEffect(() => {
        if (!hqDoorUnlocked) {
            return;
        }
        if (hqDevBypass) {
            setServerAdmin(true);
            return;
        }
        if (isLoading) return;

        const isGuest =
            !user?.id ||
            user.id === GUEST_LAWYER_ID ||
            isShellDemoUserId(user.id);
        const email =
            typeof user?.email === 'string' && user.email.trim()
                ? user.email.trim()
                : null;

        if (!user?.id || isGuest) {
            if (hqPostLoginHold) return;
            hqVerifiedUserIdRef.current = null;
            setServerAdmin(false);
            setAdminDenyInfo({
                userId: user?.id ?? null,
                userEmail: email,
                isGuest: true,
                verifyReason: 'no_real_session',
                profileRole: null,
                uuidMatches: null,
                verifyFailed: false,
            });
            return;
        }

        let cancelled = false;
        const keepLiveSession = hqVerifiedUserIdRef.current === user.id;
        if (!keepLiveSession) setServerAdmin(null);
        void import('@/app/services/admin/adminVerifyClient')
            .then((m) => m.fetchHeadquartersAdminVerify())
            .then((data) => {
                if (cancelled) return;
                if (data.sessionLive === false) {
                    hqVerifiedUserIdRef.current = null;
                    setServerAdmin(false);
                    setAdminDenyInfo({
                        userId: data.userId ?? user.id,
                        userEmail: email,
                        isGuest: true,
                        verifyReason: 'no_live_session',
                        profileRole: null,
                        uuidMatches: null,
                        verifyFailed: false,
                    });
                    return;
                }
                const isAdmin = Boolean(data?.isAdmin);
                hqVerifiedUserIdRef.current = isAdmin ? user.id : null;
                setServerAdmin(isAdmin);
                setAdminDenyInfo({
                    userId: data?.userId ?? user.id,
                    userEmail: email,
                    isGuest: false,
                    verifyReason: data?.reason ?? (isMetaAdmin ? 'jwt_meta_only' : null),
                    profileRole: data?.profileRole ?? null,
                    uuidMatches: typeof data?.uuidMatches === 'boolean' ? data.uuidMatches : null,
                    verifyFailed: false,
                });
            })
            .catch(() => {
                if (cancelled) return;
                if (hqVerifiedUserIdRef.current === user.id) return;
                setServerAdmin(false);
                setAdminDenyInfo({
                    userId: user.id,
                    userEmail: email,
                    isGuest: true,
                    verifyReason: 'no_live_session',
                    profileRole: null,
                    uuidMatches: null,
                    verifyFailed: true,
                });
            });

        return () => {
            cancelled = true;
        };
    }, [hqDoorUnlocked, hqDevBypass, hqVerifyEpoch, hqPostLoginHold, isLoading, isMetaAdmin, user?.id, user?.email]);

    useLayoutEffect(() => {
        if (!hqDoorUnlocked) applyPlainDocumentSurface();
        else clearPlainDocumentSurface();
    }, [hqDoorUnlocked]);

    useLayoutEffect(() => {
        const root = document.documentElement;
        if (hqDoorUnlocked) {
            root.setAttribute('data-hami-hq-surface', '1');
            try {
                document.body.style.pointerEvents = 'auto';
            } catch {
                /* ignore */
            }
            return () => {
                root.removeAttribute('data-hami-hq-surface');
            };
        }
        root.removeAttribute('data-hami-hq-surface');
        return undefined;
    }, [hqDoorUnlocked]);

    useEffect(() => {
        removeStaticBootShell({ force: true, instant: true });
        try {
            document.documentElement.removeAttribute('data-hami-initial-boot');
            document.documentElement.classList.remove('hami-boot-static-active');
        } catch {
            /* ignore */
        }
    }, []);

    if (!hqDoorUnlocked) {
        return (
            <Suspense fallback={ADMIN_ENTRY_FALLBACK}>
                <HiddenDoor
                    unlocked={false}
                    onUnlock={(viaDevShortcut) => {
                        if (!viaDevShortcut) {
                            writeHqDoorSession('open');
                            clearPlainDocumentSurface();
                            setHqDoorUnlocked(true);
                            setHqDevSessionReady(true);
                            return;
                        }
                        void (async () => {
                            const sessionOk = await runHqDevBootstrap();
                            if (sessionOk) {
                                writeHqDoorSession('dev');
                                setHqDevBypass(true);
                                setServerAdmin(true);
                            } else {
                                writeHqDoorSession('open');
                                setHqDevBypass(false);
                            }
                            clearPlainDocumentSurface();
                            setHqDevSessionReady(true);
                            setHqDoorUnlocked(true);
                        })();
                    }}
                >
                    {null}
                </HiddenDoor>
            </Suspense>
        );
    }

    return (
        <>
            {overlayContainersReady ? (
                <>
                    <Suspense fallback={null}>
                        <LazySmartToastContainer />
                    </Suspense>
                    <Suspense fallback={null}>
                        <LazySmartDialogContainer />
                    </Suspense>
                </>
            ) : null}

            <AppProvider>
                <AppSecurityInitializer />
                <FontInjector />

                <div key="admin" className="hami-app-screen">
                    <Suspense fallback={ADMIN_ENTRY_FALLBACK}>
                        <HostInner
                            pending={adminEntryPending}
                            allowed={canEnterHeadquarters}
                            needsLogin={hqNeedsLogin}
                            deny={adminDenyInfo}
                            fallback={ADMIN_ENTRY_FALLBACK}
                            onLoggedIn={() => {
                                hqVerifiedUserIdRef.current = null;
                                setHqPostLoginHold(true);
                                setServerAdmin(null);
                                setAdminDenyInfo({
                                    userId: user?.id ?? null,
                                    userEmail:
                                        typeof user?.email === 'string' ? user.email : null,
                                    isGuest: false,
                                    verifyReason: null,
                                    profileRole: null,
                                    uuidMatches: null,
                                    verifyFailed: false,
                                });
                                setHqVerifyEpoch((n) => n + 1);
                            }}
                            onSessionRequired={() => {
                                hqVerifiedUserIdRef.current = null;
                                setServerAdmin(false);
                                setAdminDenyInfo({
                                    userId: user?.id ?? null,
                                    userEmail:
                                        typeof user?.email === 'string' ? user.email : null,
                                    isGuest: true,
                                    verifyReason: 'no_live_session',
                                    profileRole: null,
                                    uuidMatches: null,
                                    verifyFailed: false,
                                });
                            }}
                            onBack={lockDoor}
                            onLogout={lockDoor}
                            onSwitchAccount={() => {
                                hqVerifiedUserIdRef.current = null;
                                setServerAdmin(null);
                                void fullAuth.logout();
                            }}
                            skipTrustedDevice={hqDevBypass}
                            devSessionReady={hqDevSessionReady}
                        />
                    </Suspense>
                </div>
            </AppProvider>
        </>
    );
}
