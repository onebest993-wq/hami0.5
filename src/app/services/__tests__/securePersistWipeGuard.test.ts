import { describe, it, expect } from 'vitest';
import { defaultPersistWipeGuard, countCasesInPersistPayload } from '@/app/services/securePersistStorage';

const CRIMINAL_KEY = 'hami:criminal:store';

/** الصيغة التي يكتبها createCriminalShardedStateStorage: casesById محذوفة، caseIds بدلاً منها. */
const shardedMeta = (ids: string[]) =>
    JSON.stringify({
        state: { draft: {}, pendingSeveranceContext: null },
        version: 49,
        caseIds: ids,
        sharded: true,
    });

const legacyMeta = (ids: string[]) =>
    JSON.stringify({
        state: { casesById: Object.fromEntries(ids.map((id) => [id, {}])), draft: {} },
        version: 49,
    });

const emptyPayload = JSON.stringify({
    state: { casesById: {}, draft: {}, pendingSeveranceContext: null },
    version: 49,
});

describe('countCasesInPersistPayload', () => {
    it('يَعُدّ القضايا في الصيغة القديمة', () => {
        expect(countCasesInPersistPayload(legacyMeta(['c1', 'c2', 'c3']))).toBe(3);
    });

    it('يَعُدّ القضايا في الصيغة المجزّأة عبر caseIds', () => {
        expect(countCasesInPersistPayload(shardedMeta(['c1', 'c2', 'c3']))).toBe(3);
    });

    it('يُرجع صفراً للحمولة الفارغة أو التالفة', () => {
        expect(countCasesInPersistPayload(emptyPayload)).toBe(0);
        expect(countCasesInPersistPayload(null)).toBe(0);
        expect(countCasesInPersistPayload('not json')).toBe(0);
    });
});

describe('defaultPersistWipeGuard — المتجر الجزائي', () => {
    it('يحجب الكتابة الفارغة فوق قضايا مخزّنة بالصيغة القديمة', () => {
        expect(defaultPersistWipeGuard(emptyPayload, legacyMeta(['c1']), CRIMINAL_KEY)).toBe(true);
    });

    // لو عمي الحارس عن الصيغة المجزّأة، تُحذف كل شظايا القضايا عند أول حفظ بعد فشل الترحيل.
    it('يحجب الكتابة الفارغة فوق قضايا مخزّنة بالصيغة المجزّأة', () => {
        expect(defaultPersistWipeGuard(emptyPayload, shardedMeta(['c1', 'c2']), CRIMINAL_KEY)).toBe(true);
    });

    it('يسمح بالكتابة عندما تحمل الحمولة الواردة قضايا', () => {
        const incoming = legacyMeta(['c1', 'c2']);
        expect(defaultPersistWipeGuard(incoming, shardedMeta(['c1']), CRIMINAL_KEY)).toBe(false);
    });

    it('لا يحجب شيئاً عندما لا توجد بيانات مخزّنة أصلاً', () => {
        expect(defaultPersistWipeGuard(emptyPayload, null, CRIMINAL_KEY)).toBe(false);
        expect(defaultPersistWipeGuard(emptyPayload, '   ', CRIMINAL_KEY)).toBe(false);
    });
});

describe('defaultPersistWipeGuard — الحمولات الفارغة العامة', () => {
    it('يحجب {} و null و الفراغ فوق أي بيانات قائمة', () => {
        for (const incoming of ['{}', 'null', '   ']) {
            expect(defaultPersistWipeGuard(incoming, legacyMeta(['c1']), 'any-store')).toBe(true);
        }
    });
});
