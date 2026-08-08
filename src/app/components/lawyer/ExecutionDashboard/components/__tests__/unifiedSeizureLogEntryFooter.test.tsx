import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UnifiedSeizureLogEntryFooter } from '../UnifiedSeizureLogEntryFooter';
import type { UnifiedSeizureLogEntry } from '@/app/components/lawyer/execution/UnifiedSeizureLogModal';
import type { UnifiedSeizureLogEntryFooterProps } from '../UnifiedSeizureLogEntryFooter';
import { dispatchUnifiedSeizureLogFooterAction } from '@/app/components/lawyer/ExecutionDashboard/utils/unifiedSeizureLogFooterNavigation';

vi.mock('@/app/components/lawyer/ExecutionDashboard/utils/unifiedSeizureLogFooterNavigation', () => ({
    dispatchUnifiedSeizureLogFooterAction: vi.fn(),
}));

vi.mock('@/app/components/lawyer/ExecutionDashboard/components/ExecutorDecisionFollowupMirror', () => ({
    ExecutorDecisionFollowupMirror: () => <div data-testid="decision-mirror" />,
}));

vi.mock('../SalarySeizureLogDetailCard', () => ({
    SalarySeizureLogDetailCard: ({
        titleLabel,
        onRelease,
        onSaveDetails,
    }: {
        titleLabel: string;
        onRelease: () => void;
        onSaveDetails: (assetId: string, patch: Record<string, unknown>) => void;
    }) => (
        <div data-testid="salary-card">
            {titleLabel}
            <button
                type="button"
                onClick={() =>
                    onSaveDetails('salary-1', {
                        salaryAmount: '1,000,000',
                        monthlyDeductionIqd: 100000,
                        employerName: 'وزارة',
                    })
                }
            >
                حفظ
            </button>
            <button type="button" onClick={onRelease}>فك الحجز</button>
        </div>
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

vi.mock('../SeizedMovableWorkflowPanel', () => ({
    SeizedMovableWorkflowPanel: () => <div data-testid="movable-workflow" />,
}));

vi.mock('../MovableSeizureInitInlineCard', () => ({
    MovableSeizureInitInlineCard: ({ seizedMovable }: { seizedMovable?: { id?: string } }) => (
        <div data-testid="movable-init">{seizedMovable ? 'workflow' : 'form'}</div>
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
            saveSeizedMovableInitForDecision: vi.fn(),
            movableInlineSaveCtx: {} as never,
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

    it('renders movable init card for movable_decision entries without seized record', () => {
        const props = buildProps();
        props.seizedMovablesForSeizureLog = [];
        const entry: UnifiedSeizureLogEntry = {
            id: 'movable_decision:dec-1',
            entityId: 'dec-1',
            title: 'حجز منقول',
            dateYmd: '2026-07-11',
            kind: 'movable',
            statusLabel: 'موافقة المنفذ',
            statusCode: 'seized',
            description: '',
        };

        render(<UnifiedSeizureLogEntryFooter entry={entry} {...props} />);
        expect(screen.getByTestId('movable-init')).toBeInTheDocument();
    });

    it('renders movable workflow panel when movable_decision entry already has seized record', () => {
        const entry: UnifiedSeizureLogEntry = {
            id: 'movable_decision:decision-1',
            entityId: 'decision-1',
            title: 'حجز منقول',
            dateYmd: '2026-07-11',
            kind: 'movable',
            statusLabel: 'مسجّل في السجل',
            statusCode: 'seized',
            description: '',
        };

        render(<UnifiedSeizureLogEntryFooter entry={entry} {...buildProps()} />);
        expect(screen.getByTestId('movable-init')).toHaveTextContent('workflow');
        expect(screen.queryByTestId('movable-workflow')).not.toBeInTheDocument();
    });

    it('renders guarantor completion button for guarantor_decision entries', () => {
        const entry: UnifiedSeizureLogEntry = {
            id: 'guarantor_decision:dec-g-1',
            entityId: 'dec-g-1',
            title: 'حجز كفيل — أحمد',
            dateYmd: '2026-08-05',
            kind: 'salary',
            statusLabel: 'موافقة المنفذ',
            statusCode: 'pending',
            description: '',
        };

        render(<UnifiedSeizureLogEntryFooter entry={entry} {...buildProps()} />);
        fireEvent.click(screen.getByRole('button', { name: 'إكمال بيانات حجز الكفيل' }));
        expect(dispatchUnifiedSeizureLogFooterAction).toHaveBeenCalledWith({
            executionId: 'exec-1',
            decisionId: 'dec-g-1',
            kind: 'guarantor',
            subject: 'حجز كفيل — أحمد',
            guarantorFocusKind: 'salary',
        });
    });

    it('does not throw when seizure log arrays are undefined', () => {
        const props = buildProps();
        delete (props as { seizedMovablesForSeizureLog?: unknown }).seizedMovablesForSeizureLog;
        delete (props as { seizedPropertiesForSeizureLog?: unknown }).seizedPropertiesForSeizureLog;
        const entry: UnifiedSeizureLogEntry = {
            id: 'movable_decision:dec-1',
            entityId: 'dec-1',
            title: 'حجز منقول',
            dateYmd: '2026-07-11',
            kind: 'movable',
            statusLabel: 'موافقة المنفذ',
            statusCode: 'seized',
            description: '',
        };

        render(<UnifiedSeizureLogEntryFooter entry={entry} {...props} />);
        expect(screen.getByTestId('movable-init')).toBeInTheDocument();
    });

    it('releases salary row via persist fallback when handler is missing', () => {
        const props = buildProps();
        props.releaseSeizureAssetRow = undefined as never;
        props.executionData = {
            id: 'exec-1',
            seizedAssets: [
                { id: 'salary-1', type: '💼 حجز الراتب', status: 'seized', details: {} },
            ],
            timelineEvents: [],
            activeCoerciveActions: ['salary'],
        } as never;
        const persistExecutionMerge = vi.fn(() => true);
        props.persistExecutionMerge = persistExecutionMerge;
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

        render(<UnifiedSeizureLogEntryFooter entry={entry} {...props} />);
        fireEvent.click(screen.getByRole('button', { name: 'فك الحجز' }));
        expect(persistExecutionMerge).toHaveBeenCalled();
        const patch = persistExecutionMerge.mock.calls[0][0] as {
            seizedAssets: Array<{ status: string }>;
            activeCoerciveActions: string[];
        };
        expect(patch.seizedAssets[0].status).toBe('released');
        expect(patch.activeCoerciveActions).toEqual([]);
    });

    it('saves salary details via persist fallback when patch handler is missing', () => {
        const props = buildProps();
        props.patchSalarySeizureAssetDetails = undefined as never;
        props.executionData = {
            id: 'exec-1',
            seizedAssets: [
                { id: 'salary-1', type: '💼 حجز الراتب', status: 'seized', details: {} },
            ],
        } as never;
        const persistExecutionMerge = vi.fn(() => true);
        props.persistExecutionMerge = persistExecutionMerge;
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

        render(<UnifiedSeizureLogEntryFooter entry={entry} {...props} />);
        fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));
        expect(persistExecutionMerge).toHaveBeenCalled();
        const patch = persistExecutionMerge.mock.calls[0][0] as {
            seizedAssets: Array<{ details?: Record<string, string> }>;
        };
        expect(patch.seizedAssets[0].details?.employerName).toBe('وزارة');
    });
});
