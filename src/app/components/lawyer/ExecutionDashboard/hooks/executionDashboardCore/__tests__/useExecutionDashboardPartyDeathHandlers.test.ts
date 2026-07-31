/**
 * وفاة الخصوم — خطوتان منفصلتان من قائمة ⋮:
 * 1) الإبلاغ عن الوفاة → يتغيّر الزر إلى «طلب إحلال ورثة…»
 * 2) النقرة الثانية ترسل طلب الإحلال إلى قرارات المنفذ.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useExecutionDashboardPartyDeathHandlers } from '../useExecutionDashboardPartyDeathHandlers';

vi.mock('../executionDashboardPartyDeathSave', () => ({
    runPartyDeathSave: vi.fn(() => true),
}));

vi.mock('@/app/utils/executorSeizureDecisionQueue', () => ({
    appendCreditorPartyDeathRequest: vi.fn(() => ({ ok: true, decisionId: 'dec-c-1' })),
    appendDebtorHeirSubstitutionRequest: vi.fn(() => ({ ok: true, decisionId: 'dec-d-1' })),
    findLatestHeirSubstitutionDecisionNeedingEntry: vi.fn(() => null),
    getCreditorHeirSubstitutionRequestStatus: vi.fn(() => 'none'),
    getDebtorHeirSubstitutionRequestStatus: vi.fn(() => 'none'),
    patchExecutorDecisionRow: vi.fn(),
}));

vi.mock('@/app/utils/partyDeathClaimPolicy', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/app/utils/partyDeathClaimPolicy')>()),
    isHeirSubstitutionAllowedForClaim: vi.fn(() => true),
}));

import { runPartyDeathSave } from '../executionDashboardPartyDeathSave';
import {
    appendCreditorPartyDeathRequest,
    appendDebtorHeirSubstitutionRequest,
    findLatestHeirSubstitutionDecisionNeedingEntry,
    getCreditorHeirSubstitutionRequestStatus,
    getDebtorHeirSubstitutionRequestStatus,
} from '@/app/utils/executorSeizureDecisionQueue';

function baseParams(overrides: Record<string, unknown> = {}) {
    return {
        executionDataRef: { current: { id: 'x1', debtors: [{ name: 'مدين' }], creditors: [{ name: 'دائن' }] } },
        executionData: { id: 'x1' },
        executionId: 'x1',
        claimType: 'استحصال دين مالي',
        creditors: [{ name: 'دائن' }],
        debtors: [{ name: 'مدين' }],
        decisionsStorageExecutionId: 'x1',
        decisionsReloadEpoch: 0,
        partyDeathModalParty: null,
        setPartyDeathModalParty: vi.fn(),
        partyDeathModalDecisionId: null,
        setPartyDeathModalDecisionId: vi.fn(),
        setAlimonyBeneficiaryDeathModalProfile: vi.fn(),
        setAlimonyBeneficiaryDeathModalOpen: vi.fn(),
        lastHeirSubRequestAtRef: { current: { debtor: 0, creditor: 0 } },
        creditorDeathMarked: false,
        debtorDeathMarked: false,
        heirSubstitutionAllowed: true,
        ongoingAlimonyClaim: false,
        alimonyBeneficiaryProfile: null,
        nextTimelineId: (() => {
            let seq = 0;
            return () => `tl-${++seq}`;
        })(),
        persistExecutionMerge: vi.fn(),
        showToast: vi.fn(),
        setTimelineEvents: vi.fn((updater: unknown) =>
            typeof updater === 'function' ? (updater as (p: unknown[]) => unknown[])([]) : updater,
        ),
        ...overrides,
    } as unknown as Parameters<typeof useExecutionDashboardPartyDeathHandlers>[0];
}

describe('useExecutionDashboardPartyDeathHandlers — two-step death then substitution', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(findLatestHeirSubstitutionDecisionNeedingEntry).mockReturnValue(null);
        vi.mocked(getCreditorHeirSubstitutionRequestStatus).mockReturnValue('none');
        vi.mocked(getDebtorHeirSubstitutionRequestStatus).mockReturnValue('none');
        vi.mocked(appendCreditorPartyDeathRequest).mockReturnValue({ ok: true, decisionId: 'dec-c-1' });
        vi.mocked(appendDebtorHeirSubstitutionRequest).mockReturnValue({ ok: true, decisionId: 'dec-d-1' });
    });

    it('debtor: first click registers death only (no substitution request yet)', () => {
        const { result } = renderHook(() => useExecutionDashboardPartyDeathHandlers(baseParams()));

        result.current.handleDebtorDeathMenuAction();

        expect(runPartyDeathSave).toHaveBeenCalledWith(
            { action: 'death_only', deceased_party: 'debtor' },
            expect.anything(),
        );
        expect(appendDebtorHeirSubstitutionRequest).not.toHaveBeenCalled();
    });

    it('stale menu handler sees live debtorDeathMarked after rerender', () => {
        const showToast = vi.fn();
        const { result, rerender } = renderHook(
            (props: Parameters<typeof useExecutionDashboardPartyDeathHandlers>[0]) =>
                useExecutionDashboardPartyDeathHandlers(props),
            { initialProps: baseParams({ showToast }) },
        );

        const stale = result.current.handleDebtorDeathMenuAction;

        rerender(
            baseParams({
                showToast,
                debtorDeathMarked: true,
                heirSubstitutionAllowed: false,
            }),
        );

        stale();

        expect(runPartyDeathSave).not.toHaveBeenCalled();
        expect(showToast).toHaveBeenCalledWith(
            'تم تسجيل وفاة المدين مسبقاً — لا إجراء إضافي في هذا النوع من المطالبة.',
            'info',
        );
    });

    it('creditor: first click registers death only (no substitution request yet)', () => {
        const { result } = renderHook(() => useExecutionDashboardPartyDeathHandlers(baseParams()));

        result.current.handleCreditorDeathMenuAction();

        expect(runPartyDeathSave).toHaveBeenCalledWith(
            { action: 'death_only', deceased_party: 'creditor' },
            expect.anything(),
        );
        expect(appendCreditorPartyDeathRequest).not.toHaveBeenCalled();
    });

    it('debtor: second click (death already marked) sends heir substitution request', () => {
        const { result } = renderHook(() =>
            useExecutionDashboardPartyDeathHandlers(baseParams({ debtorDeathMarked: true })),
        );

        result.current.handleDebtorDeathMenuAction();

        expect(runPartyDeathSave).not.toHaveBeenCalled();
        expect(appendDebtorHeirSubstitutionRequest).toHaveBeenCalledWith({
            executionId: 'x1',
            debtorNameSnapshot: 'مدين',
        });
    });

    it('creditor: second click (death already marked) sends heir substitution request', () => {
        const { result } = renderHook(() =>
            useExecutionDashboardPartyDeathHandlers(baseParams({ creditorDeathMarked: true })),
        );

        result.current.handleCreditorDeathMenuAction();

        expect(runPartyDeathSave).not.toHaveBeenCalled();
        expect(appendCreditorPartyDeathRequest).toHaveBeenCalledWith(
            expect.objectContaining({ executionId: 'x1', action: 'heir_substitution' }),
        );
    });

    it('creditor: after approval without heirs — menu opens heirs entry modal', () => {
        vi.mocked(findLatestHeirSubstitutionDecisionNeedingEntry).mockReturnValue('dec-need-heirs');
        const setPartyDeathModalParty = vi.fn();
        const setPartyDeathModalDecisionId = vi.fn();
        const { result } = renderHook(() =>
            useExecutionDashboardPartyDeathHandlers(
                baseParams({
                    creditorDeathMarked: true,
                    setPartyDeathModalParty,
                    setPartyDeathModalDecisionId,
                }),
            ),
        );

        result.current.handleCreditorDeathMenuAction();

        expect(setPartyDeathModalParty).toHaveBeenCalledWith('creditor');
        expect(setPartyDeathModalDecisionId).toHaveBeenCalledWith('dec-need-heirs');
        expect(appendCreditorPartyDeathRequest).not.toHaveBeenCalled();
    });

    it('creditor: after heirs saved (approved, no pending entry) does not re-request', () => {
        vi.mocked(findLatestHeirSubstitutionDecisionNeedingEntry).mockReturnValue(null);
        vi.mocked(getCreditorHeirSubstitutionRequestStatus).mockReturnValue('approved');
        const showToast = vi.fn();
        const { result } = renderHook(() =>
            useExecutionDashboardPartyDeathHandlers(
                baseParams({ creditorDeathMarked: true, showToast }),
            ),
        );

        result.current.handleCreditorDeathMenuAction();

        expect(appendCreditorPartyDeathRequest).not.toHaveBeenCalled();
        expect(showToast).toHaveBeenCalledWith('تم إحلال ورثة الدائن مسبقاً.', 'info');
    });

    it('debtor: no substitution when heir path is not allowed after death marked', () => {
        const { result } = renderHook(() =>
            useExecutionDashboardPartyDeathHandlers(
                baseParams({ debtorDeathMarked: true, heirSubstitutionAllowed: false }),
            ),
        );

        result.current.handleDebtorDeathMenuAction();

        expect(appendDebtorHeirSubstitutionRequest).not.toHaveBeenCalled();
    });
});
