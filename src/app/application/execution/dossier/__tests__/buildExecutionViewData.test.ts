import { describe, expect, it } from 'vitest';
import { buildExecutionViewData } from '../buildExecutionViewData';
import { makeInabaSubFileId } from '@/app/domain/execution/dossier/ExecutionDossierScope';
import type { ExecutionFile } from '@/app/types/execution';
import { executionStorageKey } from '@/app/utils/executionStorageKeys';
import { storageCache } from '@/app/utils/storageCache';

function makeFile(overrides: Partial<ExecutionFile> & { id: string | number }): ExecutionFile {
    return {
        id: String(overrides.id),
        directorate: 'الكرخ',
        fileNumber: '1',
        fileYear: '2026',
        executionDate: '2026-01-01',
        submissionDate: '2026-01-01',
        claimType: 'استحصال دين مالي',
        documentType: 'حكم',
        documentDate: '2026-01-01',
        creditors: [],
        debtors: [],
        debtAmount: 0,
        currency: 'IQD',
        courtFees: 0,
        directorateFees: 0,
        lawyerFees: 0,
        clientFees: 0,
        executionFee: 0,
        paidDebt: 0,
        paidCourtFees: 0,
        paidDirectorateFees: 0,
        paidClientFees: 0,
        status: 'active',
        isPaused: false,
        timelineEvents: [],
        ...overrides,
    } as unknown as ExecutionFile;
}

describe('buildExecutionViewData', () => {
    it('ignores stale storage blobs for a different dossier id', () => {
        storageCache.clear();
        storageCache.set(
            executionStorageKey('new-dossier'),
            makeFile({
                id: 'old-dossier',
                timelineEvents: [{ id: 'ev-old', type: 'note', title: 'قديم', date: '2026-01-01' }],
            }),
        );

        const result = buildExecutionViewData({
            currentFile: null,
            file: makeFile({ id: 'new-dossier', timelineEvents: [] }),
            executionId: 'new-dossier',
            executionStorageTick: 1,
        });

        expect(result?.id).toBe('new-dossier');
        expect(result?.timelineEvents ?? []).toHaveLength(0);
    });

    it('prefers store current file during inaba delegation view', () => {
        storageCache.clear();
        const parentId = 'parent-1';
        const inabaId = makeInabaSubFileId(parentId);

        const result = buildExecutionViewData({
            currentFile: makeFile({
                id: inabaId,
                directorate: 'مديرية الإنابة',
                parentId,
            } as unknown as Partial<ExecutionFile> & { id: string }),
            file: makeFile({ id: parentId, directorate: 'الكرخ' }),
            executionId: parentId,
            executionStorageTick: 0,
            preferStoreCurrentFile: true,
        });

        expect(result?.id).toBe(inabaId);
        expect(result?.directorate).toBe('مديرية الإنابة');
    });

    it('prefers stored creditors after local persist when parent prop is stale', () => {
        storageCache.clear();
        const stale = makeFile({
            id: 'ex-1',
            updatedAt: '2026-01-01T00:00:00.000Z',
            creditors: [{ id: 'c1', name: 'قديم', phone: '111', address: 'أ' } as never],
        });
        const fresh = makeFile({
            id: 'ex-1',
            updatedAt: '2026-06-01T12:00:00.000Z',
            creditors: [{ id: 'c1', name: 'جديد', phone: '999', address: 'ب' } as never],
        });
        storageCache.set(executionStorageKey('ex-1'), fresh);

        const result = buildExecutionViewData({
            currentFile: null,
            file: stale,
            executionId: 'ex-1',
            executionStorageTick: 3,
        });

        expect(result?.creditors?.[0]?.name).toBe('جديد');
        expect((result?.creditors?.[0] as { phone?: string })?.phone).toBe('999');
    });

    it('prefers newer store currentFile over stale parent file prop', () => {
        storageCache.clear();
        const stale = makeFile({
            id: 'ex-9',
            updatedAt: '2026-01-01T00:00:00.000Z',
            creditors: [{ id: 'c1', name: 'قديم', phone: '111', address: 'أ' } as never],
        });
        const fresh = makeFile({
            id: 'ex-9',
            updatedAt: '2026-07-01T12:00:00.000Z',
            creditors: [{ id: 'c1', name: 'من المتجر', phone: '555', address: 'ج' } as never],
        });

        const result = buildExecutionViewData({
            currentFile: fresh,
            file: stale,
            executionId: 'ex-9',
            executionStorageTick: 1,
        });

        expect(result?.creditors?.[0]?.name).toBe('من المتجر');
        expect((result?.creditors?.[0] as { phone?: string })?.phone).toBe('555');
    });

    it('does not let older storage overwrite a newer in-memory store edit after tick', () => {
        storageCache.clear();
        const staleStored = makeFile({
            id: 'ex-keep',
            updatedAt: '2026-01-01T00:00:00.000Z',
            creditors: [{ id: 'c1', name: 'كاش قديم', phone: '000', address: 'ز' } as never],
        });
        const freshStore = makeFile({
            id: 'ex-keep',
            updatedAt: '2026-08-01T12:00:00.000Z',
            creditors: [{ id: 'c1', name: 'تعديل حي', phone: '777', address: 'ك' } as never],
        });
        storageCache.set(executionStorageKey('ex-keep'), staleStored);

        const result = buildExecutionViewData({
            currentFile: freshStore,
            file: staleStored,
            executionId: 'ex-keep',
            executionStorageTick: 9,
        });

        expect(result?.creditors?.[0]?.name).toBe('تعديل حي');
        expect((result?.creditors?.[0] as { phone?: string })?.phone).toBe('777');
    });

    it('prefers stored party death over index/prop without death at tick 0', () => {
        storageCache.clear();
        const alive = makeFile({
            id: 'ex-death',
            updatedAt: '2026-06-01T00:00:00.000Z',
            debtors: [{ id: 'd1', name: 'مدين', isDeceased: false } as never],
        });
        const deceased = makeFile({
            id: 'ex-death',
            updatedAt: '2026-06-01T00:00:00.000Z',
            is_debtor_deceased: true,
            debtors: [{ id: 'd1', name: 'مدين', isDeceased: true } as never],
        } as Partial<ExecutionFile> & { id: string });
        storageCache.set(executionStorageKey('ex-death'), deceased);

        const result = buildExecutionViewData({
            currentFile: null,
            file: alive,
            executionId: 'ex-death',
            executionStorageTick: 0,
        });

        expect((result as { is_debtor_deceased?: boolean } | null)?.is_debtor_deceased).toBe(true);
        expect((result?.debtors?.[0] as { isDeceased?: boolean } | undefined)?.isDeceased).toBe(true);
    });

    it('fills missing instrument fields from stored blob when list index wins', () => {
        storageCache.clear();
        const indexLite = makeFile({
            id: 'ex-meta',
            updatedAt: '2026-07-02T00:00:00.000Z',
            classification: 'مدني',
            docType: '',
            docNumber: '',
            judgmentDate: '',
            claimType: '',
        });
        const storedFull = makeFile({
            id: 'ex-meta',
            updatedAt: '2026-07-01T00:00:00.000Z',
            classification: 'مدني',
            docType: 'قرارات وأحكام المحاكم',
            docNumber: 'ح/99',
            judgmentDate: '2026-03-15',
            claimType: 'استحصال دين مالي',
        });
        storageCache.set(executionStorageKey('ex-meta'), storedFull);

        const result = buildExecutionViewData({
            currentFile: null,
            file: indexLite,
            executionId: 'ex-meta',
            executionStorageTick: 0,
        });

        expect(result?.docType).toBe('قرارات وأحكام المحاكم');
        expect(result?.docNumber).toBe('ح/99');
        expect(result?.judgmentDate).toBe('2026-03-15');
        expect(result?.claimType).toBe('استحصال دين مالي');
    });
});
