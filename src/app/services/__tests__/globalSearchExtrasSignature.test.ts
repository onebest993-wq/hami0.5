import { describe, expect, it } from 'vitest';
import { emptyGlobalSearchExtras } from '@/app/services/globalSearchExtrasCache';
import {
    GLOBAL_SEARCH_INDEX_EXTRAS_MARK,
    composeGlobalSearchIndexCacheKey,
    globalSearchExtrasSignature,
    isSearchIndexKeyExtrasOnlyChange,
} from '@/app/services/globalSearchExtrasSignature';

describe('globalSearchExtrasSignature', () => {
    it('بلا extras توقيع ثابت', () => {
        expect(globalSearchExtrasSignature(null)).toBe('0');
        expect(globalSearchExtrasSignature(undefined)).toBe('0');
    });

    it('تعديل عنوان موعد بنفس العدد يغيّر التوقيع', () => {
        const base = emptyGlobalSearchExtras();
        const a = {
            ...base,
            calendarEvents: [
                {
                    id: 'c1',
                    userId: 'u1',
                    title: 'جلسة أ',
                    date: '2026-08-30',
                    type: 'hearing',
                    createdAt: 't',
                    updatedAt: 't',
                },
            ],
        };
        const b = {
            ...a,
            calendarEvents: [{ ...a.calendarEvents[0], title: 'جلسة ب' }],
        };
        expect(globalSearchExtrasSignature(a)).not.toBe(globalSearchExtrasSignature(b));
    });

    it('مهام threading تدخل التوقيع حتى لو عدد المعاملات ثابت', () => {
        const base = emptyGlobalSearchExtras();
        const withoutTasks = globalSearchExtrasSignature(base);
        const withTasks = globalSearchExtrasSignature({
            ...base,
            threadingTasks: [{ id: 'tk1', title: 'تبليغ', notes: 'نص' } as never],
        });
        expect(withTasks).not.toBe(withoutTasks);
    });

    it('extras-only يعتمد gsx لا آخر | في profileLine', () => {
        const coreA = 'u1|0|profile|with|pipes';
        const coreB = 'u1|0|profile|with|pipes';
        const applied = composeGlobalSearchIndexCacheKey(coreA, '0.0.0.0.0.0.0.0.1');
        const next = composeGlobalSearchIndexCacheKey(coreB, '0.1.0.0.0.0.0.0.2');
        expect(applied).toContain(GLOBAL_SEARCH_INDEX_EXTRAS_MARK);
        expect(isSearchIndexKeyExtrasOnlyChange(applied, next)).toBe(true);
        expect(
            isSearchIndexKeyExtrasOnlyChange(
                composeGlobalSearchIndexCacheKey('u1|files-old', '1'),
                composeGlobalSearchIndexCacheKey('u1|files-new', '1'),
            ),
        ).toBe(false);
    });
});
