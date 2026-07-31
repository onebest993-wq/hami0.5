import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UnifiedSeizureLogHost } from '../UnifiedSeizureLogHost';

vi.mock('@/app/components/lawyer/execution/UnifiedSeizureLogModal', () => ({
    UnifiedSeizureLogModal: (props: {
        open: boolean;
        counts: Record<string, number>;
        entries: Array<{ id: string }>;
        renderEntryFooter: (entry: { id: string }) => React.ReactNode;
    }) => (
        <div>
            <div data-testid="modal-open">{String(props.open)}</div>
            <div data-testid="property-count">{props.counts.property}</div>
            <div data-testid="entry-count">{props.entries.length}</div>
            {props.entries[0] ? props.renderEntryFooter(props.entries[0]) : null}
        </div>
    ),
}));

vi.mock('../UnifiedSeizureLogEntryFooter', () => ({
    UnifiedSeizureLogEntryFooter: ({ entry }: { entry: { id: string } }) => (
        <div data-testid="footer-entry">{entry.id}</div>
    ),
}));

describe('UnifiedSeizureLogHost', () => {
    const footer = {
        seizedPropertiesForSeizureLog: [],
        seizedMovablesForSeizureLog: [],
        realEstateSeizureRegistryAssets: [],
        movableSeizureRegistryAssets: [],
        salarySeizureTabRows: [],
        thirdPartySeizureRegistryAssets: [],
        thirdPartySeizuresUi: [],
        thirdPartyFundsDraftById: {},
        setThirdPartyFundsDraftById: vi.fn(),
        setThirdPartySeizuresUi: vi.fn(),
        decisionsStorageExecutionId: 'exec-1',
        executionId: 'exec-1',
        executionData: null,
        seizureLogExecutorDecisions: [],
        propertyInlineSaveCtx: {} as never,
        decisionsReloadEpoch: 0,
        appealPerspective: 'creditor_agent' as const,
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

    it('opens modal only when content exists and user is not representing debtor', () => {
        render(
            <UnifiedSeizureLogHost
                isRepresentingDebtor={false}
                showModal
                hasContent
                activeTab="property"
                onTabChange={vi.fn()}
                counts={{ property: 2, salary: 0, movable: 0, third_party: 0 }}
                entries={[
                    {
                        id: 'property:1',
                        kind: 'property',
                        dateYmd: '2026-07-11',
                        title: 'عقار',
                        statusLabel: 'مجدول',
                        statusCode: 'scheduled',
                        description: '',
                    },
                ]}
                onClose={vi.fn()}
                footer={footer}
            />,
        );

        expect(screen.getByTestId('modal-open')).toHaveTextContent('true');
        expect(screen.getByTestId('property-count')).toHaveTextContent('2');
        expect(screen.getByTestId('entry-count')).toHaveTextContent('1');
        expect(screen.getByTestId('footer-entry')).toHaveTextContent('property:1');
    });

    it('sanitizes invalid counts and closes modal for debtor representation', () => {
        render(
            <UnifiedSeizureLogHost
                isRepresentingDebtor
                showModal
                hasContent
                activeTab="property"
                onTabChange={vi.fn()}
                counts={{ property: Number.NaN, salary: 0, movable: 0, third_party: 0 }}
                entries={[]}
                onClose={vi.fn()}
                footer={footer}
            />,
        );

        expect(screen.getByTestId('modal-open')).toHaveTextContent('false');
        expect(screen.getByTestId('property-count')).toHaveTextContent('0');
    });
});
