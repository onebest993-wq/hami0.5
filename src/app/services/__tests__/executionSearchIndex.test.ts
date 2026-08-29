import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FileData } from '@/app/components/lawyer/LawyerShared';

const readExecutionDossierBlobScanningScopes = vi.fn();
const isStorageKeyVisibleToCurrentUser = vi.fn(() => true);

vi.mock('@/app/utils/executionDossierBlobPersistence', () => ({
    readExecutionDossierBlobScanningScopes: (...args: unknown[]) =>
        readExecutionDossierBlobScanningScopes(...args),
}));

vi.mock('@/app/utils/executionDeviceStorageScope', () => ({
    isStorageKeyVisibleToCurrentUser: (...args: unknown[]) => isStorageKeyVisibleToCurrentUser(...args),
    readScopedDeviceStorageItem: vi.fn(() => null),
    scopeExecutionDeviceStorageKey: (key: string) => `${key}:u:live-user`,
}));

vi.mock('@/app/utils/storageCache', () => ({
    storageCache: { get: vi.fn(() => null) },
}));

vi.mock('@/app/services/SecureStoreService', () => ({
    default: { getItemSync: vi.fn(() => null) },
}));

import { buildExecutionDeepSearchEntries } from '@/app/services/executionSearchIndex';

describe('buildExecutionDeepSearchEntries', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        isStorageKeyVisibleToCurrentUser.mockReturnValue(true);
    });

    it('indexes timeline events from scoped dossier blob reader', () => {
        readExecutionDossierBlobScanningScopes.mockReturnValue({
            timelineEvents: [{ id: 'ev-1', title: 'إنذار', description: 'تفاصيل' }],
        });

        const files = [{ id: 'ex-9', caseNo: '123/2026' }] as FileData[];
        const entries = buildExecutionDeepSearchEntries(files, (draft, lifecycle) => ({
            ...draft,
            lifecycle,
        }));

        expect(readExecutionDossierBlobScanningScopes).toHaveBeenCalledWith('ex-9');
        expect(entries).toHaveLength(1);
        expect(entries[0]?._searchStr).toContain('انذار');
        expect(entries[0]?.navigate).toEqual({ type: 'file', fileId: 'ex-9' });
    });

    it('does not index dossier deep entries when scoped blob reader returns null', () => {
        readExecutionDossierBlobScanningScopes.mockReturnValue(null);

        const files = [{ id: 'ex-missing', caseNo: '999/2026' }] as FileData[];
        const entries = buildExecutionDeepSearchEntries(files, (draft, lifecycle) => ({
            ...draft,
            lifecycle,
        }));

        expect(entries).toHaveLength(0);
    });
});
