import { beforeEach, describe, expect, it } from 'vitest';
import {
    clearGlobalSearchDraftQuery,
    peekGlobalSearchDraftQuery,
    resetGlobalSearchDraftQueryForTests,
    takeGlobalSearchDraftQuery,
    writeGlobalSearchDraftQuery,
} from '@/app/runtime/globalSearchDraftQuery';

describe('globalSearchDraftQuery', () => {
    beforeEach(() => {
        resetGlobalSearchDraftQueryForTests();
    });

    it('يكتب ويقرأ المسودة', () => {
        writeGlobalSearchDraftQuery('جلسة غداً');
        expect(peekGlobalSearchDraftQuery()).toBe('جلسة غداً');
    });

    it('take يُفرّغ بعد القراءة', () => {
        writeGlobalSearchDraftQuery('دعوى');
        expect(takeGlobalSearchDraftQuery()).toBe('دعوى');
        expect(peekGlobalSearchDraftQuery()).toBe('');
        expect(takeGlobalSearchDraftQuery()).toBe('');
    });

    it('clear يمسح', () => {
        writeGlobalSearchDraftQuery('x');
        clearGlobalSearchDraftQuery();
        expect(peekGlobalSearchDraftQuery()).toBe('');
    });
});
