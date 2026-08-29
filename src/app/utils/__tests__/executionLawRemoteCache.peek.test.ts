import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ExecutionLawArticle } from '@/data/executionLaws';
import { writeLegalReferenceCache } from '@/app/utils/legalReferenceLocalCache';
import {
    EXECUTION_LAW_LOCAL_CACHE_KEY,
    hasExecutionLawArticlesCached,
    invalidateExecutionLawRemoteCache,
    peekExecutionLawArticlesCached,
} from '@/app/utils/executionLawRemoteCache';
import { setExecutionLawSeedCacheForTests } from '@/data/executionLawsLoader';

const SAMPLE: ExecutionLawArticle = {
    number: 1,
    title: 'مادة اختبار',
    content: 'نص المادة',
    parentId: 'instruments_prelude',
    leafId: 'objectives_directorates',
    leafLabel: 'الأهداف والمديريات',
};

describe('peekExecutionLawArticlesCached', () => {
    beforeEach(() => {
        setExecutionLawSeedCacheForTests(null);
        invalidateExecutionLawRemoteCache();
    });

    afterEach(() => {
        invalidateExecutionLawRemoteCache();
        setExecutionLawSeedCacheForTests(null);
    });

    it('يعيد المواد من كاش الجهاز دون انتظار التحميل البعيد', () => {
        expect(peekExecutionLawArticlesCached()).toBeNull();
        expect(hasExecutionLawArticlesCached()).toBe(false);

        writeLegalReferenceCache(EXECUTION_LAW_LOCAL_CACHE_KEY, [SAMPLE]);

        const peeked = peekExecutionLawArticlesCached();
        expect(peeked).toHaveLength(1);
        expect(peeked?.[0].number).toBe(1);
        expect(hasExecutionLawArticlesCached()).toBe(true);
        expect(peekExecutionLawArticlesCached()?.[0].title).toBe('مادة اختبار');
    });

    it('يسقط إلى بذرة التحميل المسبق إن لم يوجد كاش جهاز', () => {
        setExecutionLawSeedCacheForTests([SAMPLE]);
        const peeked = peekExecutionLawArticlesCached();
        expect(peeked).toHaveLength(1);
        expect(peeked?.[0].number).toBe(1);
        expect(hasExecutionLawArticlesCached()).toBe(true);
        setExecutionLawSeedCacheForTests(null);
    });
});
