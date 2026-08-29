import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { MutableRefObject } from 'react';
import type { RepositoryDocument } from '@/app/services/lawyer-cloud';
import { normalizeRepositoryRows } from '../../legalRepositoryNormalize';
import {
    peekRepositoryDocsCache,
    resetRepositoryDocsCacheForTests,
    setRepositoryDocsCache,
} from '@/app/services/forum/repositoryDocsWarmCache';

const deleteDocument = vi.fn();

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        warning: vi.fn(),
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        show: vi.fn(),
    },
}));

vi.mock('@/app/services/lawyer-cloud', () => ({
    RepositoryDB: {
        deleteDocument: (...args: unknown[]) => deleteDocument(...args),
        saveDocument: vi.fn(),
    },
    LawyerStorage: {
        uploadSmartFile: vi.fn(),
        getSignedUrl: vi.fn(),
    },
    uuidv4: () => 'new-id',
}));

vi.mock('@/app/services/cloud/lawyerCommunityCloud', () => ({
    notifyFollowers: vi.fn(),
}));

import { useLegalRepositoryMutations } from '../useLegalRepositoryMutations';
import { SmartToast } from '@/app/components/ui/SmartToast';

function doc(
    partial: Partial<RepositoryDocument> & Pick<RepositoryDocument, 'id' | 'title' | 'authorId'>,
): RepositoryDocument {
    return {
        description: 'وصف',
        type: 'عقد',
        authorName: 'محامي',
        uploadDate: '2026-01-01',
        fileName: 'a.pdf',
        mimeType: 'application/pdf',
        storagePath: 'idb:forum:a',
        fileSize: 12,
        tags: [],
        ...partial,
    };
}

function renderMutations(opts: {
    userId: string | null;
    documents: RepositoryDocument[];
}) {
    const documentsRef: MutableRefObject<RepositoryDocument[]> = { current: opts.documents };
    const actionInflightRef: MutableRefObject<Set<string>> = { current: new Set() };
    const applyDocuments = vi.fn((rows: RepositoryDocument[]) => {
        const normalized = normalizeRepositoryRows(rows);
        documentsRef.current = normalized;
        setRepositoryDocsCache(normalized);
    });

    const hook = renderHook(() =>
        useLegalRepositoryMutations({
            user: opts.userId ? { id: opts.userId, email: 'a@b.c', user_metadata: { fullName: 'محامي' } } : null,
            userId: opts.userId,
            authorName: 'محامي',
            isOwner: (row) => opts.userId !== null && row.authorId === opts.userId,
            documentsRef,
            applyDocuments,
            actionInflightRef,
        }),
    );

    return { ...hook, documentsRef, applyDocuments, actionInflightRef };
}

describe('useLegalRepositoryMutations', () => {
    beforeEach(() => {
        deleteDocument.mockReset();
        deleteDocument.mockResolvedValue(undefined);
        vi.mocked(SmartToast.warning).mockReset();
        vi.mocked(SmartToast.success).mockReset();
        vi.mocked(SmartToast.error).mockReset();
        vi.mocked(SmartToast.info).mockReset();
        resetRepositoryDocsCacheForTests();
        window.localStorage.clear();
    });

    it('يحذف تفاؤلياً ويحدّث كاش المستودع من documentsRef', async () => {
        const keep = doc({ id: 'keep', title: 'يبقى', authorId: 'u1' });
        const gone = doc({ id: 'gone', title: 'يُحذف', authorId: 'u1' });
        setRepositoryDocsCache([keep, gone]);
        const { result, documentsRef } = renderMutations({ userId: 'u1', documents: [keep, gone] });

        act(() => {
            result.current.handleDeleteRequest(gone);
        });
        await act(async () => {
            await result.current.handleConfirmDelete();
        });

        expect(deleteDocument).toHaveBeenCalledWith('gone');
        expect(documentsRef.current.map((row) => row.id)).toEqual(['keep']);
        expect(peekRepositoryDocsCache()?.map((row) => row.id)).toEqual(['keep']);
        expect(SmartToast.success).toHaveBeenCalled();
    });

    it('يعيد الكاش عند فشل الحذف', async () => {
        deleteDocument.mockRejectedValueOnce(new Error('fail'));
        const keep = doc({ id: 'keep', title: 'يبقى', authorId: 'u1' });
        const gone = doc({ id: 'gone', title: 'يُحذف', authorId: 'u1' });
        const { result, documentsRef } = renderMutations({ userId: 'u1', documents: [keep, gone] });

        act(() => {
            result.current.handleDeleteRequest(gone);
        });
        await act(async () => {
            await result.current.handleConfirmDelete();
        });

        expect(documentsRef.current.map((row) => row.id)).toEqual(['keep', 'gone']);
        expect(peekRepositoryDocsCache()?.map((row) => row.id)).toEqual(['keep', 'gone']);
        expect(SmartToast.error).toHaveBeenCalledWith('فشل حذف المستند');
    });

    it('يمنع الحذف المتوازي لنفس المستند', async () => {
        let resolveDelete: () => void = () => undefined;
        deleteDocument.mockImplementation(
            () =>
                new Promise<void>((resolve) => {
                    resolveDelete = resolve;
                }),
        );
        const gone = doc({ id: 'gone', title: 'يُحذف', authorId: 'u1' });
        const { result, actionInflightRef } = renderMutations({ userId: 'u1', documents: [gone] });

        act(() => {
            result.current.handleDeleteRequest(gone);
        });

        let first: Promise<void> | undefined;
        act(() => {
            first = result.current.handleConfirmDelete();
            void result.current.handleConfirmDelete();
        });

        expect(actionInflightRef.current.has('del:gone')).toBe(true);
        expect(deleteDocument).toHaveBeenCalledTimes(1);

        await act(async () => {
            resolveDelete();
            await first;
        });
        expect(actionInflightRef.current.has('del:gone')).toBe(false);
    });

    it('يرفض الإبلاغ بدون دخول أو عن مستند المستخدم', () => {
        const own = doc({ id: 'own', title: 'ملكي', authorId: 'u1' });
        const unsigned = renderMutations({ userId: null, documents: [own] });
        act(() => {
            unsigned.result.current.handleReportDocument(own);
        });
        expect(SmartToast.warning).toHaveBeenCalledWith('سجّل الدخول للإبلاغ');

        const signed = renderMutations({ userId: 'u1', documents: [own] });
        act(() => {
            signed.result.current.handleReportDocument(own);
        });
        expect(SmartToast.warning).toHaveBeenCalledWith('لا يمكنك الإبلاغ عن مستندك');
        expect(SmartToast.success).not.toHaveBeenCalled();
    });

    it('يسجّل البلاغ محلياً ويمنع التكرار', () => {
        const other = doc({ id: 'other', title: 'مستند زميل', authorId: 'u2' });
        const { result } = renderMutations({ userId: 'u1', documents: [other] });

        act(() => {
            result.current.handleReportDocument(other);
        });
        expect(SmartToast.success).toHaveBeenCalledWith('تم تسجيل البلاغ');

        act(() => {
            result.current.handleReportDocument(other);
        });
        expect(SmartToast.info).toHaveBeenCalledWith('أبلغت عن هذا المستند مسبقاً');
    });
});
