import React, { useState, useEffect, useTransition, Suspense, type ReactElement } from "react";
import { motion, AnimatePresence } from "motion/react";

// Core imports with error handling
import { FontInjector } from "./components/SharedComponents";
import { AppProvider } from "./context/AppContext";
import { AuthProvider, useAuth, isSuperAdminUser } from "./context/AuthContext";
import { GlobalErrorBoundary } from "./components/shared/GlobalErrorBoundary";
import { debug } from "./utils/debug";
import { screenTransitions } from "./animations/transitions";
import { initializeProduction, logBuildInfo, isProduction } from "./utils/production";
import { PerformanceMonitor } from "./utils/performanceMonitor";
import { clearCacheIfNeeded } from "./utils/constants";
import { prefetchSecondaryAppScreens, prefetchLawyerDashboardLazyChunks, prefetchLawyerHeavyDeferredChunks } from "./utils/screenPrefetch";
import { PrefetchScheduler } from "./runtime/prefetchScheduler";
import { prefetchLawyerDashboardEntry } from "./runtime/lawyerDashboardLoader";
import { lazyWithRetry, type LazyComponent } from "./utils/lazy/lazyWithRetry";
import { LoginScreen } from "./components/auth/LoginScreen";
import { hasPersistedSupabaseSession } from "./utils/authStorage";
import { LawyerDashboard as LawyerDashboardEager } from "./components/lawyer/LawyerDashboard";
import { SmartToast, SmartToastContainer } from "./components/ui/SmartToast";
import { SmartDialogContainer } from "./components/ui/SmartDialog";

const CHUNK_RELOAD_SESSION_KEY = "hami:chunk-reload-once";
const VITE_STALE_IMPORT_RELOAD_KEY = "hami:vite-stale-import-reload";

// --- LAZY: Defer security barrel + first-screen payloads from index chunk ---
const SecurityInitializer = React.lazy(() =>
  import("./security/SecurityInitializer").then((m) => ({ default: m.SecurityInitializer }))
);

// --- Lawyer dashboard: static in dev (no dynamic import / HMR stale fetch), lazy in prod ---
if (typeof window !== 'undefined' && !import.meta.env.DEV && hasPersistedSupabaseSession()) {
  prefetchLawyerDashboardEntry();
}

const LawyerDashboardLazy = lazyWithRetry(() =>
  import("./components/lawyer/LawyerDashboard").then((m) => ({
    default: m.LawyerDashboard as unknown as LazyComponent,
  })),
);

type LawyerDashboardProps = React.ComponentProps<typeof LawyerDashboardEager>;

function LawyerDashboard(props: LawyerDashboardProps) {
  if (import.meta.env.DEV) {
    return <LawyerDashboardEager {...props} />;
  }
  return <LawyerDashboardLazy {...props} />;
}
// --- LAZY: Other heavy screens ---
const AdminDashboard = React.lazy(() => import("./components/AdminDashboard").then(m => ({ default: m.AdminDashboard })));
const AdminLawLibraryPage = React.lazy(() => import("./admin/page"));
const RoyalLawyerProfile = React.lazy(() =>
  import('@/app/runtime/royalLawyerProfileLoader').then((m) =>
    m.loadRoyalLawyerProfileModule().then((mod) => ({ default: mod.RoyalLawyerProfile })),
  ),
);
const PrivacyPolicyScreen = React.lazy(() => import("./components/SettingsScreens").then(m => ({ default: m.PrivacyPolicyScreen })));
const SupportScreen = React.lazy(() => import("./components/SettingsScreens").then(m => ({ default: m.SupportScreen })));

type AppScreen =
  | 'auth'
  | 'lawyer'
  | 'profile'
  | 'admin'
  | 'adminLawLibrary'
  | 'privacy'
  | 'support';

const SCREEN_LAZY_FALLBACK: React.ReactNode = (
  <div className="min-h-screen bg-[#000000] flex items-center justify-center">
    <div className="text-[#E6C673] text-sm font-bold animate-pulse">جاري التحميل...</div>
  </div>
);

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
    if (
      raw === 'lawyer' ||
      raw === 'profile' ||
      raw === 'admin' ||
      raw === 'privacy' ||
      raw === 'support'
    ) {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return null;
}

// Stable App Entry - Updated
export default function App(): ReactElement {
  
  useEffect(() => {
    const runDeferredAppBoot = () => {
      PerformanceMonitor.start('app-initialization');
      initializeProduction();
      logBuildInfo();
      debug.log("✅ [App] System Ready");
      PerformanceMonitor.end('app-initialization');

      try {
        sessionStorage.removeItem(CHUNK_RELOAD_SESSION_KEY);
        sessionStorage.removeItem(VITE_STALE_IMPORT_RELOAD_KEY);
      } catch {
        /* ignore */
      }

      if (clearCacheIfNeeded()) {
        debug.log('✅ [App] تم تحديث الذاكرة المؤقتة');
      }
    };

    if (hasPersistedSupabaseSession()) {
      PrefetchScheduler.planAuthenticatedEntry();
    }

    runDeferredAppBoot();
  }, []);

  useEffect(() => {
    if (!isProduction()) {
      const perfTimer = window.setTimeout(() => {
        PerformanceMonitor.logReport();
        const score = PerformanceMonitor.getScore();
        debug.log(`⚡ Performance Score: ${score}/100`);
      }, 2000);
      return () => window.clearTimeout(perfTimer);
    }
    return undefined;
  }, []);

  const screenFromPath = React.useCallback((pathname: string): AppScreen | null => {
    return screenFromPathname(pathname);
  }, []);

  const [screen, setScreenInternal] = useState<AppScreen>(() => {
    const fromPath = screenFromPathname(window.location.pathname);
    if (fromPath) return fromPath;
    if (import.meta.env.DEV && !hasPersistedSupabaseSession()) {
      return 'auth';
    }
    if (hasPersistedSupabaseSession()) {
      return readSavedScreen() ?? 'lawyer';
    }
    return 'auth';
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
      if (window.location.pathname === "/") {
        skipNextUrlSyncRef.current = true;
        setScreenInternal(lastNonAdminScreenRef.current);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
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

  /** تفكيك تحديث الشاشة الثقيلة عن الإدخال العاجل */
  const setScreen = React.useCallback(
    (next: AppScreen) => {
      startScreenTransition(() => setScreenInternal(next));
    },
    []
  );
  
  const role = "lawyer" as const;

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflowY = 'auto'; 
    document.body.style.backgroundColor = '#000000';
    return () => {
      document.body.style.overflowY = '';
      document.body.style.backgroundColor = '';
    };
  }, []);

  const handleNavigateToProfile = () => setScreen("profile");
  const handleNavigateToAdmin = () => setScreen("admin");
  const handleBackToDashboard = () => setScreen("lawyer");
  const handleLogout = () => {
    setScreen("auth");
  };

  return (
    <GlobalErrorBoundary>
      <AuthProvider>
        <AppContent
          screen={screen}
          setScreen={setScreen}
          role={role}
          handleNavigateToProfile={handleNavigateToProfile}
          handleNavigateToAdmin={handleNavigateToAdmin}
          handleBackToDashboard={handleBackToDashboard}
          handleLogout={handleLogout}
        />
      </AuthProvider>
    </GlobalErrorBoundary>
  );
}

function AppContent(props: {
  screen: string;
  setScreen: (s: "auth" | "lawyer" | "profile" | "admin" | "adminLawLibrary" | "privacy" | "support") => void;
  role: "lawyer";
  handleNavigateToProfile: () => void;
  handleNavigateToAdmin: () => void;
  handleBackToDashboard: () => void;
  handleLogout: () => void;
}) {
  const {
    screen, setScreen, role,
    handleNavigateToProfile,
    handleNavigateToAdmin, handleBackToDashboard,
    handleLogout
  } = props;

  const { logout, user, isLoading } = useAuth();
  const isSuperAdmin = isSuperAdminUser(user);
  const adminGuardToastRef = React.useRef(false);

  useEffect(() => {
    if (screen === 'auth') return;
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
    if (user && screen === "auth") {
      if (isSuperAdmin) {
        setScreen('admin');
      } else {
        setScreen("lawyer");
      }
    }
  }, [user, screen, setScreen, isSuperAdmin]);

  useEffect(() => {
    if (isLoading || !user) return;
    if ((screen === "admin" || screen === "adminLawLibrary") && !isSuperAdmin) {
      if (!adminGuardToastRef.current) {
        adminGuardToastRef.current = true;
        SmartToast.error('منطقة محظورة - غير مصرح لك', 3500);
      }
      setScreen("lawyer");
    }
  }, [isLoading, user, screen, isSuperAdmin, setScreen]);

  useEffect(() => {
    if (screen !== "admin" && screen !== "adminLawLibrary") {
      adminGuardToastRef.current = false;
    }
  }, [screen]);

  useEffect(() => {
    if (!user) {
      return;
    }
    if (!import.meta.env.DEV) {
      prefetchLawyerDashboardEntry();
    }
    if (screen === "lawyer") {
      prefetchLawyerDashboardLazyChunks();
      prefetchLawyerHeavyDeferredChunks();
      prefetchSecondaryAppScreens();
    }
  }, [screen, user]);

  return (
        <>
            <SmartToastContainer />
            <SmartDialogContainer />

            {!user ? (
                <LoginScreen />
              ) : (
        <AppProvider>
            <Suspense fallback={null}>
              <SecurityInitializer />
            </Suspense>
            <FontInjector />
            
            <div className="min-h-screen bg-[#000000] text-white overflow-x-hidden">
                <AnimatePresence mode="wait">
                {/* LAWYER DASHBOARD */}
                {screen === "lawyer" && (
                  <Suspense fallback={null}>
                    <motion.div
                      key="lawyer"
                      {...screenTransitions.main}
                    >
                      <LawyerDashboard
                        onLogout={onLogout}
                        onAppNavigate={(target) => {
                          if (target === "privacy") setScreen("privacy");
                          else if (target === "support") setScreen("support");
                        }}
                      />
                    </motion.div>
                  </Suspense>
                )}

                {/* PROFILE SCREEN */}
                {screen === "profile" && (
                  <Suspense fallback={SCREEN_LAZY_FALLBACK}>
                    <motion.div
                      key="profile"
                      {...screenTransitions.secondary}
                    >
                      <RoyalLawyerProfile isScreenMode onBack={handleBackToDashboard} />
                    </motion.div>
                  </Suspense>
                )}

                {/* ADMIN DASHBOARD */}
                {screen === "admin" && isSuperAdmin && (
                  <Suspense fallback={SCREEN_LAZY_FALLBACK}>
                    <motion.div
                      key="admin"
                      {...screenTransitions.secondary}
                    >
                      <AdminDashboard
                        onLogout={handleBackToDashboard}
                        onOpenLawLibrary={() => setScreen("adminLawLibrary")}
                      />
                    </motion.div>
                  </Suspense>
                )}

                {screen === "adminLawLibrary" && isSuperAdmin && (
                  <Suspense fallback={SCREEN_LAZY_FALLBACK}>
                    <motion.div
                      key="adminLawLibrary"
                      {...screenTransitions.secondary}
                    >
                      <AdminLawLibraryPage
                        onBack={() => setScreen("admin")}
                      />
                    </motion.div>
                  </Suspense>
                )}

                {screen === "privacy" && (
                  <Suspense fallback={SCREEN_LAZY_FALLBACK}>
                    <motion.div
                      key="privacy"
                      {...screenTransitions.secondary}
                    >
                      <PrivacyPolicyScreen onBack={handleBackToDashboard} />
                    </motion.div>
                  </Suspense>
                )}

                {screen === "support" && (
                  <Suspense fallback={SCREEN_LAZY_FALLBACK}>
                    <motion.div
                      key="support"
                      {...screenTransitions.secondary}
                    >
                      <SupportScreen onBack={handleBackToDashboard} />
                    </motion.div>
                  </Suspense>
                )}
                </AnimatePresence>

            </div>
        </AppProvider>
              )}
        </>
  );
}
