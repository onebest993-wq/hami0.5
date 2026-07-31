import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SeizureRequestsTab } from '../SeizureRequestsTab';
import type { SeizureMatrixResult } from '@/app/utils/seizureMatrix';

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

    it('renders the recommended salary seizure request path', () => {
        render(
            <SeizureRequestsTab
                executionId="exec-1"
                executionData={{ id: 'exec-1' } as never}
                remainingBalanceIqd={9000000}
                financialCenterTotalIqd={9000000}
                seizureMatrix={seizureMatrix}
                seizureDetailCompletion={null}
                saveCoerciveAction={vi.fn()}
                persistExecutionMerge={vi.fn()}
                persistGuarantorFollowupDetails={vi.fn()}
                pushTimelineEvent={vi.fn()}
                nextTimelineId={() => 'timeline-1'}
                getLocalTodayYmd={() => '2026-07-11'}
                showToast={vi.fn()}
                activeDebtorIsDeceased={false}
                activeDebtorIsEmployee={true}
                executionCoerciveButtonDisabled={false}
                coerciveUiLocked={false}
                isHistoricalMode={false}
                inlineActionGateKey={null}
                setInlineActionGateKey={vi.fn()}
                handleCoerciveAction={vi.fn()}
                handleGuarantorRequestFromFollowup={vi.fn()}
                requestFollowupSeizureDecision={vi.fn()}
                hideAllGuarantorPresence={true}
                financialGuarantorRequestOnly={false}
                isFinancialDebtCollectionClaim={true}
                settlementBreachTriggeredAt={null}
                ledgerPendingSettlement={null}
                isAlimonyClaim={false}
                claimType=""
            />,
        );

        expect(screen.getByText('طلب حجز راتب')).toBeInTheDocument();
        expect(screen.getByTestId('inline-gate')).toBeInTheDocument();
    });
});
