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

    it('قطع الاتصال والبصمة واللقطة لا تُطبَّق دون تحقق؛ الضبابية محرّك بلا صف', () => {
        const toggles = read(
            'src/app/components/lawyer/HamiSettings/security/securitySectionToggles.ts',
        );
        expect(toggles).toContain('ensureSettingsDialogsReady');
        expect(toggles).toContain('armLocalOnlyNetworkIsolation');
        expect(toggles).toContain('enrollBiometricSessionLock');
        expect(toggles).toContain('إيقاف القفل البيومتري؟');
        expect(toggles).not.toContain('إيقاف ضبابية الخصوصية؟');
        expect(toggles).not.toContain('runPrivacyBlurToggle');
        expect(toggles).toContain('syncNativeScreenshotGuard');
        const section = read(
            'src/app/components/lawyer/HamiSettings/security/SecuritySection.tsx',
        );
        expect(section).not.toContain('settings-toggle-security-privacyBlur');
        expect(section).not.toContain('togglePrivacyBlur');
        expect(section).not.toContain('ضبابية الخصوصية');
        const backup = read(
            'src/app/components/lawyer/HamiSettings/hooks/businessBackupImportFlow.ts',
        );
        expect(backup).toContain('MAX_BACKUP_FILE_BYTES');
        expect(backup).toContain('validateBusinessBackupImport');
        expect(backup).toContain('inputType: \'password\'');
        expect(existsSync(join(root, 'src/app/components/lawyer/HamiSettings/account/settingsSupportUrl.ts'))).toBe(
            true,
        );
        const hydration = read('src/app/context/lawyerSettings/useLawyerSettingsHydration.ts');
        expect(hydration).not.toContain('loadFromCloud');
        const toggle = read('src/app/components/lawyer/HamiSettings/data/dataCloudSyncToggle.ts');
        expect(toggle).not.toContain('saveToCloud');
        expect(toggle).toContain('runCloudSyncAllNow');
        expect(existsSync(join(root, 'src/app/context/lawyerSettings/useLawyerSettingsCloudSync.ts'))).toBe(
            false,
        );
        const seal = read('src/app/services/settings/sealCloudSyncedPreferences.ts');
        expect(seal).toContain('mergeRemoteLawyerSettingsPreservingDeviceLock');
        expect(seal).toContain('delete next.security');
        const cloudRoute = read('src/app/api/settings/cloud-sync/route.ts');
        expect(cloudRoute).toContain('sealCloudSyncedAppData');
        expect(cloudRoute).toContain('migrated: false');
        expect(cloudRoute).not.toContain('migrated: true');
    });
});
