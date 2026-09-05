import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const start = vi.fn();
const stop = vi.fn();

vi.mock('@/app/services/forum/forumRepositoryIndexRetryWorker', () => ({
    startForumRepositoryIndexRetryWorker: () => start(),
    stopForumRepositoryIndexRetryWorker: () => stop(),
}));

import { useForumRepositoryIndexRetry } from '../useForumRepositoryIndexRetry';

describe('useForumRepositoryIndexRetry', () => {
    it('يشغّل العامل عند تفعيل السطح ويوقفه عند الإزالة', async () => {
        start.mockClear();
        stop.mockClear();
        const { unmount, rerender } = renderHook(
            ({ enabled }: { enabled: boolean }) => useForumRepositoryIndexRetry(enabled),
            { initialProps: { enabled: true } },
        );
        await waitFor(() => expect(start).toHaveBeenCalledTimes(1));
        rerender({ enabled: false });
        await waitFor(() => expect(stop).toHaveBeenCalledTimes(1));
        unmount();
    });
});
