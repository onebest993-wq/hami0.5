import { beforeEach, describe, expect, it } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import { EXECUTION_FILES_STORAGE_KEY, invalidateExecutionFilesRawCache } from '@/app/utils/executionFilesStorage';
import { syncExecutionIndexRemainingHint } from '@/app/utils/syncExecutionIndexRemainingHint';
import { setLiveAuthUserId } from '@/app/utils/liveAuthUserId';

describe('syncExecutionIndexRemainingHint', () => {
    const execId = 'exec_remain_hint_1';

    beforeEach(() => {
        setLiveAuthUserId(null);
        for (const key of SecureStoreService.listKeysSync()) {
            SecureStoreService.deleteItemSync(key);
        }
        localStorage.clear();
        invalidateExecutionFilesRawCache();
    });

    it('writes remaining 0 onto an existing index row without creating a ghost', () => {
        SecureStoreService.setItemSync(
            EXECUTION_FILES_STORAGE_KEY,
            JSON.stringify([{ id: execId, fileNumber: '12', totalAmount: 5_000_000 }]),
        );
        invalidateExecutionFilesRawCache();

        expect(syncExecutionIndexRemainingHint(execId, 0)).toBe(true);

        const index = JSON.parse(
            SecureStoreService.getItemSync(EXECUTION_FILES_STORAGE_KEY) || '[]',
        ) as Array<Record<string, unknown>>;
        expect(index).toHaveLength(1);
        expect(index[0].id).toBe(execId);
        expect(index[0].fileNumber).toBe('12');
        expect(index[0].total_remaining_balance).toBe(0);
        expect(index[0].remainingDebt).toBe(0);
    });

    it('skips unknown ids instead of inserting a list row', () => {
        SecureStoreService.setItemSync(EXECUTION_FILES_STORAGE_KEY, JSON.stringify([]));
        invalidateExecutionFilesRawCache();
        expect(syncExecutionIndexRemainingHint('missing-exec', 100)).toBe(false);
        const index = JSON.parse(
            SecureStoreService.getItemSync(EXECUTION_FILES_STORAGE_KEY) || '[]',
        ) as unknown[];
        expect(index).toEqual([]);
    });
});
