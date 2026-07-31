import { describe, expect, it } from 'vitest';
import { isProtectedStorageKey } from '@/app/services/dossierPersistence/protectedStorageKeys';

describe('isProtectedStorageKey — criminal case prefix', () => {
    it('يحمي مفاتيح hami:criminal:case: الفعلية', () => {
        expect(isProtectedStorageKey('hami:criminal:case:abc')).toBe(true);
        expect(isProtectedStorageKey('hami:criminal:store')).toBe(true);
    });

    it('لا يعتمد البادئة الخاطئة shard', () => {
        expect(isProtectedStorageKey('hami:criminal:shard:abc')).toBe(false);
    });
});
