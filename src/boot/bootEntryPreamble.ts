/**
 * تهيئة ما بعد أول بايت — SecureStore، إعدادات DOM، خلفية IndexedDB.
 * يُحمَّل ديناميكياً من index.tsx حتى لا يذوب داخل entry chunk.
 */
import { applyBootSurfacePaintFromStorage } from '@/app/services/settings/bootSurfacePaintCache';
import { kickoffBootShellSyncLite, getBootShellItemSync } from '@/boot/bootShellKickoff';

export async function runBootEntryPreamble(): Promise<void> {
    kickoffBootShellSyncLite();

    void import('@/app/runtime/deferredAppStyles').then((m) => m.ensureDeferredAppStylesLoaded());
    void import('@/app/runtime/overlayLayerHygiene').then((m) => m.bindOverlayLayerHygiene());

    const bootPaintApplied = applyBootSurfacePaintFromStorage();
    const settingsSyncReady =
        getBootShellItemSync('lawyer_settings') !== null || getBootShellItemSync('lawyer_theme') !== null;

    const chromeModPromise = import('@/app/bootstrap/homeBootChrome');
    const warmModPromise = import('@/app/services/profile/warmBootLawyerProfile');

    const [
        applyMod,
        snapshotMod,
        secureStoreMod,
        wallpaperMod,
        bootRevealMod,
    ] = await Promise.all([
        import('@/app/services/settings/apply'),
        import('@/app/services/settings/settingsSnapshot'),
        import('@/app/services/SecureStoreService'),
        import('@/app/services/settings/wallpaperPaintReady'),
        import('@/app/bootstrap/bootReveal'),
    ]);

    wallpaperMod.holdWallpaperCssImageUntilHomePainted();

    const SecureStoreService = secureStoreMod.default;
    SecureStoreService.kickoffBootShellSync();

    const { warmBootLawyerProfile, BOOT_PROFILE_WARM_BUDGET_MS } = await warmModPromise;
    const profileWarm = warmBootLawyerProfile(SecureStoreService);

    try {
        if (!bootPaintApplied || settingsSyncReady) {
            applyMod.applySettingsToDom(snapshotMod.getLawyerSettingsSnapshot());
        }
        if (bootRevealMod.isBootRevealDone() && !document.getElementById('hami-static-boot')) {
            document.documentElement.dataset.hamiBootRevealed = '1';
        }
        /* الكروم ينتظر التسخين داخلياً — لا نؤجّل بدء مقاطع المنزل حتى انتهاء IndexedDB */
        const { prepareHomeBootChrome } = await chromeModPromise;
        const chrome = prepareHomeBootChrome();
        await Promise.race([
            chrome,
            new Promise<void>((resolve) => {
                setTimeout(resolve, BOOT_PROFILE_WARM_BUDGET_MS);
            }),
        ]);
        void profileWarm.then(() => {
            void prepareHomeBootChrome();
            void import('@/app/bootstrap/BootLaunchOrchestrator').then((m) => m.seedBootLaunchFrame1());
        });
        void import('@/app/bootstrap/BootLaunchOrchestrator').then((m) => m.seedBootLaunchFrame1());
    } catch {
        try {
            document.documentElement.dataset.hamiHomeContainerBorder = '1';
            document.documentElement.dataset.hamiWallpaper = '0';
        } catch {
            /* ignore */
        }
    }

    bootRevealMod.onBootContentReady(() => {
        void import('@/app/runtime/deferredAppStyles').then((m) => m.scheduleDeferredAppStyles());
        void import('@/app/runtime/deferredGoogleFonts').then((m) => m.scheduleDeferredGoogleFonts());
    });

    const applyBootShellWallpaper = async () => {
        try {
            await SecureStoreService.ensureBootShellReady();
            const wallpaper = await applyMod.hydrateWallpaperFromSecureStore();
            if (wallpaper) {
                await Promise.race([
                    wallpaperMod.ensureWallpaperDecoded(wallpaper),
                    new Promise<void>((resolve) => {
                        setTimeout(resolve, 180);
                    }),
                ]);
            }
            wallpaperMod.releaseWallpaperCssImageHold();
            applyMod.applySettingsToDom(snapshotMod.getLawyerSettingsSnapshot());
            wallpaperMod.scheduleAfterHomeMainGridPaint(() => {
                wallpaperMod.releaseWallpaperCssImageHold();
                if (typeof document !== 'undefined' && document.getElementById('hami-static-boot')) {
                    applyMod.applySettingsToDom(snapshotMod.getLawyerSettingsSnapshot());
                }
            });
        } catch {
            wallpaperMod.releaseWallpaperCssImageHold();
        }
    };

    void applyBootShellWallpaper();

    void import('@/app/utils/consoleHygiene').then((m) => m.installConsoleHygiene());

    try {
        if (bootRevealMod.isDemoShellAuthBuild()) {
            bootRevealMod.applyInstantDemoBootFoundation();
        }
    } catch {
        /* ignore */
    }

    /* لا تُزل #hami-static-boot هنا — يُزال فقط بعد paint شبكة الرئيسية */

    if (typeof document !== 'undefined' && document.documentElement.getAttribute('data-hami-native') === '1') {
        void import('@/app/runtime/nativeCapacitorBoot').then((m) => m.bootNativeCapacitorShell());
    }
}
