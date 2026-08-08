import React, { useState, useEffect, useTransition, Suspense, type ReactElement } from "react";
import { motion, AnimatePresence } from "motion/react";

// Core imports with error handling
import { FontInjector } from "./components/SharedComponents";
import { AppProvider } from "./context/AppContext";
import { AIGuardianProvider } from "./context/AIGuardianContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { GlobalErrorBoundary } from "./components/shared/GlobalErrorBoundary";
import { debug } from "./utils/debug";
import { screenTransitions } from "./animations/transitions";
import { initializeProduction, logBuildInfo, isProduction } from "./utils/production";
import { PerformanceMonitor } from "./utils/performanceMonitor";
import { clearCacheIfNeeded } from "./utils/constants";
import {
  prefetchAfterSplash,
  prefetchForAuthScreen,
  prefetchSecondaryAppScreens,
} from "./utils/screenPrefetch";
import { UserRole } from "./types/admin-types";

function isSuperAdminUser(user: { user_metadata?: unknown } | null): boolean {
  if (!user) return false;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  return meta.systemRole === UserRole.SUPER_ADMIN;
}

// --- LAZY: Defer security barrel + first-screen payloads from index chunk ---
const SecurityInitializer = React.lazy(() =>
  import("./security/SecurityInitializer").then((m) => ({ default: m.SecurityInitializer }))
);
const SplashScreen = React.lazy(() =>
  import("./components/SplashScreen").then((m) => ({ default: m.SplashScreen }))
);
const AuthScreens = React.lazy(() =>
  import("./components/AuthScreens").then((m) => ({ default: m.AuthScreens }))
);
const LoginScreen = React.lazy(() =>
  import("./components/auth/LoginScreen").then((m) => ({ default: m.LoginScreen }))
);
const PerformanceMonitorUI = React.lazy(() =>
  import("./components/shared/PerformanceMonitor").then((m) => ({ default: m.PerformanceMonitor }))
);

// --- Toast: Static (used by 25+ components) ---
import { SmartToast, SmartToastContainer } from "./components/ui/SmartToast";
import { SmartDialogContainer } from "./components/ui/SmartDialog";

// --- LAZY: Heavy dashboards (code-split for smaller initial bundle) ---
const LawyerDashboard = React.lazy(() =>
  import("./components/lawyer/LawyerDashboard").then((m) => ({ default: m.LawyerDashboard }))
);
// --- LAZY: Other heavy screens ---
const GhostInsightBar = React.lazy(() => 
  import("./components/ghost/GhostInsightBar")
    .then(m => ({ default: m.GhostInsightBar }))
    .catch((err): { default: () => null } => {
      debug.error("Failed to load GhostInsightBar:", err);
      return { default: (): null => null };
    })
);

const AdminDashboard = React.lazy(() => import("./components/AdminDashboard").then(m => ({ default: m.AdminDashboard })));
const AdminLawLibraryPage = React.lazy(() => import("./admin/page"));
const ProfileScreen = React.lazy(() => import("./components/ProfileScreen").then(m => ({ default: m.ProfileScreen })));
const MainSettingsScreen = React.lazy(() => import("./components/SettingsScreens").then(m => ({ default: m.MainSettingsScreen })));
const PrivacyPolicyScreen = React.lazy(() => import("./components/SettingsScreens").then(m => ({ default: m.PrivacyPolicyScreen })));
const SupportScreen = React.lazy(() => import("./components/SettingsScreens").then(m => ({ default: m.SupportScreen })));

type AppScreen =
  | 'splash'
  | 'auth'
  | 'lawyer'
  | 'profile'
  | 'admin'
  | 'adminLawLibrary'
  | 'settings'
  | 'privacy'
  | 'support';

const SCREEN_LAZY_FALLBACK: React.ReactNode = (
  <div className="min-h-screen bg-[#000000] flex items-center justify-center">
    <div className="text-[#E6C673] text-sm font-bold animate-pulse">جاري التحميل...</div>
  </div>
);

const LAST_SCREEN_KEY = 'hami:last-screen';

function hasPersistedSupabaseSession(): boolean {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.includes('-auth-token')) continue;
      const raw = localStorage.getItem(k);
      if (raw && raw !== 'null' && raw.includes('access_token')) return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

function readSavedScreen(): AppScreen | null {
  try {
    const raw = sessionStorage.getItem(LAST_SCREEN_KEY);
    if (
      raw === 'lawyer' ||
      raw === 'profile' ||
      raw === 'settings' ||
      raw === 'admin' ||
      raw === 'adminLawLibrary' ||
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
  
  // 1. Initialize Production Mode & Monitoring (Lazy)
  useEffect(() => {
     // 🆕 Start performance monitoring
     PerformanceMonitor.start('app-initialization');
     
     // ✅ تهيئة البيئة الإنتاجية
     initializeProduction();
     
     // ✅ طباعة معلومات البناء
     logBuildInfo();
     
     debug.log("✅ [App] System Ready");

     const finishBoot = () => {
       PerformanceMonitor.end('app-initialization');
       interface WindowWithLoader extends Window {
         removeLoader?: () => void;
       }
       const windowWithLoader = window as WindowWithLoader;
       if (windowWithLoader.removeLoader) {
         windowWithLoader.removeLoader();
       } else {
         const loader = document.getElementById('loading-overlay');
         if (loader) {
           loader.style.opacity = '0';
           window.setTimeout(() => loader.remove(), 400);
         }
       }
     };

     finishBoot();

     const runCacheMigration = () => {
       if (clearCacheIfNeeded()) {
         debug.log('✅ [App] تم تحديث الذاكرة المؤقتة');
       }
     };

     if (typeof requestIdleCallback !== 'undefined') {
       const idleId = requestIdleCallback(runCacheMigration, { timeout: 3_000 });
       return () => cancelIdleCallback(idleId);
     }

     const cacheTimer = window.setTimeout(runCacheMigration, 200);
     return () => window.clearTimeout(cacheTimer);
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
    const normalized = pathname.replace(/\/+$/u, "") || "/";
    if (normalized === "/admin") return "adminLawLibrary";
    return null;
  }, []);

  const [screen, setScreenInternal] = useState<AppScreen>(() => {
    const fromPath =
      (() => {
        const normalized = window.location.pathname.replace(/\/+$/u, '') || '/';
        return normalized === '/admin' ? ('adminLawLibrary' as const) : null;
      })();
    if (fromPath) return fromPath;
    if (hasPersistedSupabaseSession()) {
      return readSavedScreen() ?? 'lawyer';
    }
    return 'splash';
  });
  const [, startScreenTransition] = useTransition();
  const lastNonAdminScreenRef = React.useRef<AppScreen>(screen === "adminLawLibrary" ? "splash" : screen);
  const skipNextUrlSyncRef = React.useRef(false);

  useEffect(() => {
    if (screen !== "adminLawLibrary") {
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
    const isAdminPath = window.location.pathname === "/admin";
    if (screen === "adminLawLibrary" && !isAdminPath) {
      window.history.pushState({ screen }, "", "/admin");
      return;
    }
    if (screen !== "adminLawLibrary" && isAdminPath) {
      window.history.pushState({ screen }, "", "/");
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
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(false);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflowY = 'auto'; 
    document.body.style.backgroundColor = '#000000';
    return () => {
      document.body.style.overflowY = '';
      document.body.style.backgroundColor = '';
    };
  }, []);

  const handleSplashComplete = (_selectedRole: "lawyer") => {
    setScreen("auth");
  };

  const handleAuthSuccess = () => {
    setScreen("lawyer");
  };

  const handleNavigateToProfile = () => setScreen("profile");
  const handleNavigateToSettings = () => setScreen("settings");
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
          showPerformanceMonitor={showPerformanceMonitor}
          setShowPerformanceMonitor={setShowPerformanceMonitor}
          handleSplashComplete={handleSplashComplete}
          handleAuthSuccess={handleAuthSuccess}
          handleNavigateToProfile={handleNavigateToProfile}
          handleNavigateToSettings={handleNavigateToSettings}
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
  setScreen: (s: "splash" | "auth" | "lawyer" | "profile" | "admin" | "adminLawLibrary" | "settings" | "privacy" | "support") => void;
  role: "lawyer";
  showPerformanceMonitor: boolean;
  setShowPerformanceMonitor: (v: boolean) => void;
  handleSplashComplete: (role: "lawyer") => void;
  handleAuthSuccess: () => void;
  handleNavigateToProfile: () => void;
  handleNavigateToSettings: () => void;
  handleNavigateToAdmin: () => void;
  handleBackToDashboard: () => void;
  handleLogout: () => void;
}) {
  const {
    screen, setScreen, role, showPerformanceMonitor, setShowPerformanceMonitor,
    handleSplashComplete, handleAuthSuccess, handleNavigateToProfile,
    handleNavigateToSettings, handleNavigateToAdmin, handleBackToDashboard,
    handleLogout
  } = props;

  const { logout, user, isLoading } = useAuth();
  const isSuperAdmin = isSuperAdminUser(user);
  const adminGuardToastRef = React.useRef(false);
  const [authBootTimedOut, setAuthBootTimedOut] = React.useState(false);

  useEffect(() => {
    if (!isLoading) {
      setAuthBootTimedOut(false);
      return;
    }
    const t = window.setTimeout(() => setAuthBootTimedOut(true), 9_000);
    return () => window.clearTimeout(t);
  }, [isLoading]);

  useEffect(() => {
    if (screen === 'splash' || screen === 'auth') return;
    try {
      sessionStorage.setItem(LAST_SCREEN_KEY, screen);
    } catch {
      /* ignore */
    }
  }, [screen]);

  const onLogout = () => {
    logout().catch(() => {});
    handleLogout();
  };

  useEffect(() => {
    if (user && (screen === "auth" || screen === "splash")) {
      setScreen(isSuperAdmin ? "admin" : "lawyer");
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
    if (screen === "splash") {
      prefetchAfterSplash();
      return;
    }
    if (screen === "auth") {
      prefetchForAuthScreen();
      return;
    }
    if (screen === "lawyer") {
      prefetchSecondaryAppScreens();
    }
  }, [screen]);

  return (
        <AppProvider>
          <AIGuardianProvider>
            <Suspense fallback={null}>
              <SecurityInitializer />
            </Suspense>
            <FontInjector />
            
            {/* Performance Monitor Toggle (Dev Tool) */}
            {showPerformanceMonitor && (
              <Suspense fallback={null}>
                <PerformanceMonitorUI />
              </Suspense>
            )}
            
            <div className="min-h-screen bg-[#000000] text-white overflow-x-hidden">
              {isLoading ? (
                <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center gap-4 px-6">
                  <div className="text-[#E6C673] text-lg">جاري التحقق...</div>
                  {authBootTimedOut ? (
                    <button
                      type="button"
                      className="text-sm text-black bg-[#E6C673] px-4 py-2 rounded-lg font-bold"
                      onClick={() => window.location.reload()}
                    >
                      إعادة تحميل الصفحة
                    </button>
                  ) : null}
                </div>
              ) : !user ? (
                <Suspense fallback={SCREEN_LAZY_FALLBACK}>
                  <LoginScreen />
                </Suspense>
              ) : (
                <AnimatePresence mode="wait">
                {/* SPLASH SCREEN */}
                {screen === "splash" && (
                  <Suspense fallback={SCREEN_LAZY_FALLBACK}>
                    <motion.div
                      key="splash"
                      {...screenTransitions.splash}
                    >
                      <SplashScreen onComplete={handleSplashComplete} />
                    </motion.div>
                  </Suspense>
                )}

                {/* AUTH SCREEN */}
                {screen === "auth" && (
                  <Suspense fallback={SCREEN_LAZY_FALLBACK}>
                    <motion.div
                      key="auth"
                      {...screenTransitions.auth}
                    >
                      <AuthScreens
                        onLogin={handleAuthSuccess}
                        onBack={() => setScreen("splash")}
                      />
                    </motion.div>
                  </Suspense>
                )}

                {/* LAWYER DASHBOARD */}
                {screen === "lawyer" && (
                  <Suspense fallback={SCREEN_LAZY_FALLBACK}>
                    <motion.div
                      key="lawyer"
                      {...screenTransitions.main}
                    >
                      <LawyerDashboard
                        onLogout={onLogout}
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
                      <ProfileScreen
                        onBack={handleBackToDashboard}
                        role={role}
                        onNavigate={(target) => {
                          if (target === "privacy") setScreen("privacy");
                          else if (target === "support") setScreen("support");
                          else if (target === "settings") setScreen("settings");
                        }}
                      />
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

                {/* SETTINGS SCREENS */}
                {screen === "settings" && (
                  <Suspense fallback={SCREEN_LAZY_FALLBACK}>
                    <motion.div
                      key="settings"
                      {...screenTransitions.secondary}
                    >
                      <MainSettingsScreen
                        onBack={handleBackToDashboard}
                        onNavigate={(target) => {
                          if (target === "privacy") setScreen("privacy");
                          else if (target === "support") setScreen("support");
                        }}
                        onLogout={onLogout}
                        showPerformanceMonitor={showPerformanceMonitor}
                        onTogglePerformanceMonitor={setShowPerformanceMonitor}
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
                      <PrivacyPolicyScreen onBack={() => setScreen("settings")} />
                    </motion.div>
                  </Suspense>
                )}

                {screen === "support" && (
                  <Suspense fallback={SCREEN_LAZY_FALLBACK}>
                    <motion.div
                      key="support"
                      {...screenTransitions.secondary}
                    >
                      <SupportScreen onBack={() => setScreen("settings")} />
                    </motion.div>
                  </Suspense>
                )}
                </AnimatePresence>
              )}

              <SmartToastContainer />
              <SmartDialogContainer />

              {/* Ghost Insight Bar */}
              {user && screen === "lawyer" ? (
                <Suspense fallback={null}>
                  <GhostInsightBar />
                </Suspense>
              ) : null}
            </div>
          </AIGuardianProvider>
        </AppProvider>
  );
}
