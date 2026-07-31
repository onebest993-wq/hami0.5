import React, { Suspense, useEffect, useState, useTransition, type ReactElement } from 'react';

import { FontInjector } from './components/shared/FontInjector';
import { HamiMotionConfig } from './components/shared/HamiMotionConfig';
import { AppProvider } from './context/AppContext';
import { isSuperAdminUser, useAppRootAuth } from './context/AuthContext';
import { SecurityInitializerGate as AppSecurityInitializer } from '@/app/bootstrap/SecurityInitializerGate';
import { isBootRevealDone } from '@/app/bootstrap/bootReveal';
import { shouldMountReactBootOverlay } from '@/app/bootstrap/bootStaticShell';
import { SmartToast } from './components/ui/smartToastBus';

const LazySmartToastContainer = React.lazy(() =>
    import('./components/ui/SmartToastContainer').then((m) => ({ default: m.SmartToastContainer })),
);
const LazySmartDialogContainer = React.lazy(() =>
    import('./components/ui/SmartDialogContainer').then((m) => ({ default: m.SmartDialogContainer })),
);

/** يبدأ مع تحميل Shell — يطوي شلال Gate بعد preload من index */
const lawyerDashboardGatePromise = import('@/app/bootstrap/LawyerDashboardGate').then((m) => ({
    default: m.LawyerDashboardGate,
}));
const LazyLawyerDashboardGate = React.lazy(() => lawyerDashboardGatePromise);

const AdminDashboard = React.lazy(() =>
    import('./components/AdminDashboard').then((m) => ({ default: m.AdminDashboard })),
);
const AdminLawLibraryPage = React.lazy(() => import('./admin/page'));
const PrivacyPolicyScreen = React.lazy(() =>
    import('./components/SettingsScreens').then((m) => ({ default: m.PrivacyPolicyScreen })),
);
const SupportScreen = React.lazy(() =>
    import('./components/SettingsScreens').then((m) => ({ default: m.SupportScreen })),
);

/** شاشات خارج اللوحة — إعدادات lazy بعد TTFI (اللوحة توفّر Provider داخل InnerRuntime) */
const LazyEnsureLawyerSettingsProvider = React.lazy(() =>
    import('@/app/context/LawyerSettingsContext').then((m) => ({
        default: m.EnsureLawyerSettingsProvider,
    })),
);

type AppScreen = 'lawyer' | 'admin' | 'adminLawLibrary' | 'privacy' | 'support';

const SCREEN_LAZY_FALLBACK: React.ReactNode = (
    <div className="min-h-screen bg-[#0a0f1c]" aria-busy="true" aria-label="حامي" />
);

/** خلفية صامتة أثناء تحميل Gate — الشعار الثابت يغطي cold؛ بلا HamiBootOverlay sync على Shell */
function LawyerGateSuspenseFallback(): React.ReactElement {
    return (
        <div
            className="min-h-screen w-full bg-[#0a0f1c]"
            data-testid="lawyer-gate-warm-fallback"
            aria-busy="true"
            aria-label={isBootRevealDone() || !shouldMountReactBootOverlay() ? 'تهيئة حامي' : 'حامي'}
        />
    );
}

function WithDeferredSettings({ children }: { children: React.ReactNode }): React.ReactElement {
    return (
        <Suspense fallback={SCREEN_LAZY_FALLBACK}>
            <LazyEnsureLawyerSettingsProvider>{children}</LazyEnsureLawyerSettingsProvider>
        </Suspense>
    );
}

const LAST_SCREEN_KEY = 'hami:last-screen';
const ADMIN_HOME_PATH = '/admin';
const ADMIN_LIBRARY_PATH = '/admin/library';

function normalizeAppPathname(pathname: string): string {
    return pathname.replace(/\/+$/u, '') || '/';
}

function screenFromPathname(pathname: string): AppScreen | null {
    const normalized = normalizeAppPathname(pathname);
    if (normalized === ADMIN_LIBRARY_PATH) return 'adminLawLibrary';
    if (normalized === ADMIN_HOME_PATH) return 'admin';
    return null;
}

function readSavedScreen(): AppScreen | null {
    try {
        const raw = sessionStorage.getItem(LAST_SCREEN_KEY);
        if (raw === 'adminLawLibrary') return 'admin';
        if (raw === 'profile') return 'lawyer';
        if (raw === 'lawyer' || raw === 'admin' || raw === 'privacy' || raw === 'support') {
            return raw;
        }
    } catch {
        /* ignore */
    }
    return null;
}

export function AppRuntimeShell(): ReactElement {
    const screenFromPath = React.useCallback((pathname: string): AppScreen | null => {
        return screenFromPathname(pathname);
    }, []);

    const [screen, setScreenInternal] = useState<AppScreen>(() => {
        const fromPath = screenFromPathname(window.location.pathname);
        if (fromPath) return fromPath;
        return readSavedScreen() ?? 'lawyer';
    });
    const [, startScreenTransition] = useTransition();
    const lastNonAdminScreenRef = React.useRef<AppScreen>(
        screen === 'admin' || screen === 'adminLawLibrary' ? 'lawyer' : screen,
    );
    const skipNextUrlSyncRef = React.useRef(false);

    useEffect(() => {
        if (screen !== 'admin' && screen !== 'adminLawLibrary') {
            lastNonAdminScreenRef.current = screen;
        }
    }, [screen]);

    useEffect(() => {
        const onPopState = () => {
            const mapped = screenFromPath(window.location.pathname);
            if (mapped) {
                skipNextUrlSyncRef.current = true;
                setScreenInternal(mapped);
                return;
            }
            if (window.location.pathname === '/') {
                skipNextUrlSyncRef.current = true;
                setScreenInternal(lastNonAdminScreenRef.current);
            }
        };
        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, [screenFromPath]);

    useEffect(() => {
        if (skipNextUrlSyncRef.current) {
            skipNextUrlSyncRef.current = false;
            return;
        }
        const path = normalizeAppPathname(window.location.pathname);
        const targetPath =
            screen === 'adminLawLibrary'
                ? ADMIN_LIBRARY_PATH
                : screen === 'admin'
                  ? ADMIN_HOME_PATH
                  : '/';

        if (screen === 'admin' || screen === 'adminLawLibrary') {
            if (path !== targetPath) {
                window.history.pushState({ screen }, '', targetPath);
            }
            return;
        }

        if (path === ADMIN_HOME_PATH || path === ADMIN_LIBRARY_PATH) {
            window.history.pushState({ screen }, '', '/');
        }
    }, [screen]);

    const setScreen = React.useCallback((next: AppScreen) => {
        startScreenTransition(() => setScreenInternal(next));
    }, []);

    useEffect(() => {
        document.body.style.backgroundColor = '#0a0f1c';
        return () => {
            document.body.style.backgroundColor = '';
        };
    }, []);

    const handleNavigateToAdmin = () => setScreen('admin');
    const handleBackToDashboard = () => setScreen('lawyer');
    const handleLogout = () => {
        setScreen('lawyer');
    };

    return (
        <HamiMotionConfig>
            <AppContent
                screen={screen}
                setScreen={setScreen}
                handleNavigateToAdmin={handleNavigateToAdmin}
                handleBackToDashboard={handleBackToDashboard}
                handleLogout={handleLogout}
            />
        </HamiMotionConfig>
    );
}

function AppContent(props: {
    screen: string;
    setScreen: (s: 'lawyer' | 'admin' | 'adminLawLibrary' | 'privacy' | 'support') => void;
    handleNavigateToAdmin: () => void;
    handleBackToDashboard: () => void;
    handleLogout: () => void;
}) {
    const { screen, setScreen, handleBackToDashboard, handleLogout } = props;

    const { logout, user, isLoading } = useAppRootAuth();
    const isSuperAdmin = isSuperAdminUser(user);
    const adminGuardToastRef = React.useRef(false);
    const lawyerScreenVisitRef = React.useRef(0);
    const [lawyerScreenAnimate, setLawyerScreenAnimate] = React.useState(false);
    const [lawyerKeepAlive, setLawyerKeepAlive] = React.useState(() => screen === 'lawyer');
    const [overlayContainersReady, setOverlayContainersReady] = React.useState(false);

    useEffect(() => {
        const enable = () => setOverlayContainersReady(true);
        if (typeof requestIdleCallback !== 'undefined') {
            const idleId = requestIdleCallback(enable, { timeout: 1200 });
            return () => cancelIdleCallback(idleId);
        }
        const timer = window.setTimeout(enable, 120);
        return () => window.clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (screen !== 'lawyer') return;
        setLawyerKeepAlive(true);
        lawyerScreenVisitRef.current += 1;
        setLawyerScreenAnimate(lawyerScreenVisitRef.current > 1);
    }, [screen]);

    useEffect(() => {
        const screenToPersist = screen === 'adminLawLibrary' ? 'admin' : screen;
        try {
            sessionStorage.setItem(LAST_SCREEN_KEY, screenToPersist);
        } catch {
            /* ignore */
        }
    }, [screen]);

    const onLogout = () => {
        logout().catch(() => {});
        handleLogout();
    };

    useEffect(() => {
        if (isLoading || !user) return;
        if ((screen === 'admin' || screen === 'adminLawLibrary') && !isSuperAdmin) {
            if (!adminGuardToastRef.current) {
                adminGuardToastRef.current = true;
                SmartToast.error('منطقة محظورة - غير مصرح لك', 3500);
            }
            setScreen('lawyer');
        }
    }, [isLoading, user, screen, isSuperAdmin, setScreen]);

    useEffect(() => {
        if (screen !== 'admin' && screen !== 'adminLawLibrary') {
            adminGuardToastRef.current = false;
        }
    }, [screen]);

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

                <div className="min-h-screen bg-[#0a0f1c] text-white overflow-x-hidden">
                    {lawyerKeepAlive || screen === 'lawyer' ? (
                        <div
                            key="lawyer"
                            className={lawyerScreenAnimate && screen === 'lawyer' ? 'hami-app-screen' : undefined}
                            hidden={screen !== 'lawyer'}
                            aria-hidden={screen !== 'lawyer'}
                        >
                            <Suspense fallback={<LawyerGateSuspenseFallback />}>
                                <LazyLawyerDashboardGate
                                    onLogout={onLogout}
                                    onAppNavigate={(target) => {
                                        if (target === 'privacy') setScreen('privacy');
                                        else if (target === 'support') setScreen('support');
                                    }}
                                />
                            </Suspense>
                        </div>
                    ) : null}
                    {screen === 'admin' && isSuperAdmin && (
                        <WithDeferredSettings>
                            <div key="admin" className="hami-app-screen">
                                <Suspense fallback={SCREEN_LAZY_FALLBACK}>
                                    <AdminDashboard
                                        onLogout={handleBackToDashboard}
                                        onOpenLawLibrary={() => setScreen('adminLawLibrary')}
                                    />
                                </Suspense>
                            </div>
                        </WithDeferredSettings>
                    )}

                    {screen === 'adminLawLibrary' && isSuperAdmin && (
                        <WithDeferredSettings>
                            <div key="adminLawLibrary" className="hami-app-screen">
                                <Suspense fallback={SCREEN_LAZY_FALLBACK}>
                                    <AdminLawLibraryPage onBack={() => setScreen('admin')} />
                                </Suspense>
                            </div>
                        </WithDeferredSettings>
                    )}

                    {screen === 'privacy' && (
                        <WithDeferredSettings>
                            <div key="privacy" className="hami-app-screen">
                                <Suspense fallback={SCREEN_LAZY_FALLBACK}>
                                    <PrivacyPolicyScreen onBack={handleBackToDashboard} />
                                </Suspense>
                            </div>
                        </WithDeferredSettings>
                    )}

                    {screen === 'support' && (
                        <WithDeferredSettings>
                            <div key="support" className="hami-app-screen">
                                <Suspense fallback={SCREEN_LAZY_FALLBACK}>
                                    <SupportScreen onBack={handleBackToDashboard} />
                                </Suspense>
                            </div>
                        </WithDeferredSettings>
                    )}
                </div>
            </AppProvider>
        </>
    );
}
