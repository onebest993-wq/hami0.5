import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('settings security close honesty', () => {
    it('عبارة التأكيد الحساسة من CSPRNG ومقارنة ثابتة الزمن', () => {
        const verify = read('src/app/services/settings/verifySensitiveSettingsAction.ts');
        expect(verify).toContain('crypto.getRandomValues');
        expect(verify).toContain('csprng_unavailable');
        expect(verify).not.toContain('Math.random');
        expect(verify).toContain('timingSafeEqualUtf8');
        expect(verify).toContain('mintSensitiveConfirmChallenge');
        const wipe = read('src/app/components/lawyer/HamiSettings/hooks/useLocalDataClear.ts');
        expect(wipe).toContain('mintSensitiveConfirmChallenge');
        expect(wipe).toContain('wipeAllApplicationData');
        const del = read('src/app/components/lawyer/HamiSettings/account/useAccountSectionActions.ts');
        expect(del).toContain('mintSensitiveConfirmChallenge');
        expect(del).toContain('deleteLawyerAccount');
        expect(del).toContain('isAllowedSettingsSupportUrl');
        const accountApi = read('src/app/services/settings/deleteLawyerAccount.ts');
        expect(accountApi).toContain('ACCOUNT_DELETE_CONFIRMATION');
        expect(accountApi).toContain('account_delete_unauthenticated');
        expect(accountApi).not.toMatch(/await supabase\.from\(/);
    });

    it('قطع الاتصال والبصمة واللقطة والضبابية لا تُطبَّق دون تحقق', () => {
        const toggles = read(
            'src/app/components/lawyer/HamiSettings/security/securitySectionToggles.ts',
        );
        expect(toggles).toContain('ensureSettingsDialogsReady');
        expect(toggles).toContain('armLocalOnlyNetworkIsolation');
        expect(toggles).toContain('enrollBiometricSessionLock');
        expect(toggles).toContain('إيقاف القفل البيومتري؟');
        expect(toggles).toContain('إيقاف ضبابية الخصوصية؟');
        expect(toggles).toContain('runPrivacyBlurToggle');
        expect(toggles).toContain('syncNativeScreenshotGuard');
        const section = read(
            'src/app/components/lawyer/HamiSettings/security/SecuritySection.tsx',
        );
        expect(section).toContain('settings-toggle-security-privacyBlur');
        expect(section).toContain('togglePrivacyBlur');
        const backup = read(
            'src/app/components/lawyer/HamiSettings/hooks/businessBackupImportFlow.ts',
        );
        expect(backup).toContain('MAX_BACKUP_FILE_BYTES');
        expect(backup).toContain('validateBusinessBackupImport');
        expect(backup).toContain('inputType: \'password\'');
        expect(existsSync(join(root, 'src/app/components/lawyer/HamiSettings/account/settingsSupportUrl.ts'))).toBe(
            true,
        );
    });
});
