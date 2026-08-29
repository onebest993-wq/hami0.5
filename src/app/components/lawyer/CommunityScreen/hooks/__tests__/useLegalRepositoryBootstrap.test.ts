import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { MutableRefObject } from 'react';
import type { RepositoryDocument } from '@/app/services/lawyer-cloud';

const listDocuments = vi.fn();
const listRepositoryDocumentsSync = vi.fn(() => [] as RepositoryDocument[]);
const peekRepositoryDocsCache = vi.fn(() => null as RepositoryDocument[] | null);
const readRepositoryDocsCache = vi.fn(async () => [] as RepositoryDocument[]);
const warmRepositoryThumbnailUrls = vi.fn(async () => undefined);

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

vi.mock('@/app/services/lawyer-cloud', () => ({
    listRepositoryDocumentsSync: () => listRepositoryDocumentsSync(),
    RepositoryDB: { listDocuments: (...args: unknown[]) => listDocuments(...args) },
}));

vi.mock('@/app/services/forum/repositoryDocsWarmCache', () => ({
    peekRepositoryDocsCache: () => peekRepositoryDocsCache(),
    readRepositoryDocsCache: () => readRepositoryDocsCache(),
    warmRepositoryThumbnailUrls: (...args: unknown[]) => warmRepositoryThumbnailUrls(...args),
}));

vi.mock('../../forumAsync', () => ({
    withForumAsyncTimeout: <T,>(promise: Promise<T>) => promise,
}));

import { useLegalRepositoryBootstrap } from '../useLegalRepositoryBootstrap';

describe('useLegalRepositoryBootstrap', () => {
    beforeEach(() => {
        listDocuments.mockReset();
        listRepositoryDocumentsSync.mockReturnValue([]);
        peekRepositoryDocsCache.mockReturnValue(null);
        readRepositoryDocsCache.mockResolvedValue([]);
        listDocuments.mockResolvedValue([]);
        warmRepositoryThumbnailUrls.mockClear();
    });

    it('لا يطلب القائمة البعيدة عندما allowRemoteFetch = false', async () => {
        const applyDocuments = vi.fn();
        const documentsRef: MutableRefObject<RepositoryDocument[]> = { current: [] };
        renderHook(() =>
            useLegalRepositoryBootstrap({
                applyDocuments,
                documentsRef,
                allowRemoteFetch: false,
            }),
        );
        await waitFor(() => {
            expect(readRepositoryDocsCache).toHaveBeenCalled();
        });
        expect(listDocuments).not.toHaveBeenCalled();
        expect(warmRepositoryThumbnailUrls).not.toHaveBeenCalled();
    });

    it('لا يعيد ترطيب الكاش المحلي عند إغلاق التبويب بعد التحميل البعيد', async () => {
        const applyDocuments = vi.fn();
        const documentsRef: MutableRefObject<RepositoryDocument[]> = { current: [] };
        const { rerender } = renderHook(
            ({ allowRemoteFetch }: { allowRemoteFetch: boolean }) =>
                useLegalRepositoryBootstrap({
                    applyDocuments,
                    documentsRef,
                    allowRemoteFetch,
                }),
            { initialProps: { allowRemoteFetch: true } },
        );
        await waitFor(() => {
            expect(listDocuments).toHaveBeenCalledTimes(1);
        });
        readRepositoryDocsCache.mockClear();
        listDocuments.mockClear();
        rerender({ allowRemoteFetch: false });
        await waitFor(() => {
            expect(listDocuments).not.toHaveBeenCalled();
        });
        expect(readRepositoryDocsCache).not.toHaveBeenCalled();
    });
});
