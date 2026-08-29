import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

function lineCount(rel: string): number {
    return read(rel).split(/\n/).length;
}

describe('settings code quality close honesty', () => {
    it('طبقة الطلاء مقسومة دون دورة على ملف الفتح', () => {
        expect(lineCount('src/app/runtime/settingsInstantPaint.ts')).toBeLessThan(260);
        expect(existsSync(join(root, 'src/app/runtime/settingsInstantPaintChrome.ts'))).toBe(true);
        expect(existsSync(join(root, 'src/app/runtime/settingsInstantPaintInteract.ts'))).toBe(true);
        expect(existsSync(join(root, 'src/app/runtime/settingsInstantPaintDom.ts'))).toBe(true);
        const interact = read('src/app/runtime/settingsInstantPaintInteract.ts');
        expect(interact).not.toContain("from './settingsInstantPaint'");
        const chrome = read('src/app/runtime/settingsInstantPaintChrome.ts');
        expect(chrome).not.toContain("from './settingsInstantPaint'");
        const paint = read('src/app/runtime/settingsInstantPaint.ts');
        expect(paint).not.toContain('revealSettingsWarmShell');
        expect(paint).toContain('applySettingsThemeChrome');
    });

    it('الحساب والمنظر والمزامنة hooks/صفوف مستقلة', () => {
        expect(
            existsSync(
                join(root, 'src/app/components/lawyer/HamiSettings/appearance/useAppearanceBlockCollapse.ts'),
            ),
        ).toBe(true);
        expect(
            existsSync(join(root, 'src/app/components/lawyer/HamiSettings/account/AccountSessionRows.tsx')),
        ).toBe(true);
        expect(
            existsSync(join(root, 'src/app/components/lawyer/HamiSettings/data/dataSyncToastPatch.ts')),
        ).toBe(true);
        const account = read('src/app/components/lawyer/HamiSettings/account/AccountSection.tsx');
        expect(account).toContain('AccountSupportRows');
        expect(account).toContain('AccountSessionRows');
        expect(account).not.toContain('settings-account-support-whatsapp');
        const sessionRows = read(
            'src/app/components/lawyer/HamiSettings/account/AccountSessionRows.tsx',
        );
        expect(sessionRows).not.toContain('settings-account-support-whatsapp');
        expect(sessionRows).not.toContain('wa.me');
        const style = read(
            'src/app/components/lawyer/HamiSettings/appearance/AppearanceBlockStyleControls.tsx',
        );
        expect(style).toContain('useAppearanceBlockCollapse');
        expect(style).not.toContain('pickCollapsedItems');
        const sync = read('src/app/components/lawyer/HamiSettings/data/useDataSyncCard.ts');
        expect(sync).toContain('applyDataSyncToastPatch');
        expect(lineCount('src/app/components/lawyer/HamiSettings/account/AccountSection.tsx')).toBeLessThan(
            80,
        );
    });

    it('الأمان: الصف يعرض والـ hook يوجّه والمفتاح ينفّذ', () => {
        const section = read('src/app/components/lawyer/HamiSettings/security/SecuritySection.tsx');
        expect(section).not.toContain('patchSecurity');
        expect(section).not.toContain('SmartDialog');
        expect(section).toContain('togglePrivacyBlur');
        expect(lineCount('src/app/components/lawyer/HamiSettings/security/SecuritySection.tsx')).toBeLessThan(
            110,
        );
        const hook = read('src/app/components/lawyer/HamiSettings/security/useSecuritySection.ts');
        expect(hook).toContain('runPrivacyBlurToggle');
        expect(hook).not.toContain('SmartDialog.confirm');
        const toggles = read(
            'src/app/components/lawyer/HamiSettings/security/securitySectionToggles.ts',
        );
        expect(toggles).toContain('export async function runPrivacyBlurToggle');
    });
});
