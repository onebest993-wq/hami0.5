import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ExecutionFile } from '@/app/types/execution';
import { useExecutionDashboardPersistExecutionMerge } from '../useExecutionDashboardPersistExecutionMerge';
import { useExecutionDashboardStore } from '@/app/stores';
import SecureStoreService from '@/app/services/SecureStoreService';
import { storageCache } from '@/app/utils/storageCache';
import { executionStorageKey } from '@/app/utils/executionStorageKeys';
import * as dossierPersistence from '@/app/utils/executionDossierBlobPersistence';

function makeFile(): ExecutionFile {
    return {
        id: 'ex-ui-first',
        creditors: [{ id: 'c1', name: 'قديم', phone: '07701111111', address: 'أ' }],
        debtors: [],
        updatedAt: '2026-01-01T00:00:00.000Z',
    } as unknown as ExecutionFile;
}

describe('useExecutionDashboardPersistExecutionMerge ui-first', () => {
    beforeEach(() => {
        storageCache.clear();
        useExecutionDashboardStore.setState({
            currentFile: makeFile(),
            activeSubFileId: null,
            subFiles: [],
            delegationParentFileId: null,
        } as never);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('updates ref/cache immediately and defers store tick + disk off the render path', async () => {
        const order: string[] = [];
        const file = makeFile();
        const executionDataRef = { current: file as ExecutionFile | null };
        const seizureDraftsByDecisionIdRef = { current: undefined };
        const setExecutionStorageTick = vi.fn((updater: (n: number) => number) => {
            order.push('tick');
            updater(0);
        });
        const onUpdate = vi.fn(() => {
            order.push('onUpdate');
        });
        const blobSpy = vi
            .spyOn(dossierPersistence, 'persistExecutionDossierBlob')
            .mockImplementation(() => {
                order.push('disk');
                return true;
            });

        const { result } = renderHook(() =>
            useExecutionDashboardPersistExecutionMerge({
                executionId: 'ex-ui-first',
                isUnifiedTabActive: false,
                unifiedTabId: undefined,
                onUpdate,
                executionDataRef,
                seizureDraftsByDecisionIdRef,
                setExecutionStorageTick,
            }),
        );

        act(() => {
            result.current.persistExecutionMerge({
                creditors: [{ id: 'c1', name: 'جديد', phone: '07701234567', address: 'ب' }],
            });
        });

        // فوري: ref + cache — بدون setState على المتجر أثناء نفس مسار الـ updater
        expect(order).toEqual([]);
        expect(executionDataRef.current?.creditors?.[0]?.name).toBe('جديد');
        expect(
            (storageCache.get(executionStorageKey('ex-ui-first')) as ExecutionFile | null)?.creditors?.[0]
                ?.name,
        ).toBe('جديد');
        expect(useExecutionDashboardStore.getState().currentFile?.creditors?.[0]?.name).toBe('قديم');
        expect(blobSpy).not.toHaveBeenCalled();
        expect(onUpdate).not.toHaveBeenCalled();

        await act(async () => {
            await Promise.resolve();
        });

        expect(order).toEqual(['tick', 'disk', 'onUpdate']);
        expect(useExecutionDashboardStore.getState().currentFile?.creditors?.[0]?.name).toBe('جديد');
        expect(blobSpy).toHaveBeenCalledWith(
            'ex-ui-first',
            expect.objectContaining({
                creditors: [expect.objectContaining({ name: 'جديد' })],
            }),
            { syncIndex: false },
        );
        expect(onUpdate).toHaveBeenCalledTimes(1);
    });

    it('writes party-death patches to disk immediately and flushes heavy IDB', () => {
        const file = makeFile();
        const executionDataRef = { current: file as ExecutionFile | null };
        const seizureDraftsByDecisionIdRef = { current: undefined };
        const setExecutionStorageTick = vi.fn((updater: (n: number) => number) => updater(0));
        const onUpdate = vi.fn();
        const blobSpy = vi
            .spyOn(dossierPersistence, 'persistExecutionDossierBlob')
            .mockImplementation(() => true);
        const flushSpy = vi
            .spyOn(SecureStoreService, 'flushHeavyPersistPending')
            .mockImplementation(() => undefined);

        const { result } = renderHook(() =>
            useExecutionDashboardPersistExecutionMerge({
                executionId: 'ex-ui-first',
                isUnifiedTabActive: false,
                unifiedTabId: undefined,
                onUpdate,
                executionDataRef,
                seizureDraftsByDecisionIdRef,
                setExecutionStorageTick,
            }),
        );

        let ok = false;
        act(() => {
            ok = result.current.persistExecutionMerge({
                is_creditor_deceased: true,
                creditors: [{ id: 'c1', name: 'قديم', phone: '07701111111', address: 'أ', isDeceased: true }],
            });
        });

        expect(ok).toBe(true);
        expect(blobSpy).toHaveBeenCalledTimes(1);
        expect(blobSpy).toHaveBeenCalledWith(
            'ex-ui-first',
            expect.objectContaining({ is_creditor_deceased: true }),
            { syncIndex: true },
        );
        expect(flushSpy).toHaveBeenCalled();
        expect(onUpdate).toHaveBeenCalledTimes(1);
    });

    it('drops stale deferred disk writes after a newer party-death persist', async () => {
        const file = makeFile();
        const executionDataRef = { current: file as ExecutionFile | null };
        const seizureDraftsByDecisionIdRef = { current: undefined };
        const setExecutionStorageTick = vi.fn((updater: (n: number) => number) => updater(0));
        const onUpdate = vi.fn();
        const blobSpy = vi
            .spyOn(dossierPersistence, 'persistExecutionDossierBlob')
            .mockImplementation(() => true);

        const { result } = renderHook(() =>
            useExecutionDashboardPersistExecutionMerge({
                executionId: 'ex-ui-first',
                isUnifiedTabActive: false,
                unifiedTabId: undefined,
                onUpdate,
                executionDataRef,
                seizureDraftsByDecisionIdRef,
                setExecutionStorageTick,
            }),
        );

        act(() => {
            result.current.persistExecutionMerge({
                creditors: [{ id: 'c1', name: 'تعديل عابر', phone: '07701111111', address: 'أ' }],
            });
            result.current.persistExecutionMerge({
                is_creditor_deceased: true,
                creditors: [
                    {
                        id: 'c1',
                        name: 'قديم',
                        phone: '07701111111',
                        address: 'أ',
                        isDeceased: true,
                    },
                ],
            });
        });

        expect(blobSpy).toHaveBeenCalledTimes(1);
        expect(blobSpy).toHaveBeenCalledWith(
            'ex-ui-first',
            expect.objectContaining({ is_creditor_deceased: true }),
            { syncIndex: true },
        );

        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        // الكتابة المؤجّلة القديمة يجب أن تُلغى — لا تُستدعى مرة ثانية بلقطة بلا وفاة
        expect(blobSpy).toHaveBeenCalledTimes(1);
        expect(executionDataRef.current).toEqual(
            expect.objectContaining({ is_creditor_deceased: true }),
        );
        expect(onUpdate).toHaveBeenCalledTimes(1);
        expect(onUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ is_creditor_deceased: true }),
        );
    });

    it('blocks creditor-only persist patches for debtor agent', () => {
        const file = makeFile();
        const executionDataRef = { current: file as ExecutionFile | null };
        const seizureDraftsByDecisionIdRef = { current: undefined };
        const setExecutionStorageTick = vi.fn((updater: (n: number) => number) => updater(0));
        const showToast = vi.fn();
        const onUpdate = vi.fn();
        const blobSpy = vi
            .spyOn(dossierPersistence, 'persistExecutionDossierBlob')
            .mockImplementation(() => true);

        const { result } = renderHook(() =>
            useExecutionDashboardPersistExecutionMerge({
                executionId: 'ex-ui-first',
                isUnifiedTabActive: false,
                unifiedTabId: undefined,
                onUpdate,
                executionDataRef,
                seizureDraftsByDecisionIdRef,
                setExecutionStorageTick,
                isRepresentingDebtor: true,
                showToast,
            }),
        );

        let ok = true;
        act(() => {
            ok = result.current.persistExecutionMerge({ paidDebt: 5000, financialLedger: [] });
        });

        expect(ok).toBe(false);
        expect(showToast).toHaveBeenCalled();
        expect(blobSpy).not.toHaveBeenCalled();
        expect(executionDataRef.current?.creditors?.[0]?.name).toBe('قديم');
    });

    it('allows party-death patches for debtor agent', () => {
        const file = makeFile();
        const executionDataRef = { current: file as ExecutionFile | null };
        const seizureDraftsByDecisionIdRef = { current: undefined };
        const setExecutionStorageTick = vi.fn((updater: (n: number) => number) => updater(0));
        const showToast = vi.fn();
        const onUpdate = vi.fn();
        vi.spyOn(dossierPersistence, 'persistExecutionDossierBlob').mockImplementation(() => true);

        const { result } = renderHook(() =>
            useExecutionDashboardPersistExecutionMerge({
                executionId: 'ex-ui-first',
                isUnifiedTabActive: false,
                unifiedTabId: undefined,
                onUpdate,
                executionDataRef,
                seizureDraftsByDecisionIdRef,
                setExecutionStorageTick,
                isRepresentingDebtor: true,
                showToast,
            }),
        );

        let ok = false;
        act(() => {
            ok = result.current.persistExecutionMerge({
                is_creditor_deceased: true,
            });
        });

        expect(ok).toBe(true);
        expect(showToast).not.toHaveBeenCalled();
    });
});
