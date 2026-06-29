import { describe, expect, it, beforeEach } from 'vitest';
import {
    buildRepositoryFeedCacheKey,
    peekRepositoryFeedCache,
    resetRepositoryFeedCacheForTests,
    setRepositoryFeedCache,
} from '@/app/services/repository/repositoryFeedWarmCache';
import type { RepositoryFeedItem } from '@/app/services/repository/repositoryUnifiedFeed';

describe('repositoryFeedWarmCache', () => {
    beforeEach(() => {
        resetRepositoryFeedCacheForTests();
    });

    it('يعيد نفس المفتاح لنفس المدخلات', () => {
        const input = {
            globalNotes: [{ id: 'n1', title: 't', body: 'b', isPinned: false }],
            lawsuitFiles: [],
            executionFiles: [],
            vaultDocs: [],
        };
        const a = buildRepositoryFeedCacheKey(input);
        const b = buildRepositoryFeedCacheKey(input);
        expect(a).toBe(b);
    });

    it('يتغيّر المفتاح عند تثبيت بطاقة عامة', () => {
        const base = {
            lawsuitFiles: [],
            executionFiles: [],
            vaultDocs: [],
        };
        const before = buildRepositoryFeedCacheKey({
            ...base,
            globalNotes: [{ id: 'n1', title: 't', body: 'b', isPinned: false }],
        });
        const after = buildRepositoryFeedCacheKey({
            ...base,
            globalNotes: [{ id: 'n1', title: 't', body: 'b', isPinned: true }],
        });
        expect(after).not.toBe(before);
    });

    it('يتغيّر المفتاح عند تعديل عنوان أو نص بطاقة عامة', () => {
        const base = {
            lawsuitFiles: [],
            executionFiles: [],
            vaultDocs: [],
        };
        const before = buildRepositoryFeedCacheKey({
            ...base,
            globalNotes: [{ id: 'n1', title: 'قديم', body: 'نص', isPinned: false }],
        });
        const titleChanged = buildRepositoryFeedCacheKey({
            ...base,
            globalNotes: [{ id: 'n1', title: 'جديد', body: 'نص', isPinned: false }],
        });
        const bodyChanged = buildRepositoryFeedCacheKey({
            ...base,
            globalNotes: [{ id: 'n1', title: 'قديم', body: 'نص محدّث', isPinned: false }],
        });
        expect(titleChanged).not.toBe(before);
        expect(bodyChanged).not.toBe(before);
    });

    it('يتغيّر المفتاح عند تعديل ملاحظة دعوى في المكان (نفس العدد)', () => {
        const make = (text: string) => ({
            globalNotes: [],
            lawsuitFiles: [
                { id: 1, notes: [{ id: 10, text, meta: 'm', isPinned: false }] } as never,
            ],
            executionFiles: [],
            vaultDocs: [],
        });
        const before = buildRepositoryFeedCacheKey(make('قبل'));
        const after = buildRepositoryFeedCacheKey(make('بعد'));
        expect(after).not.toBe(before);
    });

    it('يتغيّر المفتاح عند تعديل ملاحظة تنفيذ في المكان (نفس العدد)', () => {
        const make = (body: string) => ({
            globalNotes: [],
            lawsuitFiles: [],
            executionFiles: [
                { id: 2, caseNotesLog: [{ id: 'e1', title: 't', body, pinned: false }] } as never,
            ],
            vaultDocs: [],
        });
        const before = buildRepositoryFeedCacheKey(make('قبل'));
        const after = buildRepositoryFeedCacheKey(make('بعد'));
        expect(after).not.toBe(before);
    });

    it('peek يعيد العناصر المخزنة', () => {
        const key = 'test-key';
        const items = [{ kind: 'global', note: { id: '1', title: 'x', body: '', isPinned: false } }] as RepositoryFeedItem[];
        setRepositoryFeedCache(key, items);
        expect(peekRepositoryFeedCache(key)).toEqual(items);
        expect(peekRepositoryFeedCache('other')).toBeUndefined();
    });
});
