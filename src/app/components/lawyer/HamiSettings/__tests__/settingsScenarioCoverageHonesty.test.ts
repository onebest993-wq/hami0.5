import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('settings scenario coverage honesty', () => {
    it('E2E الصدفة يغطي الفتح والتبويب والحفظ والهروب والخطر الملغى', () => {
        const shell = read('e2e/settings-shell.spec.ts');
        expect(shell).toContain('يفتح من الهيدر ويعرض تبويب الأمان');
        expect(shell).toContain('التبويبات تتبدّل بين الأقسام الأربعة');
        expect(shell).toContain('Escape يغلق الإعدادات');
        expect(shell).toContain('إعادة الفتح تحافظ على آخر تبويب');
        expect(shell).toContain('settings-toggle-appearance-reduceMotion');
        expect(shell).toContain('settings-toggle-appearance-highContrast');
        expect(shell).toContain('focus trap');
        expect(shell).toContain('exerciseCloudSyncToggleFromData');
        expect(shell).toContain('settings-toggle-security-screenshotDeterrent');
        expect(shell).toContain('settings-toggle-security-privacyBlur');
        expect(shell).toContain('enableLocalOnlyModeFromSecurity');
        expect(shell).toContain('حفظ تلقائي');
        expect(shell).toContain('settings-account-support-email');
        expect(shell).toContain('Escape يغلق حوار التأكيد قبل الإعدادات');
        expect(shell).toContain('hami:settings:open-request');
    });

    it('E2E الطبقات يغطي الإغلاق والوثيقة والتخصيص والنسخ وإلغاء المسح دون تنفيذ الخطر', () => {
        const scenarios = read('e2e/settings-scenarios.spec.ts');
        expect(scenarios).toContain('settings-shell-close');
        expect(scenarios).toContain('settings-account-open-terms');
        expect(scenarios).toContain('account-legal-document-sheet');
        expect(scenarios).toContain('appearance-block-customize-sheet');
        expect(scenarios).toContain('appearance-block-customize-back');
        expect(scenarios).toContain('settings-font-preset-large');
        expect(scenarios).toContain('settings-lite-on');
        expect(scenarios).toContain('appearance-chapter-wallpaper');
        expect(scenarios).toContain('settings-wipe-start');
        expect(scenarios).toContain('settings-backup-setup');
        expect(scenarios).toContain('business-backup-export-panel');
        expect(scenarios).toContain('settings-toggle-security-biometricLock');
        expect(scenarios).toContain('settings-toggle-security-privacyBlur');
        expect(scenarios).toContain('settings-auto-lock-15');
        expect(scenarios).not.toContain('wipeAllApplicationData');
        expect(scenarios).not.toContain("getByTestId('settings-account-delete').click");
        expect(scenarios).not.toContain('exportBusinessBackup');
        expect(scenarios).toContain('دون تنفيذ خروج أو مسح');
        const pkg = read('package.json');
        expect(pkg).toContain('e2e/settings-scenarios.spec.ts');
        const fixtures = read('e2e/helpers/settingsFixtures.ts');
        expect(fixtures).toContain('completeSettingsGearOpenGesture');
        expect(fixtures).toContain('waitUntilSettingsCloseUnblocked');
        expect(fixtures).toContain('SETTINGS_REOPEN_SUPPRESS_MS');
        expect(fixtures).not.toContain('trigger.click(');
    });

    it('E2E الموبايل يغطي اللمس و44px والأوراق الأفقية', () => {
        const mobile = read('e2e/settings-mobile.spec.ts');
        expect(mobile).toContain('viewport-fit=cover');
        expect(mobile).toContain('toBeGreaterThanOrEqual(44)');
        expect(mobile).toContain('.tap()');
        expect(mobile).toContain('settings-toggle-security-privacyBlur');
        expect(mobile).toContain('appearance-block-customize-sheet');
        expect(mobile).toContain('account-legal-document-sheet');
        expect(mobile).toContain('width: 844, height: 390');
    });

    it('مكدس الرجوع يضع الحوار ثم المسح ثم النسخ ثم الأوراق قبل الإغلاق', () => {
        const stack = read('src/app/components/lawyer/HamiSettings/settingsEscapeStack.ts');
        expect(stack).toContain("if (snapshot.smartDialogOpen) return 'dismiss-dialog'");
        expect(stack).toContain("if (snapshot.wipeCountdownActive) return 'cancel-wipe-countdown'");
        expect(stack).toContain("if (snapshot.backupUiOpen) return 'dismiss-backup-ui'");
        expect(stack).toContain("if (snapshot.appearanceCustomizeOpen) return 'dismiss-appearance-customize'");
        expect(stack).toContain("if (snapshot.accountLegalDocumentOpen) return 'dismiss-account-legal-document'");
        expect(stack).toContain("return 'close-settings'");
    });
});
