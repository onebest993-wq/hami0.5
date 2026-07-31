import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CoerciveSeizureToolsSection } from '../CoerciveSeizureToolsSection';

vi.mock('@/app/components/ui/SmartDialog', () => ({
    SmartDialog: {
        confirm: vi.fn(async () => false),
    },
}));

vi.mock('../InlineActionGate', () => ({
    InlineActionGate: () => <div data-testid="inline-gate" />,
}));

vi.mock('@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion', () => ({
    ExecutionInlineAccordion: () => <div data-testid="inline-accordion" />,
}));

vi.mock('@/app/utils/executorSeizureDecisionQueue', () => ({
    appendPendingExecutorSeizureDecision: vi.fn(() => 'decision-1'),
    closeSeizureSubtypeDecisionCycle: vi.fn(),
    dispatchDecisionsReload: vi.fn(),
    getGoverningSeizureDecisionBySubtype: vi.fn(() => null),
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

vi.mock('@/app/utils/executorRequestAppealSync', () => ({
    isExecutorRowApprovedWorkflowActive: vi.fn(() => false),
}));

function renderSection(
    overrides: Partial<React.ComponentProps<typeof CoerciveSeizureToolsSection>> = {},
) {
    return render(
        <CoerciveSeizureToolsSection
            isEvictionExecutionModule={false}
            activeDebtorIsEmployee={false}
            activeDebtorIsDeceased={false}
            executionCoerciveButtonDisabled={false}
            coerciveUiLocked={false}
            isHistoricalMode={false}
            executionId="exec-1"
            executionData={{ id: 'exec-1' } as never}
            followupSalarySeizureLabel="طلب حجز راتب (١/٥)"
            followupEmployeeFinancialSalaryOnlyCoercive={false}
            followupMonetaryCoerciveLimitedOnly={false}
            hideCoerciveSeizureSalaryAndProperty={false}
            inlineActionGateKey={null}
            setInlineActionGateKey={vi.fn()}
            saveCoerciveAction={vi.fn()}
            pushTimelineEvent={vi.fn()}
            nextTimelineId={() => 'timeline-1'}
            showToast={vi.fn()}
            {...overrides}
        />,
    );
}

describe('CoerciveSeizureToolsSection', () => {
    it('renders the developed property and movable request blocks (no salary for non-employee)', () => {
        renderSection();

        expect(screen.getByRole('button', { name: 'طلب حجز عقار' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'طلب حجز مال منقول' })).toBeTruthy();
        expect(screen.queryByText('طلب حجز راتب (١/٥)')).toBeNull();
    });

    it('renders the salary block alongside assets for employee financial followup', () => {
        renderSection({
            activeDebtorIsEmployee: true,
            followupEmployeeFinancialSalaryOnlyCoercive: true,
        });

        expect(screen.getByText('طلب حجز راتب (١/٥)')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'طلب حجز عقار' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'طلب حجز مال منقول' })).toBeTruthy();
    });

    it('renders nothing when specialization hides seizure tools', () => {
        const { container } = renderSection({
            activeDebtorIsEmployee: true,
            followupEmployeeFinancialSalaryOnlyCoercive: true,
            hideCoerciveSeizureSalaryAndProperty: true,
        });

        expect(container.firstChild).toBeNull();
    });

    it('renders nothing for eviction module (field procedures panel owns that flow)', () => {
        const { container } = renderSection({ isEvictionExecutionModule: true });

        expect(container.firstChild).toBeNull();
    });
});
