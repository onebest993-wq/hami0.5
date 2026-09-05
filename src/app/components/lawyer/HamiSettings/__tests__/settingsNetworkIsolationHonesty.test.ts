import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('settings network isolation honesty', () => {
    it('لا يعيد هوك رفع لقطة الإعدادات ولا يسحب التفضيلات عند الإقلاع', () => {
        expect(
            existsSync(join(root, 'src/app/context/lawyerSettings/useLawyerSettingsCloudSync.ts')),
        ).toBe(false);
        const hydration = read('src/app/context/lawyerSettings/useLawyerSettingsHydration.ts');
        expect(hydration).not.toContain('loadFromCloud');
        expect(hydration).not.toContain('saveToCloud');
        expect(hydration).not.toContain('applyAppData');
        expect(hydration).not.toContain('/api/settings/cloud-sync');
        expect(hydration).not.toContain('SecureAPIClient');
        expect(hydration).toContain('loadInitialSettingsAsync');
        const provider = read('src/app/context/lawyerSettings/LawyerSettingsProvider.tsx');
        expect(provider).not.toContain('useLawyerSettingsCloudSync');
        expect(provider).not.toContain('saveToCloud');
    });

    it('مفتاح المزامنة يشغّل سطوح العمل ويحصّن قفل الجهاز في كيس التفضيلات', () => {
        const toggle = read('src/app/components/lawyer/HamiSettings/data/dataCloudSyncToggle.ts');
        expect(toggle).not.toContain('saveToCloud');
        expect(toggle).not.toContain('loadFromCloud');
        expect(toggle).not.toContain('applyAppData');
        expect(toggle).not.toContain('collectAppData');
        expect(toggle).not.toContain('invalidateLawyerSettingsCache');
        expect(toggle).toContain('runCloudSyncAllNow');
        expect(toggle).toContain('await restoreLastWorkCloudCheckpoint');
        expect(toggle).toContain('resolveCloudSyncUserKey');
        const seal = read('src/app/services/settings/sealCloudSyncedPreferences.ts');
        expect(seal).toContain("delete next.security");
        expect(seal).toContain('cloudSync');
        const keys = read('src/app/services/secureStorageKeys.ts');
        expect(keys).toMatch(/key === 'lawyer_settings'/);
        expect(keys).toContain('isEncryptOrFailStorageKey');
    });
});
