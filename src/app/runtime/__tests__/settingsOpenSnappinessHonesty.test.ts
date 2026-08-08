import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('settings open snappiness honesty', () => {
    it('MainView: Settings Entry sync بلا Suspense؛ الفتح عبر hook حي بلا requestArm', () => {
        const main = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardMainView.tsx'),
            'utf8',
        );
        expect(main).toContain('LawyerDashboardSettingsOverlayEntry');
        expect(main).not.toContain('LazySettingsOverlayEntry');
        const settingsIdx = main.indexOf('settingsLive ?');
        expect(settingsIdx).toBeGreaterThan(-1);
        const nextOverlay = main.indexOf('globalSearchLive ?', settingsIdx);
        const settingsBlock = main.slice(
            settingsIdx,
            nextOverlay > settingsIdx ? nextOverlay : undefined,
        );
        expect(settingsBlock).toContain('LawyerDashboardSettingsOverlayEntry');
        expect(settingsBlock).not.toContain('Suspense');
        const orch = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardCoreOrchestration.ts'),
            'utf8',
        );
        expect(orch).toContain('useLawyerDashboardSettings(shellAuthUserId)');
        expect(orch).toContain('settingsFeature');
        const stubs = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/createDeferredFeatureStubs.ts'),
            'utf8',
        );
        expect(stubs).not.toContain("requestArm('settings')");
        expect(stubs).not.toContain('openSettings:');
    });

    it('SettingsShell يغلق فوراً بعد تسليح التفاعل', () => {
        const shell = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/HamiSettings/SettingsShell.tsx'),
            'utf8',
        );
        expect(shell).toContain('isSettingsOverlayInteractionArmed');
        expect(shell).toContain('onPointerDown');
        expect(shell).toContain('requestCloseInstant');
    });

    it('كل التبويبات sync — بلا تحميل داخلي عند فتح المركز', () => {
        const registry = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/HamiSettings/settingsSectionRegistry.ts'),
            'utf8',
        );
        const index = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/HamiSettings/index.tsx'),
            'utf8',
        );
        expect(registry).toContain("resolved.set('appearance'");
        expect(registry).toContain("resolved.set('security'");
        expect(registry).toContain("resolved.set('data'");
        expect(index).not.toContain('panelsLive');
        expect(index).not.toContain('settings-panels-deferred');
        const router = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/HamiSettings/SettingsSectionRouter.tsx'),
            'utf8',
        );
        expect(router).not.toContain('settings-section-loading');
    });

    it('ثابت كبح إعادة الفتح مُصدَّر وقصير للتبديل السريع', () => {
        const paint = fs.readFileSync(
            path.join(root, 'src/app/runtime/settingsInstantPaint.ts'),
            'utf8',
        );
        expect(paint).toContain('export const SETTINGS_REOPEN_SUPPRESS_MS');
        expect(paint).toMatch(/SETTINGS_REOPEN_SUPPRESS_MS\s*=\s*90/);
        expect(paint).toContain('applySettingsOpaqueChrome');
        const fixtures = fs.readFileSync(
            path.join(root, 'e2e/helpers/settingsFixtures.ts'),
            'utf8',
        );
        expect(fixtures).toContain('SETTINGS_PERF_BUDGET');
        const host = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/HamiSettings/HamiSettingsHost.tsx'),
            'utf8',
        );
        expect(host).not.toContain('hydrateSettingsShellForInstantOpen');
        expect(host).not.toContain('warmSettingsOnOpen');
    });
});
