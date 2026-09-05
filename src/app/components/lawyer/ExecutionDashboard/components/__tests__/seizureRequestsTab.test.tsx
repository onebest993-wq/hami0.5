import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SeizureRequestsTab } from '../SeizureRequestsTab';
import type { SeizureMatrixResult } from '@/app/utils/seizureMatrix';
import { shouldShowGuarantorRequestInSeizureTab } from '../hiddenFollowupRequestsUtils';
import { isSalarySeizureLaneOccupied } from '@/app/components/lawyer/ExecutionDashboard/utils/salarySeizureTabUtils';

vi.mock('@/app/components/ui/SmartDialog', () => ({
    SmartDialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
        open ? <div>{children}</div> : null,
}));

vi.mock('../InlineActionGate', () => ({
    InlineActionGate: () => <div data-testid="inline-gate" />,
}));

vi.mock('../GuarantorWorkspaceWrapper', () => ({
    GuarantorWorkspaceWrapper: () => <div data-testid="guarantor-wrapper" />,
}));

vi.mock('@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion', () => ({
    ExecutionInlineAccordion: () => <div data-testid="inline-accordion" />,
}));

vi.mock('@/app/utils/executorSeizureDecisionQueue', () => ({
    DECISIONS_RELOAD_EVENT: 'hami-decisions-reload',
    appendPendingExecutorSeizureDecision: vi.fn(() => 'decision-1'),
    closeSeizureSubtypeDecisionCycle: vi.fn(),
    dispatchDecisionsReload: vi.fn(),
    getGoverningSeizureDecisionBySubtype: vi.fn(() => null),
    isExecutorHubRowInactiveForGoverning: vi.fn(() => false),
    isExecutorRowEffectivelyApproved: vi.fn(() => false),
    isExecutorRowRejectedAndFinal: vi.fn(() => false),
    isGuarantorRequestDecisionRow: vi.fn(() => false),
    patchExecutorDecisionRowEverywhere: vi.fn(),
    readExecutorDecisionsArray: vi.fn(() => []),
}));

vi.mock('@/app/components/lawyer/ExecutionDashboard/hooks/useSeizureRegistryAssets', () => ({
    isSalarySeizureAsset: vi.fn(() => false),
}));

vi.mock('@/app/components/lawyer/ExecutionDashboard/utils/salarySeizureTabUtils', () => ({
    isSalarySeizureLaneOccupied: vi.fn(() => false),
}));

vi.mock('@/app/utils/executionDomainIsolation', () => ({
    isFollowupRequestKindAllowed: vi.fn(() => ({ allowed: true })),
}));

vi.mock('@/app/utils/executorRequestAppealSync', () => ({
    isExecutorRowApprovedWorkflowActive: vi.fn(() => false),
}));

vi.mock('../hiddenFollowupRequestsUtils', () => ({
    shouldShowGuarantorRequestInSeizureTab: vi.fn(() => false),
}));

describe('SeizureRequestsTab', () => {
    const seizureMatrix: SeizureMatrixResult = {
        ruleId: 'rule_5_full',
        remainingBalanceIqd: 9000000,
        hideSeizureTab: false,
        requiresSoftActivationModal: false,
        showTabContentButtons: true,
        allSeizureDisabled: false,
        buttons: {
            salary: true,
            movable: false,
            third_party: false,
            property: false,
        },
        progressiveDisclosure: {
            showAdditionalExpand: false,
            additionalButtons: [],
            showMaximumExpand: false,
            maximumButtons: [],
        },
    };

    const baseProps = {
        executionId: 'exec-1',
        remainingBalanceIqd: 9000000,
        financialCenterTotalIqd: 9000000,
        seizureDetailCompletion: null,
        saveCoerciveAction: vi.fn(),
        persistGuarantorFollowupDetails: vi.fn(),
        pushTimelineEvent: vi.fn(),
        nextTimelineId: () => 'timeline-1',
        getLocalTodayYmd: () => '2026-07-11',
        showToast: vi.fn(),
        activeDebtorIsDeceased: false,
        executionCoerciveButtonDisabled: false,
        coerciveUiLocked: false,
        isHistoricalMode: false,
        inlineActionGateKey: null,
        setInlineActionGateKey: vi.fn(),
        handleCoerciveAction: vi.fn(),
        handleGuarantorRequestFromFollowup: vi.fn(),
        requestFollowupSeizureDecision: vi.fn(),
        financialGuarantorRequestOnly: false,
        isFinancialDebtCollectionClaim: true,
        settlementBreachTriggeredAt: null,
        ledgerPendingSettlement: null,
        isAlimonyClaim: false,
        claimType: '',
    } satisfies Partial<React.ComponentProps<typeof SeizureRequestsTab>>;

    beforeEach(() => {
        vi.mocked(shouldShowGuarantorRequestInSeizureTab).mockReturnValue(false);
        vi.mocked(isSalarySeizureLaneOccupied).mockReturnValue(false);
    });

    it('renders the recommended salary seizure request path', () => {
        render(
            <SeizureRequestsTab
                {...baseProps}
                executionData={{ id: 'exec-1' } as never}
                seizureMatrix={seizureMatrix}
                persistExecutionMerge={vi.fn()}
                activeDebtorIsEmployee={true}
                hideAllGuarantorPresence={true}
            />,
        );

        expect(screen.getByText('طلب حجز راتب')).toBeInTheDocument();
        expect(screen.getByTestId('inline-gate')).toBeInTheDocument();
    });

    it('hides salary seizure when the debtor is deceased', () => {
        render(
            <SeizureRequestsTab
                {...baseProps}
                executionData={{ id: 'exec-1' } as never}
                seizureMatrix={seizureMatrix}
                persistExecutionMerge={vi.fn()}
                activeDebtorIsEmployee={true}
                activeDebtorIsDeceased={true}
                hideAllGuarantorPresence={true}
            />,
        );

        expect(screen.queryByText('طلب حجز راتب')).not.toBeInTheDocument();
        expect(screen.queryByText('طلب حجز الحوافز والمخصصات')).not.toBeInTheDocument();
    });

    it('keeps the salary seizure block after a salary request is already open', () => {
        vi.mocked(isSalarySeizureLaneOccupied).mockReturnValue(true);

        render(
            <SeizureRequestsTab
                {...baseProps}
                executionData={{ id: 'exec-1' } as never}
                seizureMatrix={seizureMatrix}
                persistExecutionMerge={vi.fn()}
                activeDebtorIsEmployee={true}
                hideAllGuarantorPresence={true}
            />,
        );

        expect(screen.getByText('طلب حجز راتب')).toBeInTheDocument();
    });

    it('offers soft opt-in instead of an empty seizure tab for the 1–2M remaining band', () => {
        const persistExecutionMerge = vi.fn();
        render(
            <SeizureRequestsTab
                {...baseProps}
                remainingBalanceIqd={1_500_000}
                financialCenterTotalIqd={1_500_000}
                executionData={{ id: 'exec-1' } as never}
                persistExecutionMerge={persistExecutionMerge}
                activeDebtorIsEmployee={true}
                hideAllGuarantorPresence={true}
                seizureMatrix={{
                    ruleId: 'rule_2_soft',
                    remainingBalanceIqd: 1_500_000,
                    hideSeizureTab: false,
                    requiresSoftActivationModal: true,
                    showTabContentButtons: false,
                    allSeizureDisabled: true,
                    buttons: {
                        salary: false,
                        movable: false,
                        third_party: false,
                        property: false,
                    },
                    progressiveDisclosure: {
                        showAdditionalExpand: false,
                        additionalButtons: [],
                        showMaximumExpand: false,
                        maximumButtons: [],
                    },
                }}
            />,
        );

        expect(screen.queryByText(/لا تتوفر إجراءات حجز/)).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'تفعيل إجراءات الحجز' }));
        expect(persistExecutionMerge).toHaveBeenCalledWith({ seizure_matrix_soft_opt_in: true });
    });

    it('shows guarantor seizure follow-up actions after the guarantor is approved', () => {
        vi.mocked(shouldShowGuarantorRequestInSeizureTab).mockReturnValue(true);

        render(
            <SeizureRequestsTab
                {...baseProps}
                executionData={
                    {
                        id: 'exec-1',
                        guarantor_followup: {
                            executor_approved: true,
                            details_saved: true,
                            channel: 'financial',
                            guarantor_name: 'أحمد',
                            guarantor_workplace: 'مكتب',
                        },
                    } as never
                }
                seizureMatrix={seizureMatrix}
                persistExecutionMerge={vi.fn()}
                activeDebtorIsEmployee={false}
                hideAllGuarantorPresence={false}
                financialGuarantorRequestOnly={true}
                requestGuarantorSeizure={vi.fn()}
            />,
        );

        expect(screen.getByText('طلب كفيل ضامن')).toBeInTheDocument();
        expect(screen.getByText('حجز راتب الكفيل')).toBeInTheDocument();
        expect(screen.getByText('حجز منقولات الكفيل')).toBeInTheDocument();
        expect(screen.getByText('حجز عقار الكفيل')).toBeInTheDocument();
    });
});
