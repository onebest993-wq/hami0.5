import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { MutableRefObject } from 'react';
import type { RepositoryDocument } from '@/app/services/lawyer-cloud';
import { normalizeRepositoryRows } from '../../legalRepositoryNormalize';
import { resetRepositoryDocsCacheForTests, setRepositoryDocsCache } from '@/app/services/forum/repositoryDocsWarmCache';

const saveDocument = vi.fn();
const persist = vi.fn();
const releaseRepositoryBlobUrl = vi.fn();
const reserveRepositoryFileLocally = vi.fn();

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        warning: vi.fn(),
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        show: vi.fn(),
    },
}));

vi.mock('@/app/services/cloud/lawyerRepositoryCloud', () => ({
    RepositoryDB: {
        saveDocument: (...args: unknown[]) => saveDocument(...args),
        deleteDocument: vi.fn(),
    },
}));
vi.mock('@/app/services/storage/lawyerStorageRuntime', () => ({
    LawyerStorage: {
        uploadSmartFile: vi.fn(),
        getSignedUrl: vi.fn(),
    },
}));
vi.mock('@/app/services/cloud/lawyerCloudKv', () => ({
    uuidv4: () => 'new-id',
}));

vi.mock('@/app/services/cloud/lawyerCommunityCloud', () => ({
    notifyFollowers: vi.fn(),
}));

vi.mock('../../repositoryStorageService', () => ({
    reserveRepositoryFileLocally: (...args: unknown[]) => reserveRepositoryFileLocally(...args),
    releaseRepositoryBlobUrl: (...args: unknown[]) => releaseRepositoryBlobUrl(...args),
}));

vi.mock('../../legalRepositoryCloudSync', () => ({
    syncRepositoryDocumentToCloud: vi.fn(),
}));

vi.mock('@/app/services/forumApiService', () => ({
    ForumApiService: {
        createRepositoryDocument: vi.fn(async (doc: unknown) => doc),
        updateRepositoryDocument: vi.fn(async (_id: string, doc: unknown) => doc),
    },
}));

import { useLegalRepositoryUpload } from '../useLegalRepositoryUpload';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { syncRepositoryDocumentToCloud } from '../../legalRepositoryCloudSync';
import { ForumApiService } from '@/app/services/forumApiService';

function renderUpload() {
    const documentsRef: MutableRefObject<RepositoryDocument[]> = { current: [] };
    const actionInflightRef: MutableRefObject<Set<string>> = { current: new Set() };
    const applyDocuments = vi.fn((rows: RepositoryDocument[]) => {
        documentsRef.current = normalizeRepositoryRows(rows);
        setRepositoryDocsCache(documentsRef.current);
    });
    const hook = renderHook(() =>
        useLegalRepositoryUpload({
            user: { id: 'u1', email: 'a@b.c', user_metadata: { fullName: 'محامي' } },
            authorName: 'محامي',
            isOwner: () => true,
            documentsRef,
            applyDocuments,
            actionInflightRef,
        }),
    );
    return { ...hook, documentsRef, applyDocuments, actionInflightRef };
}

describe('useLegalRepositoryUpload', () => {
    beforeEach(() => {
        saveDocument.mockReset();
        persist.mockReset();
        releaseRepositoryBlobUrl.mockReset();
        reserveRepositoryFileLocally.mockReset();
        vi.mocked(SmartToast.error).mockReset();
        vi.mocked(SmartToast.success).mockReset();
        vi.mocked(SmartToast.warning).mockReset();
        resetRepositoryDocsCacheForTests();
        saveDocument.mockResolvedValue(undefined);
        persist.mockResolvedValue(undefined);
        vi.mocked(ForumApiService.createRepositoryDocument).mockReset();
        vi.mocked(ForumApiService.createRepositoryDocument).mockImplementation(async (doc) => doc as never);
        vi.mocked(ForumApiService.updateRepositoryDocument).mockReset();
        vi.mocked(ForumApiService.updateRepositoryDocument).mockImplementation(async (_id, doc) => doc as never);
        vi.mocked(syncRepositoryDocumentToCloud).mockImplementation(async ({ savedDoc }) => ({
            ...savedDoc,
            storagePath: 'u1/repository/a.pdf',
        }));
        reserveRepositoryFileLocally.mockReturnValue({
            storagePath: 'idb:forum:new',
            fileName: 'a.pdf',
            mimeType: 'application/pdf',
            fileSize: 3,
            persist,
        });
    });

    it('يحرر الملف المحجوز إن فشلت الكتابة المحلية', async () => {
        persist.mockRejectedValueOnce(new Error('idb'));
        const { result } = renderUpload();
        const file = new File(['%PDF-1.4\n'], 'a.pdf', { type: 'application/pdf' });
        await act(async () => {
            await result.current
                .handleUploadSubmit({
                    title: 'عقد تجريبي',
                    type: 'عقد',
                    description: 'وصف كافٍ للمستند',
                    file,
                    tags: [],
                })
                .catch(() => undefined);
        });
        expect(releaseRepositoryBlobUrl).toHaveBeenCalledWith('idb:forum:new');
        expect(saveDocument).not.toHaveBeenCalled();
        expect(SmartToast.error).toHaveBeenCalledWith('تعذّر حفظ نسخة الملف محلياً');
    });

    it('يمنع الرفع المتوازي لنفس المفتاح', async () => {
        let resolvePersist: () => void = () => undefined;
        persist.mockImplementation(
            () =>
                new Promise<void>((resolve) => {
                    resolvePersist = resolve;
                }),
        );
        const { result, actionInflightRef } = renderUpload();
        const file = new File(['%PDF-1.4\n'], 'a.pdf', { type: 'application/pdf' });
        const payload = {
            title: 'عقد تجريبي',
            type: 'عقد',
            description: 'وصف كافٍ للمستند',
            file,
            tags: [],
        };
        let first: Promise<void> | undefined;
        act(() => {
            first = result.current.handleUploadSubmit(payload);
            void result.current.handleUploadSubmit(payload);
        });
        expect(actionInflightRef.current.has('upload:new')).toBe(true);
        await act(async () => {
            await Promise.resolve();
        });
        expect(persist).toHaveBeenCalledTimes(1);
        await act(async () => {
            resolvePersist();
            await first;
        });
        expect(actionInflightRef.current.has('upload:new')).toBe(false);
    });

    it('يعلّم indexSync عند فشل الفهرسة بعد رفع سحابي ناجح', async () => {
        vi.mocked(ForumApiService.createRepositoryDocument).mockRejectedValueOnce(new Error('index-down'));
        const { result } = renderUpload();
        const file = new File(['%PDF-1.4\n'], 'a.pdf', { type: 'application/pdf' });
        await act(async () => {
            await result.current.handleUploadSubmit({
                title: 'عقد تجريبي',
                type: 'عقد',
                description: 'وصف كافٍ للمستند',
                file,
                tags: [],
            });
        });
        expect(saveDocument).toHaveBeenCalledWith(expect.objectContaining({ indexSync: 'create' }));
        expect(SmartToast.warning).toHaveBeenCalled();
        expect(SmartToast.success).toHaveBeenCalled();
    });
});
