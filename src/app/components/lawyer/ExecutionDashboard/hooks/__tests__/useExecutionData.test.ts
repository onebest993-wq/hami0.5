import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useExecutionData } from '../useExecutionData';
import { makeInabaSubFileId } from '@/app/stores/executionDashboardStore';
import type { ExecutionFile } from '@/app/types/execution';
import { executionStorageKey } from '@/app/utils/executionStorageKeys';
import { storageCache } from '@/app/utils/storageCache';

function makeFile(overrides: Partial<ExecutionFile> & { id: string | number }): ExecutionFile {
    return {
        id: overrides.id,
        type: 'execution',
        directorate: 'تنفيذ الكرخ',
        fileNumber: '1',
        fileYear: '2026',
        creditors: overrides.creditors ?? [],
        debtors: overrides.debtors ?? [],
        ...overrides,
    } as ExecutionFile;
}

describe('useExecutionData', () => {
    it('prefers file prop with parties over stale store currentFile', () => {
        const storeFile = makeFile({
            id: '42',
            creditors: [],
            debtors: [],
        });
        const propFile = makeFile({
            id: '42',
            creditors: [{ id: 1, name: 'دائن من النموذج', phone: '', address: '', occupation: 'كاسب', isClient: true, nationality: '' }],
            debtors: [{ id: 2, name: 'مدين من النموذج', phone: '', address: 'بغداد', occupation: 'كاسب', isClient: false, nationality: '' }],
        });

        const { result } = renderHook(() => useExecutionData(storeFile, propFile, '42', 0));

        expect(result.current?.creditors?.[0]?.name).toBe('دائن من النموذج');
        expect(result.current?.debtors?.[0]?.name).toBe('مدين من النموذج');
    });

    it('uses file prop when store is for a different dossier', () => {
        const storeFile = makeFile({ id: 'old', creditors: [{ id: 1, name: 'قديم', phone: '', address: '', occupation: 'كاسب', isClient: false, nationality: '' }] });
        const propFile = makeFile({
            id: 'new',
            creditors: [{ id: 2, name: 'جديد', phone: '', address: '', occupation: 'كاسب', isClient: true, nationality: '' }],
        });

        const { result } = renderHook(() => useExecutionData(storeFile, propFile, 'new', 0));

        expect(result.current?.id).toBe('new');
        expect(result.current?.creditors?.[0]?.name).toBe('جديد');
    });

    it('ignores storage blob when stored.id does not match dossier id', () => {
        const propFile = makeFile({
            id: 'new-dossier',
            timelineEvents: [],
        });
        storageCache.set(executionStorageKey('new-dossier'), {
            ...makeFile({
                id: 'old-dossier',
                timelineEvents: [{ id: 'ev-old', title: 'إجراء قديم', date: '2026-01-01' }],
            }),
        });

        const { result } = renderHook(() => useExecutionData(null, propFile, 'new-dossier', 1));

        expect(result.current?.timelineEvents?.length ?? 0).toBe(0);
    });

    it('merges marital furniture delivery outcomes from storage when file prop is stale', () => {
        const dossierId = 'mf-dossier-1';
        const propFile = makeFile({
            id: dossierId,
            claimType: 'أثاث زوجية' as never,
            updatedAt: '2026-07-01T10:00:00.000Z',
            maritalFurnitureItems: [
                {
                    id: 'item-a',
                    name: 'خزانة',
                    quantity: 1,
                    unitPriceIqd: 555_555,
                },
            ],
        });
        storageCache.set(executionStorageKey(dossierId), {
            ...propFile,
            updatedAt: '2026-07-31T12:00:00.000Z',
            debtAmount: 555_555,
            totalAmount: 555_555,
            maritalFurnitureItems: [
                {
                    id: 'item-a',
                    name: 'خزانة',
                    quantity: 1,
                    unitPriceIqd: 555_555,
                    delivered: false,
                    deliveryOutcome: 'failed',
                    deliveryRecordedAt: '2026-07-31T12:00:00.000Z',
                },
            ],
        });

        const { result } = renderHook(() => useExecutionData(null, propFile, dossierId, 2));

        expect(result.current?.maritalFurnitureItems?.[0]?.deliveryOutcome).toBe('failed');
        expect(result.current?.debtAmount).toBe(555_555);
    });

    it('prefers store currentFile when viewing inaba sub-dossier', () => {
        const parentId = 'parent-99';
        const inabaId = makeInabaSubFileId(parentId);
        const storeFile = makeFile({
            id: inabaId,
            directorate: 'مديرية الإنابة',
            parentId,
        } as Partial<ExecutionFile> & { id: string });
        const propFile = makeFile({
            id: parentId,
            directorate: 'مديرية الأم',
        });

        const { result } = renderHook(() =>
            useExecutionData(storeFile, propFile, parentId, 0, true)
        );

        expect(result.current?.id).toBe(inabaId);
        expect(result.current?.directorate).toBe('مديرية الإنابة');
    });
});
