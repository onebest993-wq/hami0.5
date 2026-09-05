import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('settings open size honesty', () => {
    it('جذع الشِل لا يسحب برميل الخدمات ولا محرّك الثيم عبر لون الكروم', () => {
        expect(existsSync(join(root, 'src/app/components/lawyer/HamiSettings/settingsShellChrome.ts'))).toBe(
            true,
        );
        const chrome = read('src/app/components/lawyer/HamiSettings/settingsShellChrome.ts');
        expect(chrome).toContain("from '@/app/services/settings/surfaceApplyTarget'");
        expect(chrome).not.toMatch(/from ['"]@\/app\/services\/settings['"]/);
        expect(chrome).not.toContain('resolveWallpaperSrc');
        expect(chrome).not.toContain('apply.ts');

        const shell = read('src/app/components/lawyer/HamiSettings/SettingsShell.tsx');
        expect(shell).toContain("from './settingsShellChrome'");
        expect(shell).not.toContain('settingsShellStyle');
        expect(shell).toContain("from '@/app/services/settings/nav'");
        expect(shell).not.toMatch(/from ['"]@\/app\/services\/settings['"]/);

        const header = read('src/app/components/lawyer/HamiSettings/SettingsShellHeader.tsx');
        expect(header).toContain("from '@/app/services/settings/nav'");
        expect(header).not.toMatch(/from ['"]@\/app\/services\/settings['"]/);
        expect(header).toContain('onPointerEnter');
        expect(header).toContain('onFocus');

        const security = read('src/app/components/lawyer/HamiSettings/security/SecuritySection.tsx');
        expect(security).toContain("from '@/app/services/settings/nav'");
        expect(security).not.toMatch(/from ['"]@\/app\/services\/settings['"]/);
    });

    it('خمول المنزل وفتح الأمان لا يستوردان مقطع المنظر', () => {
        const hostLife = read('src/app/hooks/lawyerDashboard/settings/useSettingsHostLifecycle.ts');
        expect(hostLife).toContain('prefetchSettingsShellChunks');
        expect(hostLife).not.toContain('settingsSectionLoad');
        expect(hostLife).not.toContain('AppearanceSection');
        expect(hostLife).not.toContain('prefetchSecondarySettingsSections');

        const warm = read('src/app/components/lawyer/HamiSettings/hooks/useSettingsSectionWarm.ts');
        expect(warm).toContain('prefetchSettingsSection(activeSection)');
        expect(warm).toContain('prefetchSettingsOpenTabChunks');
        expect(warm).not.toContain('prefetchSecondarySettingsSections');
        expect(warm).not.toContain('scheduleIdleWork');

        const load = read('src/app/components/lawyer/HamiSettings/settingsSectionLoad.ts');
        expect(load).not.toContain('prefetchSecondarySettingsSections');
        expect(load).toContain("import('./appearance/AppearanceSection')");
        expect(load).toContain('prefetchSettingsOpenTabChunks');
    });

    it('كشف الطبقة مصدر واحد — html إسقاط ولا يُقرأ في isSettingsLayerOpen', () => {
        const presence = read('src/app/runtime/settingsOverlayPresence.ts');
        expect(presence).toContain('export function isSettingsLayerOpen');
        expect(presence).toContain('markSettingsOverlayRevealed');
        expect(presence).toContain('clearSettingsOverlayPresence');
        expect(presence).not.toContain('isSettingsShellSnappedOpen');
        const paint = read('src/app/runtime/settingsInstantPaint.ts');
        expect(paint).toContain('markSettingsOverlayRevealed');
        expect(paint).toContain('clearSettingsOverlayPresence');
        expect(paint).not.toContain('isSettingsShellSnappedOpen');
        const close = read('src/app/hooks/lawyerDashboard/useLawyerDashboardSettings.ts');
        expect(close).toContain('concealSettingsWarmShell');
        expect(close).not.toContain('snapSettingsShellClose');
        expect(close).not.toContain('clearSettingsForceVisible');
        const chrome = read('src/app/components/lawyer/dashboard/useLawyerDashboardMainViewChrome.ts');
        expect(chrome).toContain("from '@/app/runtime/settingsOverlayPresence'");
        expect(chrome).not.toContain('isSettingsShellSnappedOpen');

        const exit = read('src/app/hooks/lawyerDashboard/settings/settingsShellExit.ts');
        expect(exit).toContain('beginHubLayerExit');
        expect(exit).toContain('SETTINGS_HUB_LAYER');
        expect(exit).not.toContain('document.documentElement');

        const cover = read('src/app/components/lawyer/dashboard/SettingsInstantPaintCover.tsx');
        expect(cover).toContain('isSettingsForceVisible');
        expect(cover).toContain('paintSettingsInstantChrome');
        expect(cover).toContain('isSettingsOverlayCssExiting');
        const paintSrc = read('src/app/runtime/settingsInstantPaint.ts');
        expect(paintSrc).toContain('isSettingsReopenSuppressed()');
        expect(paintSrc).toContain('isSettingsOverlayCssExiting');
        const adopt = read('src/app/runtime/settingsInstantPaintHostAdopt.ts');
        expect(adopt).toContain('layerOpen: false');
        expect(close).toContain('isSettingsOverlayCssExiting');
    });
});
