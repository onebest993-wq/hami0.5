import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('world-class settings close honesty', () => {
    it('الإغلاق يلتزم setShowSettings فوراً بلا rAF', () => {
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardSettings.ts'),
            'utf8',
        );
        expect(hook).toContain('setShowSettings(false)');
        expect(hook).toContain('executeSettingsOverlayClose');
        expect(hook).toContain('beginSettingsShellExit');
        expect(hook).not.toContain('scheduleSettingsShellReactSync');
        const css = [
            'settingsChrome.css',
            'settingsChromeOverlay.css',
            'settingsChromeCards.css',
        ]
            .map((file) =>
                fs.readFileSync(
                    path.join(root, 'src/app/components/lawyer/HamiSettings', file),
                    'utf8',
                ),
            )
            .join('\n');
        expect(css).toContain("html:not([data-hami-settings-open='1']):not([data-hami-settings-closing='1']) .hami-settings-overlay-host");
        expect(css).toContain("html[data-hami-overlay-unfreeze='1'][data-hami-settings-open='1']");
        expect(css).toContain("html[data-hami-native='1'][data-hami-settings-open='1'] [data-hami-lawyer-dashboard]");
    });

    it('S5: settingsHostMounted يبدأ من initialSession.open لا true على cold', () => {
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardSettings.ts'),
            'utf8',
        );
        expect(hook).toMatch(
            /settingsHostMounted,\s*setSettingsHostMounted\]\s*=\s*useState\(\(\)\s*=>\s*initialSession\.open\)/,
        );
        expect(hook).not.toMatch(/setSettingsHostMounted\]\s*=\s*useState\(true\)/);
    });

    it('S2: يمسح جلسة الإعدادات عند غياب جلسة محلية', () => {
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardSettings.ts'),
            'utf8',
        );
        expect(hook).toMatch(/hasLocalAppSession\(userId\)/);
        expect(hook).not.toMatch(/isRealSignedIn\(userId\)/);
        expect(hook).toMatch(/persistSettingsSessionOpen\(false\)/);
        expect(hook).toMatch(/setSettingsHostMounted\(false\)/);
    });

    it('S9: marks الفتح متزامنة (لا سباق clear/mark عبر dynamic import فقط)', () => {
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardSettings.ts'),
            'utf8',
        );
        expect(hook).toMatch(/clearSettingsPerfMarks\(\)/);
        expect(hook).toMatch(/markSettingsPerfPhase\('open-request'\)/);
        expect(hook).not.toMatch(
            /loadSettingsPerfMetrics\(\)\.then\(\(m\)\s*=>\s*m\.clearSettingsPerfMarks/,
        );
    });

    it('S7/S10: Cap native back مربوط في useSettingsShellEscape', () => {
        const trap = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/HamiSettings/hooks/useSettingsShellFocusTrap.ts',
            ),
            'utf8',
        );
        expect(trap).toContain('registerNativeBackHandler');
    });

    it('S1: interactive احتياطي في lifecycle', () => {
        const life = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/HamiSettings/hooks/useSettingsLifecycle.ts'),
            'utf8',
        );
        expect(life).toContain('SETTINGS_INTERACTIVE_FALLBACK_MS');
        expect(life).not.toMatch(/setTimeout\(markInteractiveNow,\s*1_?200\)/);
    });

    it('S8: أقسام الإعدادات تعلن data-settings-interactive عند الجاهزية', () => {
        for (const rel of [
            'src/app/components/lawyer/HamiSettings/appearance/AppearanceSection.tsx',
            'src/app/components/lawyer/HamiSettings/security/SecuritySection.tsx',
            'src/app/components/lawyer/HamiSettings/data/DataSection.tsx',
            'src/app/components/lawyer/HamiSettings/account/AccountSection.tsx',
        ]) {
            const src = fs.readFileSync(path.join(root, rel), 'utf8');
            expect(src).toContain('data-settings-interactive="true"');
        }
    });
});
