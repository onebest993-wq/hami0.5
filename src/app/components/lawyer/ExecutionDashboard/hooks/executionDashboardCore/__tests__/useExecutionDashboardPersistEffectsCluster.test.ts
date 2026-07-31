import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { TimelineEvent } from '@/app/types/execution';
import type { ExecutorApprovalActions } from '@/app/utils/executorApprovalWorkflow';
import { useExecutionDashboardPersistEffectsCluster } from '../useExecutionDashboardPersistEffectsCluster';

const executionFeeToastMock = vi.fn();
const statuteWarningMock = vi.fn();
const fieldVisitListenerMock = vi.fn();
const maritalFurnitureSyncMock = vi.fn();
const timelineDedupeSyncMock = vi.fn();
const seizureRequestCreatedListenerMock = vi.fn();
const guarantorDecisionSyncMock = vi.fn();
const deceasedDebtorResetMock = vi.fn();
const windowEventListenersMock = vi.fn();

vi.mock('../useExecutionDashboardRuntimeSyncEffects', () => ({
    useExecutionDashboardExecutionFeeExemptionToast: (...args: unknown[]) => executionFeeToastMock(...args),
    useExecutionDashboardFieldVisitScheduledListener: (...args: unknown[]) => fieldVisitListenerMock(...args),
    useExecutionDashboardMaritalFurnitureFinancialSync: (...args: unknown[]) => maritalFurnitureSyncMock(...args),
}));

vi.mock('../useExecutionDashboardStatuteWarning', () => ({
    useExecutionDashboardStatuteWarning: (...args: unknown[]) => statuteWarningMock(...args),
}));

vi.mock('../useExecutionDashboardTimelineAndGraceSync', () => ({
    useExecutionDashboardTimelineDedupeSync: (...args: unknown[]) => timelineDedupeSyncMock(...args),
}));

vi.mock('../useExecutionDashboardDecisionAndEventSync', () => ({
    useExecutionDashboardGuarantorDecisionSync: (...args: unknown[]) => guarantorDecisionSyncMock(...args),
    useExecutionDashboardDeceasedDebtorCoerciveReset: (...args: unknown[]) => deceasedDebtorResetMock(...args),
    useExecutionDashboardSeizureRequestCreatedListener: (...args: unknown[]) =>
        seizureRequestCreatedListenerMock(...args),
    useExecutionDashboardWindowEventListeners: (...args: unknown[]) => windowEventListenersMock(...args),
}));

describe('useExecutionDashboardPersistEffectsCluster', () => {
    it('wires persist side-effect hooks through a single cluster boundary', () => {
        const executorApprovalActions: ExecutorApprovalActions = {
            openScheduledDateModal: vi.fn(),
            showToast: vi.fn(),
            appendDossierTask: vi.fn(),
            getFieldVisitDeadlineIso: vi.fn(() => null),
            promptOpenExecutionReport: vi.fn(),
            pushCalendarAppointment: vi.fn(),
            patchDecision: vi.fn(),
            openBreakInventoryFurnitureModal: vi.fn(),
            openJudicialCustodianModal: vi.fn(),
            appendCaseNote: vi.fn(),
            persistJudicialCustodianDetails: vi.fn(),
        };
        renderHook(() =>
            useExecutionDashboardPersistEffectsCluster({
                debtorNotificationDate: null,
                daysSinceNoticeCalculated: 0,
                remaining: 0,
                executionFeeInjected: false,
                showToast: vi.fn(),
                statuteStatus: null,
                showStatuteWarning: false,
                setShowStatuteWarning: vi.fn(),
                isAlimonyClaim: false,
                executionData: null,
                executionId: 'ex-1',
                decisionsStorageExecutionId: 'ex-1',
                executorApprovalActions,
                isMaritalFurnitureClaim: false,
                maritalFurnitureItemsForFollowup: [],
                persistExecutionMerge: vi.fn(),
                timelineEvents: [],
                activeSubFileId: null,
                parentDossierId: null,
                setTimelineEvents: vi.fn(),
                seizureDraftsByDecisionIdRef: { current: {} },
                seizedAssetsSnapshotRef: { current: [] },
                setSeizureDraftsByDecisionId: vi.fn(),
                nextTimelineId: vi.fn(() => 'tl-1'),
                decisionsReloadEpoch: 0,
                activeDebtorIsDeceased: false,
                activeCoerciveActions: [],
                debtorArrested: false,
                investigationPathDebtorPresent: false,
                setActiveCoerciveActions: vi.fn(),
                setDebtorArrested: vi.fn(),
                setInvestigationPathDebtorPresent: vi.fn(),
                setShowDecisionsModal: vi.fn(),
                openExecutionSeizuresTab: vi.fn(),
                pushTimelineEventRef: {
                    current: null as
                        | ((event: TimelineEvent, options?: { mergePatch?: Record<string, unknown> }) => void)
                        | null,
                },
                showDecisionsModal: false,
                showHeirsNotificationModal: false,
                setShowHeirsNotificationModal: vi.fn(),
            }),
        );

        expect(executionFeeToastMock).toHaveBeenCalled();
        expect(statuteWarningMock).toHaveBeenCalled();
        expect(fieldVisitListenerMock).toHaveBeenCalled();
        expect(maritalFurnitureSyncMock).toHaveBeenCalled();
        expect(timelineDedupeSyncMock).toHaveBeenCalled();
        expect(seizureRequestCreatedListenerMock).toHaveBeenCalled();
        expect(guarantorDecisionSyncMock).toHaveBeenCalled();
        expect(deceasedDebtorResetMock).toHaveBeenCalled();
        expect(windowEventListenersMock).toHaveBeenCalled();
    });
});
