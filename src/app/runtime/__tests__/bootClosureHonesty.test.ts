import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { injectCriticalModulePreloads } from '@/vite-plugins/hamiBootScriptOrder';

const root = process.cwd();

describe('boot closure honesty', () => {
    it('index يبدأ kickoffBootCriticalPreload الذي يشغّل mount داخلياً', () => {
        const index = fs.readFileSync(path.join(root, 'src/index.tsx'), 'utf8');
        expect(index).toContain('kickoffBootCriticalPreload');
        expect(index).not.toContain("import('@/boot/mountApplication')");
        const preload = fs.readFileSync(path.join(root, 'src/boot/bootCriticalPreload.ts'), 'utf8');
        expect(preload).toContain('startApplicationBoot');
        const kickIdx = index.indexOf('kickoffBootCriticalPreload');
        const preambleIdx = index.indexOf("import('@/boot/bootEntryPreamble')");
        expect(kickIdx).toBeGreaterThan(-1);
        expect(preambleIdx).toBeGreaterThan(kickIdx);
    });

    it('index يبدأ stem اللوحة قبل kickoffBootCriticalPreload عندما يُسمح بتسخين اللوحة', () => {
        const index = fs.readFileSync(path.join(root, 'src/index.tsx'), 'utf8');
        const stemIdx = index.indexOf("import('@/app/runtime/lawyerDashboardLoader')");
        const kickIdx = index.indexOf('kickoffBootCriticalPreload()');
        expect(stemIdx).toBeGreaterThan(-1);
        expect(kickIdx).toBeGreaterThan(stemIdx);
        expect(index).toContain('loadLawyerDashboardModule');
        expect(index).toContain('shouldPreloadLawyerDashboardBoard');
        expect(index).toContain('prefetchLawyerAuthLane');
        expect(index).not.toContain("import('@/app/components/lawyer/dashboard/LawyerDashboardInner')");
    });

    it('bootCriticalPreload يوازي React و Shell/Gate؛ chunk اللوحة stem منفصل عن Promise.all', () => {
        const preload = fs.readFileSync(path.join(root, 'src/boot/bootCriticalPreload.ts'), 'utf8');
        expect(preload).toContain("import('react')");
        expect(preload).toContain("import('react-dom/client')");
        expect(preload).toContain("import('@/boot/appModule')");
        expect(preload).toContain('loadAppRuntimeShellModule');
        expect(preload).toContain('loadLawyerDashboardGateModule');
        expect(preload).toContain('shouldPreloadLawyerDashboardBoard');
        expect(preload).toContain('void preloadLawyerDashboardChunk()');
        expect(preload).toContain('requestAnimationFrame');
        expect(preload).toContain('kickoffFirstTabPreload');
        expect(preload).not.toContain('prefetchLawyerDashboardMinimalBoot');
        expect(preload).not.toContain('LawyerDashboardMainView');
        expect(preload).toContain('prefetchLawyerDashboardInner');
        expect(preload).not.toContain('LawyerDashboardQuantumShell');
        expect(preload).not.toContain('warmLawyerDashboardFirstTabChunks');
        const criticalFn = preload.slice(preload.indexOf('export function kickoffBootCriticalPreload'));
        expect(criticalFn).toContain('kickoffFirstTabPreload()');
        expect(criticalFn).toMatch(/Promise\.all\([\s\S]*kickoffFirstTabPreload\(\)/);
        expect(criticalFn).not.toContain('homeDockBootGate');
        expect(preload).not.toContain('homeDockBootGate');
        expect(preload).toContain('prefetchHomeTabContent');
        expect(preload).toContain('prefetchCommandHubTiles');
        expect(preload).toContain('prefetchLawyerHomeHubCardModule');
        expect(preload).not.toContain('preloadLawyerDashboardHeaderShellChunks');
        const dashChunk = fs.readFileSync(
            path.join(root, 'src/app/bootstrap/lawyerDashboardChunk.ts'),
            'utf8',
        );
        expect(dashChunk).toContain('onBootContentReady');
        expect(dashChunk).toContain('preloadLawyerDashboardHeaderShellChunks');
        expect(preload).not.toMatch(
            /Promise\.all\(\[[\s\S]*preloadLawyerDashboardChunk/,
        );
        expect(preload).toContain('kickoffBootHeavyPreload');
        expect(preload).toContain('startApplicationBoot');
        expect(preload).not.toContain('setTimeout(kickoffBootHeavyPreload, 300)');
    });

    it('mountApplication لا يحجب createRoot على clientEnv', () => {
        const mount = fs.readFileSync(path.join(root, 'src/boot/mountApplication.ts'), 'utf8');
        expect(mount).toContain('clientEnvPromise');
        expect(mount).toContain('void clientEnvPromise.catch');
        expect(mount).toContain("@/app/bootstrap/homeMainGridPaintGate");
        const allBlock = mount.match(/Promise\.all\(\[([\s\S]*?)\]\)/)?.[1] ?? '';
        expect(allBlock).not.toContain('assertClientEnvOrThrow');
    });

    it('nativeBridgeReady لا يشترط PrivacyScreen للجسر ولا يعطّله', () => {
        const bridge = fs.readFileSync(path.join(root, 'src/app/runtime/nativeBridgeReady.ts'), 'utf8');
        expect(bridge).toContain('App.getState()');
        expect(bridge).not.toMatch(/await PrivacyScreen\.disable/);
        expect(bridge).not.toMatch(/if \(!Capacitor\.isPluginAvailable\('PrivacyScreen'\)\) return false/);
    });

    it('MainActivity يبقي splash حتى HamiBoot.notifyReady (حدث — بلا poll)', () => {
        const main = fs.readFileSync(
            path.join(root, 'scripts/native-ready/android/java/MainActivity.java'),
            'utf8',
        );
        expect(main).toContain('HamiBootPlugin');
        expect(main).toContain('HamiPrivacyPlugin');
        expect(main).toContain('onUserLeaveHint');
        expect(main).toContain('setReadyListener');
        expect(main).toContain('SAFETY_FAILSAFE_MS');
        expect(main).toContain('setOnExitAnimationListener');
        expect(main).toContain('provider -> provider.remove()');
        expect(main).toContain('BOOT_OVERLAY_FADE_MS');
        expect(main).toContain('attachBootOverlay');
        expect(main).toContain('fadeAndRemoveBootOverlay');
        expect(main).not.toContain('fadeOutSplash');
        expect(main).not.toContain('SPLASH_FADE_MS');
        expect(main).not.toContain('Thread.sleep');
        expect(main).toContain('revealSystemBarsFromLaunch');
        expect(main).toContain('#0A0F1C');
        expect(main).not.toContain('warmRestore');
        expect(main).not.toContain('hamiAppRuntimeReady');
        expect(main).not.toContain('evaluateJavascript');
        expect(main).not.toContain('pollBootRevealed');
        expect(main).not.toContain('SPLASH_POLL_MS');
    });

    it('hami-boot.js يفوّض الشعار للـ splash الأصلي على Capacitor', () => {
        const boot = fs.readFileSync(path.join(root, 'public/hami-boot.js'), 'utf8');
        expect(boot).toContain('data-hami-native-splash-delegated');
    });

    it('النواة تختم المنتج كهاتف/لوحي من أول بايت — بلا native=1 على Vite', () => {
        const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
        expect(html).toContain('href="/favicon.svg"');
        expect(html).toContain('data-hami-app="handheld"');
        expect(html).toContain('data-hami-color-mode="dark"');
        expect(html).toContain('name="color-scheme"');
        expect(html).not.toContain('fonts.googleapis.com');
        expect(html).not.toContain('hami-handheld-app');
        expect(html).toContain('interactive-widget=resizes-content');
        const boot = fs.readFileSync(path.join(root, 'public/hami-boot.js'), 'utf8');
        expect(boot).toContain("setAttribute('data-hami-app', 'handheld')");
        expect(boot).toContain("setAttribute('data-hami-color-mode'");
        expect(boot).toContain('glassPanelBg');
        expect(boot).toContain("setAttribute('data-hami-device'");
        expect(boot).not.toContain('hami-handheld-app');
        expect(boot).not.toContain('data-hami-pointer');
        const shellBoot = fs.readFileSync(path.join(root, 'src/app/runtime/capacitorShellBoot.ts'), 'utf8');
        expect(shellBoot).toContain('applyHandheldAppKernel');
        expect(shellBoot).not.toContain('bootNativePlatform');
        expect(shellBoot).not.toContain('kickoffSystemBarsStyle');
        expect((shellBoot.match(/SystemBars\.setStyle/g) ?? []).length).toBe(1);
        const preload = fs.readFileSync(path.join(root, 'src/boot/bootCriticalPreload.ts'), 'utf8');
        expect(preload).not.toContain('applyHandheldAppKernel');
        expect(preload).not.toContain('handheldAppKernel');
        expect(preload).not.toContain('sectionPrefetchPolicy');
        const css = fs.readFileSync(path.join(root, 'public/hami-boot-shell.css'), 'utf8');
        expect(css).toContain("html[data-hami-app='handheld']");
        expect(css).not.toContain('hami-handheld-app');
        const nativePlat = fs.readFileSync(path.join(root, 'src/app/runtime/nativePlatform.ts'), 'utf8');
        expect(nativePlat).toContain('detectEarlyAndroidCapacitorShell');
        expect(nativePlat).not.toContain('isIosNativeShell');
        const manifest = fs.readFileSync(
            path.join(root, 'scripts/native-ready/android/AndroidManifest.xml'),
            'utf8',
        );
        expect(manifest).toContain('<supports-screens');
        expect(manifest).toContain('android:scheme="iq.hami.legal"');
        expect(manifest).toContain('android.intent.category.BROWSABLE');
        const iosSnippet = fs.readFileSync(
            path.join(root, 'scripts/native-ready/biometric-ios-Info.plist.snippet.xml'),
            'utf8',
        );
        expect(iosSnippet).toContain('UIDeviceFamily');
        const policy = fs.readFileSync(path.join(root, 'src/app/runtime/sectionPrefetchPolicy.ts'), 'utf8');
        expect(policy).toContain('isSectionBackgroundPrefetchAllowed');
        expect(policy).toContain("from '@/app/services/settings/settingsSnapshot'");
        expect(policy).not.toContain("from '@/app/services/settings/settingsRuntime'");
        for (const rel of [
            'src/app/runtime/prefetchScheduler.ts',
            'src/app/runtime/nativeSecurityBoot.ts',
            'src/app/runtime/privacyScreenSession.ts',
            'src/app/runtime/nativeBiometricEnrollmentStore.ts',
            'src/app/runtime/dashboardPostInteractiveWarm.ts',
            'src/app/services/settings/localOnlyGuard.ts',
        ]) {
            const src = fs.readFileSync(path.join(root, rel), 'utf8');
            expect(
                src.includes("settings/settingsSnapshot'") || src.includes("from './settingsSnapshot'"),
                rel,
            ).toBe(true);
            expect(src, rel).not.toContain("from '@/app/services/settings/settingsRuntime'");
            expect(src, rel).not.toContain("from './settingsRuntime'");
        }
        expect(policy).not.toContain("from '@/app/runtime/nativePlatform'");
        const lite = fs.readFileSync(path.join(root, 'src/app/runtime/devicePerformanceTier.ts'), 'utf8');
        expect(lite).not.toContain("from '@/app/runtime/nativePlatform'");
        expect(lite).toContain('isNativeShellStampedOnDom');
        const criminal = fs.readFileSync(path.join(root, 'src/app/runtime/criminalBootHydrator.ts'), 'utf8');
        expect(criminal).toContain('isSectionBackgroundPrefetchAllowed');
        expect(criminal).not.toContain('prefetchScreens === false');
        expect(criminal).toContain('hami:dashboard-interactive');
        expect(criminal).toContain('scheduleHydrate');
        expect(criminal).toContain('maybeHydrateIfAlreadyReady');
        expect(criminal).not.toMatch(
            /addEventListener\(BOOT_REVEAL_DONE_EVENT,\s*onBootRevealDone/,
        );
        expect(criminal).not.toMatch(
            /BOOT_REVEAL_DONE_EVENT,\s*onBootRevealDone,\s*\{\s*once:\s*true\s*\}/,
        );
    });

    it('hami-boot.js يكشف Android عبر https://localhost قبل Capacitor', () => {
        const boot = fs.readFileSync(path.join(root, 'public/hami-boot.js'), 'utf8');
        expect(boot).toContain('capAndroidHost');
        expect(boot).toContain("loc.protocol === 'https:'");
        expect(boot).toContain("loc.hostname === 'localhost'");
        expect(boot).toContain('data-hami-platform');
        expect(boot).toContain("'android'");
    });

    it('getBootRevealMinMs صفر دائماً — سطح صامت بلا حد أدنى', () => {
        const reveal = fs.readFileSync(path.join(root, 'src/app/bootstrap/bootReveal.ts'), 'utf8');
        expect(reveal).not.toContain('BOOT_REVEAL_MIN_MS = 520');
        expect(reveal).toMatch(/export function getBootRevealMinMs\(\)[\s\S]*?return 0;/);
        expect(reveal).not.toContain('isBootCapacitorNativePlatform');
    });

    it('Android splash يقفل النسبة — شعار 160dp بلا hami_splash_brand القديم', () => {
        const splash = fs.readFileSync(
            path.join(root, 'android/app/src/main/res/drawable/splash_screen.xml'),
            'utf8',
        );
        const styles = fs.readFileSync(
            path.join(root, 'android/app/src/main/res/values/styles.xml'),
            'utf8',
        );
        const launch = fs.readFileSync(
            path.join(root, 'android/app/src/main/res/drawable/splash_launch_brand.xml'),
            'utf8',
        );
        const icon = fs.readFileSync(
            path.join(root, 'android/app/src/main/res/drawable/splash_icon.xml'),
            'utf8',
        );
        const overlay = fs.readFileSync(
            path.join(root, 'android/app/src/main/res/layout/hami_boot_overlay.xml'),
            'utf8',
        );
        const preload = fs.readFileSync(path.join(root, 'src/boot/bootCriticalPreload.ts'), 'utf8');
        expect(splash).not.toContain('hami_splash_brand');
        expect(styles).toContain('@drawable/splash_icon');
        expect(styles).not.toContain('splash_launch_brand');
        expect(icon).toContain('hami_splash_logo_padded');
        expect(overlay).toContain('android:scaleType="fitCenter"');
        expect(overlay).toContain('HamiBootProgressView');
        expect(launch).not.toContain('hami_splash_brand');
        expect(preload).not.toContain('notifyNativeBootReady');
    });

    it('Capacitor SplashScreen لا يُخفى تلقائياً — لون الثيم لا الأسود الخام', () => {
        const cap = fs.readFileSync(path.join(root, 'capacitor.config.ts'), 'utf8');
        expect(cap).toContain('SplashScreen:');
        expect(cap).toContain('launchAutoHide: false');
        expect(cap).toContain('splashFullScreen: false');
        expect(cap).toContain('splashImmersive: false');
        expect(cap).toContain("backgroundColor: '#0A0F1C'");
        expect(cap).toContain("androidSplashResourceName: 'splash'");
        expect(cap).toContain("androidScaleType: 'FIT_CENTER'");
        const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');
        expect(pkg).toContain('"@capacitor/splash-screen"');
        const splashJs = fs.readFileSync(path.join(root, 'src/app/runtime/nativeBootSplash.ts'), 'utf8');
        expect(splashJs).toContain('@capacitor/splash-screen');
        expect(splashJs).toContain('SplashScreen.hide');
        expect(splashJs).toContain('fadeOutDuration: 0');
        expect(cap).toContain('launchFadeOutDuration: 0');
        const styles = fs.readFileSync(
            path.join(root, 'android/app/src/main/res/values/styles.xml'),
            'utf8',
        );
        expect(styles).toContain('android:windowBackground');
        expect(styles).toContain('@drawable/splash_screen');
        expect(styles).toContain('android:background');
        expect(styles).toContain('@color/splash_background');
        expect(styles).not.toContain('android:background">@null');
    });

    it('injectCriticalModulePreloads يضيف boot-runtime و vendor-react', () => {
        const html = '<html><head></head><body><script type="module" src="/assets/index-x.js"></script></body></html>';
        const patched = injectCriticalModulePreloads(html, [
            'boot-runtime-abc.js',
            'vendor-react-def.js',
            'vendor-ui-ghi.js',
        ]);
        expect(patched).toContain('modulepreload');
        expect(patched).toContain('/assets/boot-runtime-abc.js');
        expect(patched).toContain('/assets/vendor-react-def.js');
    });

    it('vite modulePreload يسمح vendor-react و boot-runtime', () => {
        const vite = fs.readFileSync(path.join(root, 'vite.config.mts'), 'utf8');
        expect(vite).toMatch(/vendor-react\|boot-runtime/);
    });

    it('hami-boot.js لا يزيل static shell فوراً على جلسة دافئة؛ الحارس لا يتخطى طبقة عالقة', () => {
        const boot = fs.readFileSync(path.join(root, 'public/hami-boot.js'), 'utf8');
        expect(boot).toContain('hami_boot_complete');
        expect(boot).not.toMatch(/warmShell\.parentNode\.removeChild/);
        const guard = boot.slice(boot.indexOf('window.setTimeout(function ()'));
        expect(guard).toContain('hami-static-boot');
        expect(guard).toContain('isAppRuntimeReady');
        expect(boot).toContain('dataset.hamiAppRuntimeReady');
        expect(guard).not.toMatch(/if \(window\.__hamiBootRevealDone__ === true\) return;/);
        expect(guard).not.toMatch(/if \(sessionStorage\.getItem\('hami_boot_complete'\) === '1'\) return;/);
        expect(boot).toContain('isViteDevPage');
        expect(boot).toContain("return 120000");
        expect(boot).toContain('dismissBootFailureLayer');
        expect(boot).toContain('hami:app-runtime-ready');
        expect(boot).not.toMatch(/data-hami-demo-boot'\) === '1'\) \{\s*return 4000;/);
    });

    it('hami-boot.js لا يبتلع TDZ / is not defined كخطأ قابل للتجاهل', () => {
        const boot = fs.readFileSync(path.join(root, 'public/hami-boot.js'), 'utf8');
        const recover = boot.slice(
            boot.indexOf('function isRecoverableBootError'),
            boot.indexOf('window.removeLoader'),
        );
        expect(recover).not.toContain('before initialization');
        expect(recover).not.toContain('is not defined');
        expect(recover).toContain('Failed to fetch dynamically imported module');
        expect(recover).toContain('StorageEncryptionError');
        expect(recover).toContain('without encryption');
    });

    it('AppResolvedRuntime يعلن الجاهزية في useLayoutEffect', () => {
        const runtime = fs.readFileSync(path.join(root, 'src/app/AppResolvedRuntime.tsx'), 'utf8');
        expect(runtime).toContain('useLayoutEffect');
        expect(runtime).toContain('hamiAppRuntimeReady');
    });

    it('vite يُبقي lawyerDashboardLoader في boot-runtime وstem اللوحة chunk منفصل', () => {
        const vite = fs.readFileSync(path.join(root, 'vite.config.mts'), 'utf8');
        expect(vite).toContain('resolveLawyerDashboardStemChunk');
        expect(vite).toContain("return 'lawyer-dashboard-stem'");
        expect(vite).toContain('/src/app/runtime/lawyerDashboardLoader');
        expect(vite).not.toMatch(
            /resolveBootRuntimeChunk[\s\S]*LawyerDashboard\.tsx/,
        );
        expect(vite).toContain('resolveLawyerHomePaintChunk');
        expect(vite).toContain("return 'lawyer-home-paint'");
        expect(vite).toContain("return 'lawyer-home-tab-content'");
        expect(vite).toContain("return 'lawyer-home-command-hub'");
        expect(vite).toContain("return 'lawyer-home-forum-profile'");
        expect(vite).toContain("return 'lawyer-home-hub-card'");
        expect(vite).not.toContain("return 'lawyer-home-hub-secretary'");
        expect(vite).toContain("return 'lawyer-home-stem-icons'");
        expect(vite).toContain("return 'app-workspace-scan-lite'");
        expect(vite).toContain("return 'hami-overlay-snap-lite'");
        expect(vite).toContain("return 'lawyer-boot-peek-lite'");
        expect(vite).toContain('/src/app/services/profile/lawyerProfileLocalRead');
        expect(vite).toContain("return 'hami-shell-lite'");
        expect(vite).toContain('/src/app/components/ui/smartToastBus');
        expect(vite).toMatch(/SmartToast\\\.\(ts\|tsx\|js\|jsx\)/);
        expect(vite).not.toMatch(/\/ui\/SmartToast['`,]/);
        expect(vite).toContain("return 'lawyer-orchestration-lite'");
        expect(vite).toContain("return 'hami-persist-foundation'");
        expect(vite).toContain("return 'lawyer-workspace-store'");
        expect(vite).toContain("return 'lawyer-file-coerce'");
        expect(vite).toContain("return 'lawyer-lawsuit-lite'");
        expect(vite).toContain("return 'storage-domain-keys'");
        expect(vite).toContain('/src/app/infrastructure/persistence/storageDomains');
        expect(vite).toContain("return 'supabase-client-env'");
        expect(vite).toContain("return 'supabase-browser-client'");
        expect(vite).toContain("return 'boot-paint-leaves'");
        expect(vite).toContain("return 'home-boot-chrome'");
        expect(vite).toContain("return 'home-boot-loaders'");
        expect(vite).toContain("return 'boot-surface-paint-cache'");
        expect(vite).toContain("return 'boot-local-only'");
        expect(vite).toContain('/src/app/services/settings/localOnlyUrlPolicy');
        expect(vite).toContain('/src/app/services/settings/localOnlyBootArm');
        expect(vite).toContain("return 'dossier-storage-keys'");
        expect(vite).toContain('/src/app/services/dossierPersistence/dossierStorageKeys');
        expect(vite).toContain("return 'lawyer-quantum-lite'");
        expect(vite).toContain("return 'lawyer-persist'");
        expect(vite).toContain("return 'lawyer-dashboard-canvas'");
        expect(vite).not.toContain('resolveLawyerDashboardMinimalBootChunk');
        expect(vite).not.toContain('lawyer-dashboard-minimal-boot');
        expect(vite).not.toContain('minimalBootLoader');
        expect(vite).not.toContain('minimalHomeSurfaceLoader');
        expect(vite).toContain('/src/app/runtime/homeHubCardLoader');
        expect(vite).toContain('/src/app/runtime/commandHubTilesLoader');
        expect(vite).toContain('/src/app/runtime/homeTabContentLoader');
        expect(vite).toContain('/src/app/runtime/executionDossierPrimeHost');
        expect(
            fs.existsSync(path.join(root, 'src/app/runtime/minimalHomeSurfaceLoader.ts')),
        ).toBe(false);
        expect(vite).toContain("return 'vendor-lucide'");
        expect(vite).not.toMatch(/smartToastBus[\s\S]{0,200}lucideIcons/);
        expect(vite).toContain('/src/app/hooks/useReduceMotion');
        expect(vite).toContain('/src/app/workspace/useVaultDocsForClusterScan');
        expect(vite).toContain('/src/app/services/vault/vaultDocsWarmState');
        expect(vite).toContain('/src/app/runtime/overlaySnapClose');
        expect(vite).toContain('/src/app/hooks/useMobileKeyboardInset');
        expect(vite).toContain('/src/app/services/alerts/homeHubPerfMetrics');
        expect(vite).toContain('/src/app/services/alerts/homeHubSecretaryAlertsWarmCache');
        expect(vite).toContain('/src/app/services/profile/profileEvents');
        const paintGate = fs.readFileSync(
            path.join(root, 'src/app/bootstrap/homeMainGridPaintGate.ts'),
            'utf8',
        );
        expect(paintGate).not.toMatch(
            /import\s*\{[^}]*beforeBootShellReveal[^}]*\}\s*from\s*['"]@\/app\/bootstrap\/BootLaunchOrchestrator['"]/,
        );
        expect(paintGate).toContain("import('@/app/bootstrap/BootLaunchOrchestrator')");
        expect(vite).not.toContain("return 'lawyer-spark-runtime'");
        expect(vite).not.toContain('sparkRuntimeBridge');
        expect(vite).not.toContain('resolveLawyerSparkRuntimeChunk');
        expect(vite).toMatch(
            /const homePaintChunk = resolveLawyerHomePaintChunk\(id\)[\s\S]*resolveLawyerHomeTabContentChunk[\s\S]*resolveWorkspaceScanLiteChunk[\s\S]*resolveHamiOverlaySnapLiteChunk[\s\S]*resolveLawyerBootPeekLiteChunk[\s\S]*resolveLawyerHomeHubChunk[\s\S]*resolveHamiShellLiteChunk[\s\S]*resolveLawyerWorkspaceStoreChunk[\s\S]*resolveLawyerFileCoerceChunk[\s\S]*resolveLawyerOrchestrationLiteChunk[\s\S]*resolveLawyerBootSharedChunk[\s\S]*resolveLawyerDashboardCanvasChunk/,
        );
    });

    it('authHooks لا يسحب AuthProvider؛ الهيدر يقرأ الكاش الخام؛ البحث لا يثبت fuse', () => {
        const hooks = fs.readFileSync(path.join(root, 'src/app/context/authHooks.ts'), 'utf8');
        expect(hooks).not.toContain("from '@/app/context/AuthContext'");
        expect(hooks).toContain("from '@/app/context/authContextStore'");
        const authCtx = fs.readFileSync(path.join(root, 'src/app/context/AuthContext.tsx'), 'utf8');
        expect(authCtx).not.toMatch(/export \{\s*useAppRootAuth/);
        expect(authCtx).toContain("from '@/app/context/authHooks'");
        const header = fs.readFileSync(
            path.join(root, 'src/app/hooks/useLawyerProfileHeader.ts'),
            'utf8',
        );
        expect(header).toContain('getProfileWarmCacheRaw');
        expect(header).not.toContain('profileWarmCacheCore');
        expect(header).not.toContain('profileSanitizer');
        const settingsHooks = fs.readFileSync(
            path.join(root, 'src/app/context/lawyerSettings/lawyerSettingsHooks.ts'),
            'utf8',
        );
        expect(settingsHooks).toContain("from '@/app/services/settings/pushPolicy'");
        expect(settingsHooks).not.toContain("from '@/app/services/settings/apply'");
        const bootProvider = fs.readFileSync(
            path.join(root, 'src/app/context/lawyerSettings/LawyerSettingsBootProvider.tsx'),
            'utf8',
        );
        expect(bootProvider).toContain("from '@/app/services/settings/pushPolicy'");
        expect(bootProvider).not.toContain("from '@/app/services/settings/apply'");
        const loader = fs.readFileSync(
            path.join(root, 'src/app/runtime/globalSearchLoader.ts'),
            'utf8',
        );
        expect(loader).not.toContain("from '@/app/services/globalSearchFuse'");
        expect(loader).toContain("import('@/app/services/globalSearchFuse')");
    });

    it('بوابات الدخول والشروط خارج الإغلاق الثابت لمسار اللوحة', () => {
        const auth = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardAuth.tsx'),
            'utf8',
        );
        expect(auth).not.toMatch(/from ['"]@\/app\/bootstrap\/LawyerSignInGate['"]/);
        expect(auth).not.toMatch(/from ['"]@\/app\/bootstrap\/lawyerAuth\/LegalTermsConsentGate['"]/);
        expect(auth).not.toMatch(/from ['"]@\/app\/bootstrap\/lawyerAuth\/LawyerPasswordResetGate['"]/);
        expect(auth).toContain("import('@/app/bootstrap/lawyerAuth/LegalTermsConsentGate')");
        expect(auth).toContain("import('@/app/bootstrap/LawyerSignInGate')");
        expect(auth).toContain("import('@/app/bootstrap/lawyerAuth/LawyerPasswordResetGate')");
        expect(auth).toContain('prefetchAccountLegalDocuments');
        const gate = fs.readFileSync(
            path.join(root, 'src/app/bootstrap/lawyerAuth/LegalTermsConsentGate.tsx'),
            'utf8',
        );
        expect(gate).not.toMatch(/import\s*\{[^}]*ACCOUNT_LEGAL_DOCUMENTS/);
        expect(gate).toContain('loadAccountLegalDocuments');
    });
});
