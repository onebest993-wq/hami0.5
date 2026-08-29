import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('native boot telemetry honesty', () => {
    it('nativeBootTelemetry يعرّض __hamiNativeBootReport على الأصلي', () => {
        const src = fs.readFileSync(path.join(root, 'src/app/runtime/nativeBootTelemetry.ts'), 'utf8');
        expect(src).toContain('__hamiNativeBootReport');
        expect(src).toContain('hami:native-boot-report:v1');
        expect(src).toContain('hubBootSettling');
        expect(src).toContain('home-hub-card-skeleton');
        expect(src).not.toContain('header-alerts-trigger');
    });

    it('markBootRevealDone ينشر telemetry على الأصلي', () => {
        const reveal = fs.readFileSync(path.join(root, 'src/app/bootstrap/bootReveal.ts'), 'utf8');
        expect(reveal).toContain('nativeBootTelemetry');
        expect(reveal).toContain('publishNativeBootTelemetry');
    });

    it('first-tab بلا Spark أو تبويب سكرتير', () => {
        const preload = fs.readFileSync(path.join(root, 'src/boot/bootCriticalPreload.ts'), 'utf8');
        const warm = fs.readFileSync(
            path.join(root, 'src/app/runtime/lawyerDashboardFirstTabWarm.ts'),
            'utf8',
        );
        expect(preload).not.toContain('loadHomeHubSparkBridge');
        expect(preload).not.toContain('loadSparkRuntime');
        expect(preload).not.toContain('HomeHubSecretaryPanel');
        expect(preload).toContain('prefetchLawyerDashboardInner');
        expect(preload).not.toContain('prefetchLawyerDashboardHeader');
        expect(preload).toContain('kickoffFirstTabPreload()');
        expect(preload).not.toContain('preloadLawyerDashboardHeaderShellChunks');
        expect(preload).toContain('prefetchHomeTabContent');
        expect(preload).toContain('prefetchCommandHubTiles');
        expect(preload).not.toContain('notifyNativeBootReady');
        expect(warm).not.toContain('loadHomeHubSparkBridge');
        expect(warm).not.toContain('loadSparkRuntime');
        expect(warm).not.toContain('sparkRuntimeBridge');
        expect(warm).not.toContain('HomeHubSecretaryPanel');
        expect(warm).toContain('warmLawyerDashboardFullBootChunks');
    });

    it('Hub لا يعتمد timeout 160ms عشوائي', () => {
        const hub = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/LawyerHomeHubCard/hooks/useLawyerHomeHubCard.ts'),
            'utf8',
        );
        const badges = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/LawyerHomeHubCard/hooks/useHomeHubBadgeSettling.ts',
            ),
            'utf8',
        );
        expect(hub).not.toContain('160');
        expect(badges).not.toContain('160');
        expect(badges).toContain('useHomeHubBootReveal');
        expect(badges).toContain('hub-boot-stable');
        const bootReveal = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/LawyerHomeHubCard/hooks/useHomeHubBootReveal.ts',
            ),
            'utf8',
        );
        expect(bootReveal).toContain('BOOT_REVEAL_DONE_EVENT');
        expect(hub).toContain('useHomeHubBadgeSettling');
    });

    it('MainActivity يُبقي splash حتى HamiBoot.notifyReady (بلا poll)', () => {
        const main = fs.readFileSync(
            path.join(root, 'android/app/src/main/java/iq/hami/legal/MainActivity.java'),
            'utf8',
        );
        expect(main).toContain('HamiBootPlugin');
        expect(main).toContain('setReadyListener');
        expect(main).toContain('setOnExitAnimationListener');
        expect(main).toContain('provider -> provider.remove()');
        expect(main).toContain('BOOT_OVERLAY_FADE_MS');
        expect(main).not.toContain('fadeOutSplash');
        expect(main).not.toContain('warmRestore');
        expect(main).not.toContain('hamiAppRuntimeReady');
        expect(main).not.toContain('evaluateJavascript');
        expect(main).not.toContain('pollBootRevealed');
    });

    it('markBootRevealDone يُخطر الغلاف الأصلي عبر nativeBootSplash', () => {
        const reveal = fs.readFileSync(path.join(root, 'src/app/bootstrap/bootReveal.ts'), 'utf8');
        expect(reveal).toContain('nativeBootSplash');
        expect(reveal).toContain('notifyNativeBootReady');
    });
});
