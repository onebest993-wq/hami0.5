import React, { useState, useEffect, useTransition, Suspense, type ReactElement } from "react";

// Core imports with error handling
import { FontInjector } from "./components/shared/FontInjector";
import { HamiMotionConfig } from "./components/shared/HamiMotionConfig";
import { AppProvider } from "./context/AppContext";
import { AuthProvider, useAppRootAuth, isSuperAdminUser } from "./context/AuthContext";
import { GlobalErrorBoundary } from "./components/shared/GlobalErrorBoundary";
import { debug } from "./utils/debug";
import { clearCacheIfNeeded } from "./utils/constants";
import { LawyerDashboardGate } from "@/app/bootstrap/LawyerDashboardGate";
import { SecurityInitializerGate as AppSecurityInitializer } from "@/app/bootstrap/SecurityInitializerGate";
import { SmartToast } from "./components/ui/smartToastBus";

const LazySmartToastContainer = React.lazy(() =>
    import("./components/ui/SmartToastContainer").then((m) => ({ default: m.SmartToastContainer })),
);
const LazySmartDialogContainer = React.lazy(() =>
    import("./components/ui/SmartDialogContainer").then((m) => ({ default: m.SmartDialogContainer })),
);

const CHUNK_RELOAD_SESSION_KEY = "hami:chunk-reload-once";
const VITE_STALE_IMPORT_RELOAD_KEY = "hami:vite-stale-import-reload";
// --- LAZY: Other heavy screens ---
const AdminDashboard = React.lazy(() => import("./components/AdminDashboard").then(m => ({ default: m.AdminDashboard })));
const AdminLawLibraryPage = React.lazy(() => import("./admin/page"));
const PrivacyPolicyScreen = React.lazy(() => import("./components/SettingsScreens").then(m => ({ default: m.PrivacyPolicyScreen })));
const SupportScreen = React.lazy(() => import("./components/SettingsScreens").then(m => ({ default: m.SupportScreen })));

type AppScreen =
  | 'lawyer'
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
    if (raw === 'profile') return 'lawyer';
    if (raw === 'lawyer' || raw === 'admin' || raw === 'privacy' || raw === 'support') {
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
      void import("./utils/production").then(({ initializeProduction, logBuildInfo }) => {
        initializeProduction();
        logBuildInfo();
        debug.log("✅ [App] System Ready");
      });

      try {
        sessionStorage.removeItem(CHUNK_RELOAD_SESSION_KEY);
        sessionStorage.removeItem(VITE_STALE_IMPORT_RELOAD_KEY);
      } catch {
        /* ignore */
      }

      clearCacheIfNeeded();
    };

    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(runDeferredAppBoot, { timeout: 1500 });
    } else {
      window.setTimeout(runDeferredAppBoot, 0);
    }
  }, []);

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
    document.body.style.backgroundColor = '#05060d';
    return () => {
      document.body.style.overflowY = '';
      document.body.style.backgroundColor = '';
    };
  }, []);

  const handleNavigateToAdmin = () => setScreen("admin");
  const handleBackToDashboard = () => setScreen("lawyer");
  const handleLogout = () => {
    setScreen("lawyer");
  };

  return (
    <GlobalErrorBoundary>
      <HamiMotionConfig>
      <AuthProvider>
        <AppContent
          screen={screen}
          setScreen={setScreen}
          role={role}
          handleNavigateToAdmin={handleNavigateToAdmin}
          handleBackToDashboard={handleBackToDashboard}
          handleLogout={handleLogout}
        />
      </AuthProvider>
      </HamiMotionConfig>
    </GlobalErrorBoundary>
  );
}

function AppContent(props: {
  screen: string;
  setScreen: (s: "lawyer" | "admin" | "adminLawLibrary" | "privacy" | "support") => void;
  role: "lawyer";
  handleNavigateToAdmin: () => void;
  handleBackToDashboard: () => void;
  handleLogout: () => void;
}) {
  const {
    screen, setScreen, role,
    handleNavigateToAdmin, handleBackToDashboard,
    handleLogout
  } = props;

  const { logout, user, isLoading } = useAppRootAuth();
  const isSuperAdmin = isSuperAdminUser(user);
  const adminGuardToastRef = React.useRef(false);
  const lawyerScreenVisitRef = React.useRef(0);
  const [lawyerScreenAnimate, setLawyerScreenAnimate] = React.useState(false);

  useEffect(() => {
    if (screen !== 'lawyer') return;
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

  return (
        <>
            <Suspense fallback={null}>
                <LazySmartToastContainer />
            </Suspense>
            <Suspense fallback={null}>
                <LazySmartDialogContainer />
            </Suspense>

        <AppProvider>
            <AppSecurityInitializer />
            <FontInjector />
            
            <div className="min-h-screen bg-[#05060d] text-white overflow-x-hidden">
                {screen === "lawyer" && (
                      <div key="lawyer" className={lawyerScreenAnimate ? 'hami-app-screen' : undefined}>
                        <LawyerDashboardGate
                          onLogout={onLogout}
                          onAppNavigate={(target) => {
                            if (target === "privacy") setScreen("privacy");
                            else if (target === "support") setScreen("support");
                          }}
                        />
                      </div>
                )}

                {screen === "admin" && isSuperAdmin && (
                  <Suspense fallback={SCREEN_LAZY_FALLBACK}>
                    <div key="admin" className="hami-app-screen">
                      <AdminDashboard
                        onLogout={handleBackToDashboard}
                        onOpenLawLibrary={() => setScreen("adminLawLibrary")}
                      />
                    </div>
                  </Suspense>
                )}

                {screen === "adminLawLibrary" && isSuperAdmin && (
                  <Suspense fallback={SCREEN_LAZY_FALLBACK}>
                    <div key="adminLawLibrary" className="hami-app-screen">
                      <AdminLawLibraryPage
                        onBack={() => setScreen("admin")}
                      />
                    </div>
                  </Suspense>
                )}

                {screen === "privacy" && (
                  <Suspense fallback={SCREEN_LAZY_FALLBACK}>
                    <div key="privacy" className="hami-app-screen">
                      <PrivacyPolicyScreen onBack={handleBackToDashboard} />
                    </div>
                  </Suspense>
                )}

                {screen === "support" && (
                  <Suspense fallback={SCREEN_LAZY_FALLBACK}>
                    <div key="support" className="hami-app-screen">
                      <SupportScreen onBack={handleBackToDashboard} />
                    </div>
                  </Suspense>
                )}

            </div>
        </AppProvider>
        </>
  );
}
