import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('settings remaining gaps honesty', () => {
    it('قشرة التبويب تُحفظ ديناميكياً بلا سحب قسم الإعدادات إلى جذع الطلاء', () => {
        const bridge = read('src/app/runtime/settingsInstantPaintBridge.ts');
        expect(bridge).toContain('persistSettingsSection');
        expect(bridge).toContain('SETTINGS_INSTANT_SECTION_EVENT');
        expect(bridge).toContain("import('@/app/components/lawyer/HamiSettings/settingsSectionLoad')");
        expect(bridge).not.toContain('window.setTimeout');
        expect(bridge).not.toMatch(
            /from ['"]@\/app\/components\/lawyer\/HamiSettings\/settingsSectionLoad['"]/,
        );
        const hook = read(
            'src/app/components/lawyer/HamiSettings/hooks/useSettingsActiveSection.ts',
        );
        expect(hook).toContain('SETTINGS_INSTANT_SECTION_EVENT');
        expect(hook).toContain('isSettingsSectionId');
    });

    it('بلع النقرة الشبحية يشمل إغلاق القشرة والتبويبات', () => {
        const interact = read('src/app/runtime/settingsInstantPaintInteract.ts');
        expect(interact).toContain('SETTINGS_GHOST_CLICK_SWALLOW_SELECTOR');
        expect(interact).toContain('settings-instant-close');
        expect(interact).toContain('data-instant-tab');
        expect(interact).toContain('settings-shell-close');
        expect(interact).toContain('header-settings-trigger');
    });

    it('منتقي الاستيراد ليس display:none — مسار iOS عبر hami-settings-file-input', () => {
        const backup = read(
            'src/app/components/lawyer/HamiSettings/data/BusinessBackupSection.tsx',
        );
        expect(backup).toContain('hami-settings-file-input');
        expect(backup).not.toMatch(/className=["']hidden["']/);
        const css = read('src/app/components/lawyer/HamiSettings/settingsChromeCards.css');
        expect(css).toContain('.hami-settings-file-input');
        expect(css).toContain('opacity: 0.001');
    });

    it('لا labelEn ميت ولا nowrap ميت بعد لفّ القفل التلقائي', () => {
        const types = read('src/app/services/settings/types.ts');
        expect(types).not.toContain('labelEn');
        const nav = read('src/app/services/settings/nav.ts');
        expect(nav).not.toContain('labelEn');
        expect(nav).toContain('export function isSettingsSectionId');
        const segmented = read('src/app/components/lawyer/HamiSettings/settings-ui/Segmented.tsx');
        expect(segmented).not.toContain('nowrap');
        const css = read('src/app/components/lawyer/HamiSettings/settingsChromeCards.css');
        expect(css).not.toContain('hami-settings-segmented-nowrap');
    });

    it('قشرة الطلاء داخل طبقة الـ overlay وHost يتبناها', () => {
        const adopt = read('src/app/runtime/settingsInstantPaintHostAdopt.ts');
        expect(adopt).toContain('adoptSettingsOverlayHostNode');
        expect(adopt).toContain('isSettingsOverlayHostReactReady');
        expect(adopt).toContain('isSettingsOverlayHostSectionInteractive');
        expect(adopt).toContain('isLaidOutSettingsInteractive');
        expect(adopt).toContain('SETTINGS_OVERLAY_REACT_READY_SELECTOR');
        expect(adopt).toContain('SETTINGS_OVERLAY_SECTION_INTERACTIVE_SELECTOR');
        expect(adopt).toContain('data-settings-section-cover');
        expect(adopt).toContain('aria-busy');
        const paint = read('src/app/runtime/settingsInstantPaint.ts');
        expect(paint).toContain('isSettingsOverlayHostSectionInteractive(host)');
        expect(paint).toContain('adoptSettingsOverlayHostNode');
        const bridge = read('src/app/runtime/settingsInstantPaintBridge.ts');
        expect(bridge).toContain("zIndex: '2'");
        expect(bridge).toContain("position: 'absolute'");
        expect(bridge).toContain('adoptSettingsOverlayHostNode');
        const host = read('src/app/components/lawyer/HamiSettings/HamiSettingsHost.tsx');
        expect(host).toContain('adoptSettingsOverlayHostNode');
        expect(host).toContain('createPortal');
        expect(host).not.toContain('settingsHostLayerClass');
        const exit = read('src/app/hooks/lawyerDashboard/settings/settingsShellExit.ts');
        expect(exit).toContain('isSettingsOverlayHostReactReady');
        expect(exit).toContain('beginHubLayerExit');
        expect(exit).not.toContain('setAttribute');
    });

    it('مسارات أيقونات التبويب مصدر واحد بين القشرة والهيدر', () => {
        const inner = read('src/app/services/settings/settingsNavIconInner.ts');
        expect(inner).toContain('SETTINGS_NAV_ICON_INNER');
        expect(inner).toContain('SETTINGS_CLOSE_ICON_INNER');
        const chrome = read('src/app/components/lawyer/HamiSettings/settingsStemIconsChrome.tsx');
        expect(chrome).toContain('SETTINGS_NAV_ICON_INNER');
        expect(chrome).not.toContain('<path');
        const markup = read('src/app/runtime/settingsInstantChromeMarkup.ts');
        expect(markup).toContain('SETTINGS_NAV_ICON_INNER');
        expect(markup).not.toContain('TAB_ICON_PATH');
    });
});
