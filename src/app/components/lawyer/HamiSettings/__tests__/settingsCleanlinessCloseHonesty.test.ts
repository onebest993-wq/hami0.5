import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const settingsDir = join(root, 'src/app/components/lawyer/HamiSettings');

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('settings cleanliness close honesty', () => {
    it('لا يعيد الملفات المحذوفة ولا برميل index في Host', () => {
        expect(existsSync(join(settingsDir, 'appearance/AppearanceReadabilityRows.tsx'))).toBe(false);
        expect(existsSync(join(settingsDir, 'SettingsInstantShell.tsx'))).toBe(false);
        expect(existsSync(join(settingsDir, 'SettingsInstantShellHeader.tsx'))).toBe(false);
        expect(existsSync(join(settingsDir, 'settingsSectionRegistry.ts'))).toBe(false);
        expect(existsSync(join(settingsDir, 'settings-ui.tsx'))).toBe(false);
        expect(existsSync(join(settingsDir, 'settingsSectionPersistence.ts'))).toBe(false);
        expect(existsSync(join(settingsDir, 'settings-ui/index.ts'))).toBe(true);
        expect(
            existsSync(join(root, 'src/app/context/lawyerSettings/useLawyerSettingsCloudSync.ts')),
        ).toBe(false);
        expect(existsSync(join(root, 'src/app/services/settings/settingsCapabilities.ts'))).toBe(
            false,
        );
        const host = read('src/app/components/lawyer/HamiSettings/HamiSettingsHost.tsx');
        expect(host).not.toContain("from '@/app/components/lawyer/HamiSettings/index'");
        expect(host).toContain('HamiSettingsApp');
        expect(host).toContain('isSettingsLayerOpen');
    });

    it('يزيل مزامنة rAF الميتة ومسار طلاء مكرّر', () => {
        const snap = read('src/app/services/settings/settingsShellSnap.ts');
        expect(snap).not.toContain('scheduleSettingsShellReactSync');
        expect(snap).not.toContain('requestAnimationFrame');
        expect(snap).not.toContain('shellSyncGen');
        const paint = read('src/app/runtime/settingsInstantPaint.ts');
        expect(paint).not.toContain('hostHasLaidOutChrome');
        expect(paint).not.toContain('revealSettingsWarmShell');
        expect(paint).toContain("from './settingsOverlayPresence'");
        expect(paint).toContain('isSettingsLayerOpen');
        expect(paint).not.toContain('isSettingsShellSnappedOpen');
        const presence = read('src/app/runtime/settingsOverlayPresence.ts');
        expect(presence).toContain('export function isSettingsLayerOpen');
        expect(presence).not.toContain('isSettingsShellSnappedOpen');
        expect(existsSync(join(root, 'src/app/runtime/settingsInstantPaintChrome.ts'))).toBe(true);
        expect(existsSync(join(root, 'src/app/runtime/settingsInstantPaintInteract.ts'))).toBe(true);
        expect(existsSync(join(root, 'src/app/runtime/settingsInstantPaintDom.ts'))).toBe(true);
        const events = read('src/app/runtime/settingsShellEvents.ts');
        expect(events).toContain("export const SETTINGS_SHELL_HYDRATED_EVENT = 'hami:settings-shell-hydrated'");
        expect(events).toContain("export const SETTINGS_PRIME_HOST_EVENT = 'hami:settings-prime-host'");
        expect(events).toContain("export const SETTINGS_INSTANT_DISMISS_EVENT = 'hami:settings-instant-dismiss'");
        expect(events).toContain("export const SETTINGS_INSTANT_SECTION_EVENT = 'hami:settings-instant-section'");
        const hook = read('src/app/hooks/lawyerDashboard/useLawyerDashboardSettings.ts');
        expect(hook).toContain("from '@/app/runtime/settingsShellEvents'");
        expect(hook).not.toContain("const SETTINGS_PRIME_HOST_EVENT = 'hami:settings-prime-host'");
        const loader = read('src/app/runtime/hamiSettingsLoader.ts');
        expect(loader).toContain("from '@/app/runtime/settingsShellEvents'");
        expect(loader).not.toContain("const SETTINGS_SHELL_HYDRATED_EVENT = 'hami:settings-shell-hydrated'");
    });

    it('مسار المفتاح وحلقات التركيز من مصدر واحد', () => {
        const track = read(
            'src/app/components/lawyer/HamiSettings/settings-ui/SettingsToggleTrack.tsx',
        );
        expect(track).toContain('hami-settings-toggle-track');
        expect(track).toContain('hami-settings-toggle-thumb');
        const toggle = read('src/app/components/lawyer/HamiSettings/settings-ui/Toggle.tsx');
        expect(toggle).toContain('SettingsToggleTrack');
        expect(toggle).not.toContain('hami-settings-toggle-track');
        const asyncToggle = read('src/app/components/lawyer/HamiSettings/AsyncSettingToggle.tsx');
        expect(asyncToggle).toContain('SettingsToggleTrack');
        expect(asyncToggle).toContain("from './settings-ui/tokens'");
        expect(asyncToggle).not.toContain('hami-settings-toggle-track');
        expect(asyncToggle).not.toMatch(/const SETTING_FOCUS_RING\s*=/);
        expect(
            existsSync(join(root, 'src/app/components/lawyer/HamiSettings/settingsShellStyle.ts')),
        ).toBe(false);
        const chrome = read('src/app/components/lawyer/HamiSettings/settingsShellChrome.ts');
        expect(chrome).not.toContain('export { hexToRgba }');
        expect(chrome).not.toContain('hexToRgba');
        const router = read('src/app/components/lawyer/HamiSettings/SettingsSectionRouter.tsx');
        expect(router).toContain('isSettingsLayerOpen');
        expect(router).not.toContain('isSettingsContentLive');
        const shell = read('src/app/components/lawyer/HamiSettings/SettingsShell.tsx');
        expect(shell).toContain('isSettingsLayerOpen');
        const guard = read(
            'src/app/components/lawyer/HamiSettings/hooks/useSettingsShellCloseGuard.ts',
        );
        expect(guard).toContain('isSettingsLayerOpen');
        expect(guard).not.toContain('isSettingsForceVisible');
        expect(guard).not.toContain('clearSettingsForceVisible');
    });

    it('hexToRgba مصدر واحد من glassSurfacePaint', () => {
        const paint = read('src/app/services/settings/glassSurfacePaint.ts');
        expect(paint).toContain('export function hexToRgba');
        const dash = read('src/app/hooks/lawyerDashboard/lawyerDashboardSurfaceUtils.ts');
        expect(dash).toContain("from '@/app/services/settings/glassSurfacePaint'");
        expect(dash).not.toMatch(/function hexToRgba/);
        const partsUtils = read('src/app/components/lawyer/LawyerDashboardParts/utils.ts');
        expect(partsUtils).not.toContain('hexToRgba');
        const chrome = read('src/app/components/lawyer/HamiSettings/settingsShellChrome.ts');
        expect(chrome).not.toContain('hexToRgba');
        expect(chrome).not.toMatch(/function hexToRgba/);
    });

    it('يزيل دوال/براميل ميتة وبقايا مزامنة لقطة الإعدادات', () => {
        const scale = read('src/app/services/settings/homeBlockScale.ts');
        expect(scale).not.toContain('resolveBlockSizeScale');
        expect(scale).not.toContain('hubExecutionTitleRem');
        const sentry = read('src/app/services/settings/settingsSentryReporting.ts');
        expect(sentry).not.toContain('resetSettingsSentryModuleForTests');
        const builtin = read('src/app/services/settings/builtInBehavior.ts');
        expect(builtin).not.toContain('BUILTIN_AUTO_SUMMARY');
        const runtime = read('src/app/services/settings/settingsRuntime.ts');
        expect(runtime).not.toContain('BUILTIN_AUTO_SUMMARY');
        expect(runtime).not.toContain('export { isCloudSyncBucketEnabled');
        expect(runtime).not.toContain('export { alertNotificationChannel');
        const barrel = read('src/app/services/settings/index.ts');
        expect(barrel).not.toContain('settingsCapabilities');
        expect(barrel).not.toContain("export { resolveThemeMode } from './apply'");
        const hydrator = read('src/app/runtime/settingsBootHydrator.ts');
        expect(hydrator).not.toContain('export function prefetchSettingsAfterBootReveal');
        expect(hydrator).not.toContain('export { SETTINGS_PRIME_HOST_EVENT');
        const app = read('src/app/components/lawyer/HamiSettings/HamiSettingsApp.tsx');
        expect(app).not.toContain('export type { HamiSettingsProps }');
        const host = read('src/app/components/lawyer/HamiSettings/HamiSettingsHost.tsx');
        expect(host).not.toContain('export type HamiSettingsHostProps');
    });
});
