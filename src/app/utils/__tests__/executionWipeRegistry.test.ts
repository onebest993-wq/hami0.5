import { beforeEach, describe, expect, it, vi } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import { storageCache } from '@/app/utils/storageCache';
import {
    EXECUTION_WIPE_KEY_PREFIXES,
    purgeExecutionLocalStateOnLogout,
    shouldPurgeExecutionLocalKey,
} from '@/app/utils/executionWipeRegistry';
import { setLiveAuthUserId } from '@/app/utils/liveAuthUserId';

vi.mock('@/app/utils/executionFilesStorage', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/utils/executionFilesStorage')>();
    return {
        ...actual,
        bindExecutionFilesStorageOwner: vi.fn(),
    };
});

vi.mock('@/app/stores/executionDashboardStoreLazy', () => ({
    resetExecutionDashboardStore: vi.fn(async () => undefined),
}));

describe('executionWipeRegistry', () => {
    beforeEach(() => {
        setLiveAuthUserId(null);
        vi.clearAllMocks();
        for (const key of SecureStoreService.listKeysSync()) {
            SecureStoreService.deleteItemSync(key);
        }
        storageCache.clear();
    });

    it('matches execution wipe prefixes and scoped variants', () => {
        expect(shouldPurgeExecutionLocalKey('execution_exec_1')).toBe(true);
        expect(shouldPurgeExecutionLocalKey('garnishment_exec_1')).toBe(true);
        expect(shouldPurgeExecutionLocalKey('hami_garnishment_details_x')).toBe(true);
        expect(shouldPurgeExecutionLocalKey('execution_exec_1:u:user-1')).toBe(true);
        expect(shouldPurgeExecutionLocalKey('lawyer_notes')).toBe(false);
        expect(shouldPurgeExecutionLocalKey('executionFiles')).toBe(true);
        expect(shouldPurgeExecutionLocalKey('executionFiles:user-1')).toBe(true);
        expect(shouldPurgeExecutionLocalKey('lawyer_execution_files')).toBe(true);
        expect(shouldPurgeExecutionLocalKey('hami:execution-dashboard')).toBe(true);
        expect(EXECUTION_WIPE_KEY_PREFIXES.length).toBeGreaterThan(0);
    });

    it('purges execution keys, clears cache, resets store, and unbinds owner', async () => {
        const { bindExecutionFilesStorageOwner } = await import('@/app/utils/executionFilesStorage');
        const { resetExecutionDashboardStore } = await import(
            '@/app/stores/executionDashboardStoreLazy'
        );

        SecureStoreService.setItemSync('execution_exec_wipe', '{}');
        SecureStoreService.setItemSync('execution_exec_wipe:u:u1', '{}');
        SecureStoreService.setItemSync('garnishment_exec_wipe', '1');
        SecureStoreService.setItemSync('lawyer_notes', '[]');

        storageCache.set('execution_exec_wipe', { id: 'exec_wipe' });

        await purgeExecutionLocalStateOnLogout();

        expect(SecureStoreService.getItemSync('execution_exec_wipe')).toBeNull();
        expect(SecureStoreService.getItemSync('execution_exec_wipe:u:u1')).toBeNull();
        expect(SecureStoreService.getItemSync('garnishment_exec_wipe')).toBeNull();
        expect(SecureStoreService.getItemSync('lawyer_notes')).not.toBeNull();
        expect(storageCache.get('execution_exec_wipe')).toBeNull();
        expect(resetExecutionDashboardStore).toHaveBeenCalledTimes(1);
        expect(bindExecutionFilesStorageOwner).toHaveBeenCalledWith(null);
    });

    it('also purges orphan execution keys that exist only in localStorage', async () => {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem('execution_ls_only_wipe', '{"id":"ls"}');
        localStorage.setItem('lawyer_notes', 'keep');

        await purgeExecutionLocalStateOnLogout();

        expect(localStorage.getItem('execution_ls_only_wipe')).toBeNull();
        expect(localStorage.getItem('lawyer_notes')).toBe('keep');
    });

    it('يمسح فهرس ملفات التنفيذ عند الخروج دون الملاحظات', async () => {
        SecureStoreService.setItemSync('executionFiles', JSON.stringify([{ id: 'idx' }]));
        SecureStoreService.setItemSync('executionFiles:user-1', JSON.stringify([{ id: 'owned' }]));
        SecureStoreService.setItemSync('lawyer_execution_files', JSON.stringify([{ id: 'legacy' }]));
        SecureStoreService.setItemSync('lawyer_notes', '[]');

        await purgeExecutionLocalStateOnLogout();

        expect(SecureStoreService.getItemSync('executionFiles')).toBeNull();
        expect(SecureStoreService.getItemSync('executionFiles:user-1')).toBeNull();
        expect(SecureStoreService.getItemSync('lawyer_execution_files')).toBeNull();
        expect(SecureStoreService.getItemSync('lawyer_notes')).not.toBeNull();
    });
});
