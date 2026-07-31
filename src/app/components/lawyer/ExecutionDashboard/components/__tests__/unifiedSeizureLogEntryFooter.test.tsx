import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UnifiedSeizureLogEntryFooter } from '../UnifiedSeizureLogEntryFooter';
import type { UnifiedSeizureLogEntry } from '@/app/components/lawyer/execution/UnifiedSeizureLogModal';
import type { UnifiedSeizureLogEntryFooterProps } from '../UnifiedSeizureLogEntryFooter';

vi.mock('../SalarySeizureLogDetailCard', () => ({
    SalarySeizureLogDetailCard: ({ titleLabel }: { titleLabel: string }) => (
        <div data-testid="salary-card">{titleLabel}</div>
    ),
}));

vi.mock('@/app/components/lawyer/execution/ThirdPartySeizureLogCards', () => ({
    ThirdPartySeizureWorkflowCard: () => <div data-testid="third-party-workflow" />,
    ThirdPartySeizureRegistryCard: () => <div data-testid="third-party-registry" />,
}));

vi.mock('../SeizedPropertyWorkflowPanel', () => ({
    SeizedPropertyWorkflowPanel: ({ workflowStatus }: { workflowStatus: string }) => (
        <div data-testid="property-workflow">{workflowStatus}</div>
    ),
}));

describe('UnifiedSeizureLogEntryFooter', () => {
    function buildProps(): Omit<UnifiedSeizureLogEntryFooterProps, 'entry'> {
        return {
            seizedPropertiesForSeizureLog: [
                { id: 'property-1', status: 'auction_scheduled' } as never,
            ],
            seizedMovablesForSeizureLog: [{ id: 'movable-1', decisionRowId: 'decision-1' } as never],
            realEstateSeizureRegistryAssets: [],
            movableSeizureRegistryAssets: [],
            salarySeizureTabRows: [{ id: 'salary-1', status: 'seized', details: {} } as never],
            thirdPartySeizureRegistryAssets: [
                { id: 'third-party-1', thirdPartyName: 'مصرف', status: 'waiting' } as never,
            ],
            thirdPartySeizuresUi: [
                { id: 'tp-ui-1', thirdPartyName: 'مصرف', status: 'notified' } as never,
            ],
            thirdPartyFundsDraftById: {},
            setThirdPartyFundsDraftById: vi.fn(),
            setThirdPartySeizuresUi: vi.fn(),
            decisionsStorageExecutionId: 'exec-1',
            executionId: 'exec-1',
            executionData: { id: 'exec-1' } as never,
            seizureLogExecutorDecisions: [],
            propertyInlineSaveCtx: {} as never,
            decisionsReloadEpoch: 0,
            appealPerspective: 'creditor_agent',
            showToast: vi.fn(),
            focusSeizurePropertyInlineCompletion: vi.fn(),
            focusSeizureMovableInlineCompletion: vi.fn(),
            followupSalarySeizureLabel: 'حجز راتب',
            patchSalarySeizureAssetDetails: vi.fn(),
            releaseSeizureAssetRow: vi.fn(),
            persistExecutionMerge: vi.fn(),
            setTimelineEvents: vi.fn(),
            nextTimelineId: vi.fn(() => 'timeline-1'),
            getLedgerParams: vi.fn(() => null),
            onLedgerRevision: vi.fn(),
            beginThirdPartyReceiveStep: vi.fn(),
            updateThirdPartyReceiveDraft: vi.fn(),
            cancelThirdPartyReceiveStep: vi.fn(),
            confirmThirdPartyReceive: vi.fn(),
        };
    }

    it('renders property workflow panel for property entries with normalized status', () => {
        const entry: UnifiedSeizureLogEntry = {
            id: 'property:property-1',
            entityId: 'property-1',
            title: 'عقار',
            dateYmd: '2026-07-11',
            kind: 'property',
            statusLabel: 'مجدول',
            statusCode: 'auction_scheduled',
            description: '',
        };

        render(<UnifiedSeizureLogEntryFooter entry={entry} {...buildProps()} />);
        expect(screen.getByTestId('property-workflow')).toHaveTextContent('published');
    });

    it('renders salary detail card for salary entries', () => {
        const entry: UnifiedSeizureLogEntry = {
            id: 'salary:salary-1',
            entityId: 'salary-1',
            title: 'راتب',
            dateYmd: '2026-07-11',
            kind: 'salary',
            statusLabel: 'تم الحجز',
            statusCode: 'seized',
            description: '',
        };

        render(<UnifiedSeizureLogEntryFooter entry={entry} {...buildProps()} />);
        expect(screen.getByTestId('salary-card')).toHaveTextContent('حجز راتب');
    });

    it('renders third-party registry card for third-party registry entries', () => {
        const entry: UnifiedSeizureLogEntry = {
            id: 'third_party:third-party-1',
            entityId: 'third-party-1',
            title: 'حجز لدى الغير',
            dateYmd: '2026-07-11',
            kind: 'third_party',
            statusLabel: 'بانتظار الاستلام',
            statusCode: 'waiting',
            description: '',
        };

        render(<UnifiedSeizureLogEntryFooter entry={entry} {...buildProps()} />);
        expect(screen.getByTestId('third-party-registry')).toBeInTheDocument();
    });
});
