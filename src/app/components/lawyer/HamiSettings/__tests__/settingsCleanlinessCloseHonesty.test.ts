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
        expect(existsSync(join(settingsDir, 'SettingsInstantShell.tsx'))).toBe(false);
        expect(existsSync(join(settingsDir, 'SettingsInstantShellHeader.tsx'))).toBe(false);
        expect(existsSync(join(settingsDir, 'settingsSectionRegistry.ts'))).toBe(false);
        expect(existsSync(join(settingsDir, 'settings-ui.tsx'))).toBe(false);
        expect(existsSync(join(settingsDir, 'settingsSectionPersistence.ts'))).toBe(false);
        expect(existsSync(join(settingsDir, 'settings-ui/index.ts'))).toBe(true);
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
        expect(paint).toContain('export function isSettingsLayerOpen');
        expect(existsSync(join(root, 'src/app/runtime/settingsInstantPaintChrome.ts'))).toBe(true);
        expect(existsSync(join(root, 'src/app/runtime/settingsInstantPaintInteract.ts'))).toBe(true);
        expect(existsSync(join(root, 'src/app/runtime/settingsInstantPaintDom.ts'))).toBe(true);
        const events = read('src/app/runtime/settingsShellEvents.ts');
        expect(events).toContain("export const SETTINGS_SHELL_HYDRATED_EVENT = 'hami:settings-shell-hydrated'");
        expect(events).toContain("export const SETTINGS_PRIME_HOST_EVENT = 'hami:settings-prime-host'");
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
        const shellStyle = read('src/app/components/lawyer/HamiSettings/settingsShellStyle.ts');
        expect(shellStyle).not.toContain('export { hexToRgba }');
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
    });

    it('hexToRgba مصدر واحد من glassSurfacePaint', () => {
        const paint = read('src/app/services/settings/glassSurfacePaint.ts');
        expect(paint).toContain('export function hexToRgba');
        const dash = read('src/app/hooks/lawyerDashboard/lawyerDashboardSurfaceUtils.ts');
        expect(dash).toContain("from '@/app/services/settings/glassSurfacePaint'");
        expect(dash).not.toMatch(/function hexToRgba/);
        const partsUtils = read('src/app/components/lawyer/LawyerDashboardParts/utils.ts');
        expect(partsUtils).not.toContain('hexToRgba');
        const shellStyle = read('src/app/components/lawyer/HamiSettings/settingsShellStyle.ts');
        expect(shellStyle).toContain('hexToRgba');
        expect(shellStyle).not.toMatch(/function hexToRgba/);
    });
});
