import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    FOLLOWUP_CHROME_FALLBACK_MS,
    ensureExecutionFollowupChromeReady,
    isExecutionFollowupChromeReady,
} from '../executionFollowupOpenReady';
import { LazyExecutionFollowupModalHost } from '../executionFollowupHostLazy';
import { LazyExecutionFollowupModalPortal } from '../executionFollowupModalLazy';
import { resetFollowupModalSnapshotBuilderCacheForTests } from '../hooks/followupModalSnapshotBuilderCache';

describe('executionFollowupOpenReady', () => {
    afterEach(() => {
        resetFollowupModalSnapshotBuilderCacheForTests();
        LazyExecutionFollowupModalHost.resetForTests();
        LazyExecutionFollowupModalPortal.resetForTests();
        vi.useRealTimers();
    });

    it('يُسقط المهلة حتى لا تُعلَّق النقرة إن تأخرت الكِسر', async () => {
        vi.useFakeTimers();
        expect(isExecutionFollowupChromeReady()).toBe(false);
        const ready = ensureExecutionFollowupChromeReady();
        vi.advanceTimersByTime(FOLLOWUP_CHROME_FALLBACK_MS);
        await expect(ready).resolves.toBeUndefined();
    });
});
