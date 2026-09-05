import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const subscribeToPostComments = vi.fn(() => () => undefined);

vi.mock('@/lib/forumService.js', () => ({
    subscribeToPostComments: (...args: unknown[]) => subscribeToPostComments(...args),
}));

import { useForumPostCommentsLive } from '../useForumPostCommentsLive';

describe('useForumPostCommentsLive', () => {
    it('لا يعيد الاشتراك إن تغيّر مرجع onPostUpdate فقط', () => {
        const onA = vi.fn();
        const onB = vi.fn();
        const { rerender } = renderHook(
            ({ onPostUpdate }) =>
                useForumPostCommentsLive({ postId: 'p1', enabled: true, onPostUpdate }),
            { initialProps: { onPostUpdate: onA } },
        );
        expect(subscribeToPostComments).toHaveBeenCalledTimes(1);
        rerender({ onPostUpdate: onB });
        expect(subscribeToPostComments).toHaveBeenCalledTimes(1);
    });
});
