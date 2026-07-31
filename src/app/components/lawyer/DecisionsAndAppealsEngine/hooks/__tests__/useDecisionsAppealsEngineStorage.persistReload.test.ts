/** @vitest-environment jsdom */
import { describe, expect, it, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDecisionsAppealsEngineStorage } from '../useDecisionsAppealsEngineStorage';
import { clearDecisionsNamespaceForTests } from '@/app/utils/executionDecisionsNamespace';
import {
    clearAllDecisionsSessionCachesForTests,
} from '../../engine/decisionsSessionCache';
import { clearDecisionsDiscoverCacheForTests } from '../../engine/resolveDecisionsStorageExecutionId';

describe('useDecisionsAppealsEngineStorage persist + reload', () => {
    const executionId = 'persist-reload-exec-1';
    const executionData = {
        id: executionId,
        claimType: 'استحصال دين مالي',
        creditors: [{ name: 'دائن', isClient: true }],
    };

    beforeEach(() => {
        clearAllDecisionsSessionCachesForTests();
        clearDecisionsDiscoverCacheForTests();
        clearDecisionsNamespaceForTests(executionId);
    });

    it('يحفظ قراراً يدوياً ويبقى بعد إعادة التحميل من التخزين', async () => {
        const { result, rerender } = renderHook(
            (props: { syncKey: string }) =>
                useDecisionsAppealsEngineStorage({
                    executionId,
                    executionDataForSync: executionData,
                    executionDataSyncKey: props.syncKey,
                }),
            { initialProps: { syncKey: 'v1' } },
        );

        act(() => {
            const next = [
                {
                    id: 'manual-1',
                    title: 'قرار اختبار',
                    body: 'تفاصيل',
                    date: '2026-07-24',
                    manualExecutorLedgerEntry: true,
                    executorDecisionStatusFlag: 1 as const,
                    appealStatus: 'pending' as const,
                    appealPhase: null,
                    appealWorkflowState: 'NONE' as const,
                    domainNamespace: 'financial_debt',
                },
                ...result.current.decisions,
            ];
            const persisted = result.current.persistDecisionsToStorage(next);
            expect(persisted).not.toBeNull();
            expect(persisted!.some((d) => d.id === 'manual-1')).toBe(true);
            if (persisted) {
                result.current.setDecisions(persisted);
            }
        });

        expect(result.current.decisions.some((d) => d.id === 'manual-1')).toBe(true);

        act(() => {
            result.current.reloadFromStorage();
        });
        expect(result.current.decisions.some((d) => d.id === 'manual-1')).toBe(true);

        // محاكاة وصول بيانات متأخرة من shell (تغيّر sync key)
        await act(async () => {
            rerender({ syncKey: 'v2' });
            result.current.reloadFromStorage();
        });
        expect(result.current.decisions.some((d) => d.id === 'manual-1')).toBe(true);
        expect(result.current.domainVisibleDecisions.some((d) => d.id === 'manual-1')).toBe(true);
    });
});
