import React, { Suspense, useEffect, useState, useTransition, type ReactElement } from 'react';

import { FontInjector } from './components/shared/FontInjector';
import { HamiMotionConfig } from './components/shared/HamiMotionConfig';
import { AppProvider } from './context/AppContext';
import { useAuth } from '@/app/context/authHooks';
import { SecurityInitializerGate as AppSecurityInitializer } from '@/app/bootstrap/SecurityInitializerGate';
import { isBootRevealDone } from '@/app/bootstrap/bootReveal';
import {
    shouldHideBootSuspenseFallback,
    shouldMountReactBootOverlay,
} from '@/app/bootstrap/bootStaticShell';
import {
    getLawyerDashboardGateModuleSync,
    loadLawyerDashboardGateModule,
} from '@/app/runtime/lawyerDashboardGateLoader';
import { qa } from '@/app/qa/qaAttr';
import { inertProps } from '@/app/utils/inertProps';
import { isPlainDocumentPath } from '@/boot/plainDocumentPath';

const LazySmartToastContainer = React.lazy(() =>
    import('./components/ui/SmartToastContainer').then((m) => ({ default: m.SmartToastContainer })),
);
const LazySmartDialogContainer = React.lazy(() =>
    import('./components/ui/SmartDialogContainer').then((m) => ({ default: m.SmartDialogContainer })),
);

/** يبدأ مع تحميل Shell — يطوي شلال Gate بعد preload من index */
const LazyLawyerDashboardGate = React.lazy(() =>
    loadLawyerDashboardGateModule().then((m) => ({
        default: m.LawyerDashboardGate,
    })),
);

type LawyerDashboardGateProps = React.ComponentProps<
    Awaited<ReturnType<typeof loadLawyerDashboardGateModule>>['LawyerDashboardGate']
>;

function LawyerDashboardGateEntry(props: LawyerDashboardGateProps): ReactElement {
    const sync = getLawyerDashboardGateModuleSync();
    if (sync) return <sync.LawyerDashboardGate {...props} />;
    return (
        <Suspense fallback={<LawyerGateSuspenseFallback />}>
            <LazyLawyerDashboardGate {...props} />
        </Suspense>
    );
}

const PrivacyPolicyScreen = React.lazy(() =>
    import('./components/SettingsScreens').then((m) => ({ default: m.PrivacyPolicyScreen })),
);
const SupportScreen = React.lazy(() =>
    import('./components/SettingsScreens').then((m) => ({ default: m.SupportScreen })),
);

/** شاشات خارج اللوحة — إعدادات lazy بعد TTFI (اللوحة توفّر Provider داخل FullBootPath) */
const LazyEnsureLawyerSettingsProvider = React.lazy(() =>
    import('@/app/context/LawyerSettingsContext').then((m) => ({
        default: m.EnsureLawyerSettingsProvider,
    })),
);

type AppScreen = 'lawyer' | 'privacy' | 'support';

const SCREEN_LAZY_FALLBACK: React.ReactNode = (
    <div className="min-h-screen hami-board-canvas-bg" aria-busy="true" aria-label="حامي" />
);

/** خلفية صامتة أثناء تحميل Gate — الشعار الثابت يغطي cold؛ بلا HamiBootOverlay sync على Shell */
function LawyerGateSuspenseFallback(): React.ReactElement | null {
    if (shouldHideBootSuspenseFallback()) return null;
    return (
        <div
            className="min-h-screen w-full hami-board-canvas-bg"
            {...qa('lawyer-gate-warm-fallback')}
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

function normalizeAppPathname(pathname: string): string {
    return pathname.replace(/\/+$/u, '') || '/';
}

function readSavedScreen(): AppScreen | null {
    try {
        const raw = sessionStorage.getItem(LAST_SCREEN_KEY);
        if (raw === 'profile') return 'lawyer';
        if (raw === 'lawyer' || raw === 'privacy' || raw === 'support') {
            return raw;
        }
    } catch {
        /* ignore */
    }
    return null;
}

export function AppRuntimeShell(): ReactElement {
    const [screen, setScreenInternal] = useState<AppScreen>(() => readSavedScreen() ?? 'lawyer');
    const [, startScreenTransition] = useTransition();

    useEffect(() => {
        const path = normalizeAppPathname(window.location.pathname);
        if (isPlainDocumentPath(path)) {
            window.history.replaceState({ screen: 'lawyer' }, '', '/');
        }
    }, []);

    const setScreen = React.useCallback((next: AppScreen) => {
        startScreenTransition(() => setScreenInternal(next));
    }, []);

    useEffect(() => {
        document.body.style.backgroundColor = '#0a0f1c';
        return () => {
            document.body.style.backgroundColor = '';
        };
    }, []);

    const handleBackToDashboard = () => setScreen('lawyer');
    const handleLogout = () => {
        setScreen('lawyer');
    };

    return (
        <HamiMotionConfig>
            <AppContent
                screen={screen}
                setScreen={setScreen}
                handleBackToDashboard={handleBackToDashboard}
                handleLogout={handleLogout}
            />
        </HamiMotionConfig>
    );
}

function AppContent(props: {
    screen: string;
    setScreen: (s: 'lawyer' | 'privacy' | 'support') => void;
    handleBackToDashboard: () => void;
    handleLogout: () => void;
}) {
    const { screen, setScreen, handleBackToDashboard, handleLogout } = props;

    const fullAuth = useAuth();
    const [overlayContainersReady, setOverlayContainersReady] = React.useState(false);

    useEffect(() => {
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
    }, []);

    useEffect(() => {
        try {
            sessionStorage.setItem(LAST_SCREEN_KEY, screen);
        } catch {
            /* ignore */
        }
    }, [screen]);

    const onLogout = async (options?: { skipLocalPurge?: boolean }) => {
        try {
            await fullAuth.logout(options);
        } finally {
            handleLogout();
        }
    };

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

                <div className="min-h-screen hami-board-canvas-bg text-white overflow-x-hidden">
                    <div
                        key="lawyer"
                        className={screen === 'lawyer' ? 'hami-app-screen' : undefined}
                        hidden={screen !== 'lawyer'}
                        aria-hidden={screen !== 'lawyer'}
                        {...inertProps(screen !== 'lawyer')}
                        style={screen !== 'lawyer' ? { pointerEvents: 'none' } : undefined}
                    >
                        <LawyerDashboardGateEntry
                            onLogout={onLogout}
                            onAppNavigate={(target) => {
                                if (target === 'privacy') setScreen('privacy');
                                else if (target === 'support') setScreen('support');
                            }}
                        />
                    </div>

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
