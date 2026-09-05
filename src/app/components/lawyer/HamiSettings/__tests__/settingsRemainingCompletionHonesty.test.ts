import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const settingsDir = join(root, 'src/app/components/lawyer/HamiSettings');

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

function collectProductionSource(dir: string, acc: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
        if (name === '__tests__' || name === 'node_modules') continue;
        const full = join(dir, name);
        if (statSync(full).isDirectory()) collectProductionSource(full, acc);
        else if (/\.(tsx|ts)$/.test(name)) acc.push(full);
    }
    return acc;
}

const FORBIDDEN_UI_MARKERS = [
    'settings-font-preset-',
    'settings-toggle-appearance-highContrast',
    'settings-lite-auto',
    'settings-lite-on',
    'settings-lite-off',
    'settings-toggle-security-privacyBlur',
] as const;

describe('settings remaining completion honesty', () => {
    it('صفوف الحجم والتباين والأداء الخفيف والضبابية ليست في مصدر الواجهة', () => {
        expect(existsSync(join(settingsDir, 'appearance/AppearanceReadabilityRows.tsx'))).toBe(false);
        const files = collectProductionSource(settingsDir);
        expect(files.length).toBeGreaterThan(40);
        for (const file of files) {
            const src = readFileSync(file, 'utf8');
            for (const marker of FORBIDDEN_UI_MARKERS) {
                expect(src, `${file} still contains ${marker}`).not.toContain(marker);
            }
        }
        const theme = read('src/app/components/lawyer/HamiSettings/appearance/AppearanceThemeAndSurfaceCard.tsx');
        expect(theme).toContain('settings-toggle-appearance-reduceMotion');
        expect(theme).not.toContain('حجم النص');
        expect(theme).not.toContain('تباين أوضح');
        expect(theme).not.toContain('أداء خفيف');
        const section = read('src/app/components/lawyer/HamiSettings/security/SecuritySection.tsx');
        expect(section).not.toContain('ضبابية الخصوصية');
        expect(section).toContain('settings-toggle-security-screenshotDeterrent');
    });

    it('مسار تبديل الضبابية ميت أُزيل؛ المحرّك يبقى على اللقطة', () => {
        const hook = read('src/app/components/lawyer/HamiSettings/security/useSecuritySection.ts');
        expect(hook).not.toContain('togglePrivacyBlur');
        expect(hook).not.toContain('runPrivacyBlurToggle');
        const toggles = read(
            'src/app/components/lawyer/HamiSettings/security/securitySectionToggles.ts',
        );
        expect(toggles).not.toContain('runPrivacyBlurToggle');
        expect(toggles).not.toContain('ضبابية الخصوصية');
        const bindings = read(
            'src/app/context/lawyerSettings/useLawyerSettingsSecurityBindings.ts',
        );
        expect(bindings).toContain('settings.security.privacyBlur');
        expect(bindings).toContain('privacyBlurRuntime');
        const defaults = read('src/app/services/settings/defaults.ts');
        expect(defaults).toContain('privacyBlur: true');
        expect(defaults).toContain('highContrast: false');
    });

    it('لم تُعد مزامنة تفضيلات سحابية ولا تقويم/مهام من الإعدادات', () => {
        expect(
            existsSync(join(root, 'src/app/context/lawyerSettings/useLawyerSettingsCloudSync.ts')),
        ).toBe(false);
        const hydration = read('src/app/context/lawyerSettings/useLawyerSettingsHydration.ts');
        expect(hydration).not.toContain('loadFromCloud');
        const router = read('src/app/components/lawyer/HamiSettings/SettingsSectionRouter.tsx');
        expect(router).toContain("case 'security'");
        expect(router).toContain("case 'appearance'");
        expect(router).toContain("case 'data'");
        expect(router).toContain("case 'account'");
        expect(router).not.toContain('calendar');
        expect(router).not.toContain('tasks');
        const e2e = [
            read('e2e/settings-shell.spec.ts'),
            read('e2e/settings-scenarios.spec.ts'),
            read('e2e/settings-mobile.spec.ts'),
        ].join('\n');
        expect(e2e).not.toContain('settings-font-preset-');
        expect(e2e).not.toContain('settings-lite-');
        expect(e2e).not.toContain('settings-toggle-appearance-highContrast');
        expect(e2e).not.toContain('settings-toggle-security-privacyBlur');
        expect(
            existsSync(join(root, '.audit/PHASE_SETTINGS_REMAINING_COMPLETION_CLOSURE.md')),
        ).toBe(true);
    });
});
