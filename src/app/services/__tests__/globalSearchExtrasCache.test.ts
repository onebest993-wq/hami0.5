import { afterEach, describe, expect, it } from 'vitest';
import {
    clearCachedGlobalSearchExtras,
    emptyGlobalSearchExtras,
    getCachedGlobalSearchExtras,
    peekGlobalSearchExtrasCacheUserId,
    setCachedGlobalSearchExtras,
} from '@/app/services/globalSearchExtrasCache';

describe('globalSearchExtrasCache', () => {
    afterEach(() => {
        clearCachedGlobalSearchExtras();
    });

    it('يعيد extras بعد الكتابة ويحترم عزل المستخدم', () => {
        const data = emptyGlobalSearchExtras();
        setCachedGlobalSearchExtras('u1', data, false);
        expect(getCachedGlobalSearchExtras('u1')).toBe(data);
        expect(getCachedGlobalSearchExtras('u2')).toBeNull();
        expect(peekGlobalSearchExtrasCacheUserId()).toBe('u1');
    });

    it('peek بدون خيارات يرى تسخيناً بلا منشورات مجتمع', () => {
        setCachedGlobalSearchExtras('u1', emptyGlobalSearchExtras(), false);
        expect(getCachedGlobalSearchExtras('u1')).not.toBeNull();
        expect(getCachedGlobalSearchExtras('u1', { includeCommunityPosts: true })).toBeNull();
    });

    it('لا يمسح كاش مستخدم آخر', () => {
        const data = emptyGlobalSearchExtras();
        setCachedGlobalSearchExtras('u1', data, true);
        clearCachedGlobalSearchExtras('u2');
        expect(getCachedGlobalSearchExtras('u1')).toBe(data);
        clearCachedGlobalSearchExtras('u1');
        expect(getCachedGlobalSearchExtras('u1')).toBeNull();
    });
});
