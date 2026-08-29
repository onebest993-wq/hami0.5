import { describe, expect, it } from 'vitest';
import { isProtectedStorageKey } from '@/app/services/dossierPersistence/protectedStorageKeys';
import { shouldRejectDossierWipe } from '@/app/services/dossierPersistence/dossierWipeGuard';
import { CRIMINAL_CASE_PREFIX } from '@/app/services/criminalShardedPersistStorage';

const CASE_KEY = 'hami:criminal:case:abc';
const EXISTING_CASE = JSON.stringify({ id: 'abc', title: 'جناية', defendants: [{ id: 'd1' }] });

describe('isProtectedStorageKey — criminal case prefix', () => {
    it('يطابق البادئة التي يكتبها التخزين فعلاً', () => {
        expect(CRIMINAL_CASE_PREFIX).toBe('hami:criminal:case:');
    });

    it('يحمي مفاتيح hami:criminal:case: الفعلية', () => {
        expect(isProtectedStorageKey(CASE_KEY)).toBe(true);
        expect(isProtectedStorageKey('hami:criminal:store')).toBe(true);
    });

    it('لا يعتمد البادئة الخاطئة shard', () => {
        expect(isProtectedStorageKey('hami:criminal:shard:abc')).toBe(false);
    });

    it('لا يشمل قطع القضية الكبيرة — نصّ لا JSON فلا يصحّ عدّه', () => {
        expect(isProtectedStorageKey(`${CASE_KEY}__manifest`)).toBe(false);
        expect(isProtectedStorageKey(`${CASE_KEY}__p0`)).toBe(false);
    });
});

describe('حارس المسح — القضية الجنائية', () => {
    it('يرفض تفريغ قضية قائمة إلى كائن بلا حقول', () => {
        expect(shouldRejectDossierWipe(CASE_KEY, '{}', EXISTING_CASE)).toBe(true);
    });

    it('يرفض الحمولة الفارغة والفارغة نصّاً', () => {
        expect(shouldRejectDossierWipe(CASE_KEY, '', EXISTING_CASE)).toBe(true);
        expect(shouldRejectDossierWipe(CASE_KEY, 'null', EXISTING_CASE)).toBe(true);
    });

    it('يمرّر تحديثاً حقيقياً للقضية', () => {
        const next = JSON.stringify({ id: 'abc', title: 'جناية مُعدَّلة' });
        expect(shouldRejectDossierWipe(CASE_KEY, next, EXISTING_CASE)).toBe(false);
    });

    it('يمرّر أول كتابة حين لا يوجد سابق', () => {
        expect(shouldRejectDossierWipe(CASE_KEY, '{}', null)).toBe(false);
    });
});
