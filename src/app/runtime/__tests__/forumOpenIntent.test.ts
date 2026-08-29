import { afterEach, describe, expect, it } from 'vitest';
import {
    bindForumOpenIntent,
    clearForumOpenIntent,
    consumeForumOpenPostId,
    isForumOpenIntentPending,
    requestOpenLawyerForum,
    resetForumOpenIntentForTests,
} from '@/app/runtime/forumOpenIntent';

describe('forumOpenIntent', () => {
    afterEach(() => {
        resetForumOpenIntentForTests();
        document.documentElement.removeAttribute('data-hami-forum-open');
    });

    it('يطلي الستارة ويحفظ المنشور ويُطلق الفتح', () => {
        let opened = 0;
        const unbind = bindForumOpenIntent(() => {
            opened += 1;
        });
        requestOpenLawyerForum('post-9');
        expect(isForumOpenIntentPending()).toBe(true);
        expect(document.documentElement.getAttribute('data-hami-forum-open')).toBe('1');
        expect(opened).toBe(1);
        expect(consumeForumOpenPostId()).toBe('post-9');
        expect(consumeForumOpenPostId()).toBeNull();
        requestOpenLawyerForum('javascript:alert(1)');
        expect(consumeForumOpenPostId()).toBeNull();
        clearForumOpenIntent();
        expect(isForumOpenIntentPending()).toBe(false);
        unbind();
    });
});
