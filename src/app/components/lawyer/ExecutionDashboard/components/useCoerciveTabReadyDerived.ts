import { useCallback, useMemo } from 'react';
import {
    computeShowEmptyCoerciveHint,
    computeShowNonEvictionProcedureBlock,
} from './coerciveTabVisibility';
import {
    getExecutionModuleStrategy,
    isEncroachmentRemovalClaim,
    type EvictionTimelineActionId,
} from '@/app/utils/executionModuleStrategies';
import type { TimelineEvent } from '@/app/types/execution';
import type { CoerciveTabProps } from './CoerciveTab.types';

type DerivedInput = Pick<
    CoerciveTabProps,
    | 'claimType'
    | 'isEvictionExecutionModule'
    | 'saveCoerciveAction'
    | 'pushTimelineEvent'
    | 'nextTimelineId'
    | 'showEncroachmentRemovalRequestCards'
    | 'decisionsStorageExecutionId'
    | 'executionData'
    | 'isSpecificDeliveryModule'
    | 'showSpecificDeliveryFieldProcedures'
    | 'specificDeliveryFinancialized'
    | 'isMaritalFurnitureClaim'
    | 'hideCoerciveSeizureSalaryAndProperty'
    | 'hideFollowupCoerciveTab'
    | 'gracePeriodEnded'
    | 'coerciveUiLocked'
    | 'hideCoerciveGraceNoticeBanner'
    | 'executionStatus'
    | 'debtorAttendedVoluntarily'
    | 'lawyerStartedPostNoticeExecution'
    | 'followupEmployeeFinancialSalaryOnlyCoercive'
    | 'hideCoerciveFinancialBanners'
>;

export function useCoerciveTabReadyDerived(p: DerivedInput) {
    const encroachmentClaimActive = isEncroachmentRemovalClaim(p.claimType);
    const effectiveEvictionModule =
        p.isEvictionExecutionModule ||
        getExecutionModuleStrategy(p.claimType).useEvictionFieldProcedures;
    const seizureToolsReady =
        typeof p.saveCoerciveAction === 'function' &&
        typeof p.pushTimelineEvent === 'function' &&
        typeof p.nextTimelineId === 'function';

    const recordEvictionTimelineAction = useCallback(
        (input: {
            actionId: EvictionTimelineActionId;
            title: string;
            description: string;
        }) => {
            if (!p.pushTimelineEvent || !p.nextTimelineId) return;
            const now = new Date().toISOString();
            const evictionTimelineEvent: TimelineEvent = {
                id: p.nextTimelineId(),
                type: 'eviction',
                date: now.slice(0, 10),
                timestamp: now,
                title: input.title,
                description: input.description,
                source: 'الإجراءات الميدانية — تخلية',
                metadata: { evictionActionId: input.actionId },
            };
            p.pushTimelineEvent(evictionTimelineEvent);
        },
        [p.pushTimelineEvent, p.nextTimelineId],
    );

    const showEncroachmentCards =
        p.showEncroachmentRemovalRequestCards || encroachmentClaimActive;
    const encroachmentExecutionId = String(
        p.decisionsStorageExecutionId || p.executionData?.id || '',
    ).trim();

    const needsSpecificDeliveryNatureSetup =
        p.isSpecificDeliveryModule &&
        !p.showSpecificDeliveryFieldProcedures &&
        !p.specificDeliveryFinancialized;

    const showSpecificDeliveryProceduresBlock =
        p.showSpecificDeliveryFieldProcedures ||
        (p.isSpecificDeliveryModule && !p.specificDeliveryFinancialized);

    const showNonEvictionProcedureBlock = useMemo(
        () =>
            computeShowNonEvictionProcedureBlock({
                effectiveEvictionModule,
                showEncroachmentCards,
                encroachmentExecutionId,
                showSpecificDeliveryProceduresBlock,
                isMaritalFurnitureClaim: p.isMaritalFurnitureClaim,
            }),
        [
            effectiveEvictionModule,
            showEncroachmentCards,
            encroachmentExecutionId,
            showSpecificDeliveryProceduresBlock,
            p.isMaritalFurnitureClaim,
        ],
    );

    const showEmptyCoerciveHint = useMemo(
        () =>
            computeShowEmptyCoerciveHint({
                effectiveEvictionModule,
                seizureToolsReady,
                hideCoerciveSeizureSalaryAndProperty: p.hideCoerciveSeizureSalaryAndProperty,
                hideFollowupCoerciveTab: p.hideFollowupCoerciveTab,
                showNonEvictionProcedureBlock,
                gracePeriodEnded: p.gracePeriodEnded,
                coerciveUiLocked: p.coerciveUiLocked,
                hideCoerciveGraceNoticeBanner: p.hideCoerciveGraceNoticeBanner,
                executionStatus: p.executionStatus,
                debtorAttendedVoluntarily: p.debtorAttendedVoluntarily,
                lawyerStartedPostNoticeExecution: p.lawyerStartedPostNoticeExecution,
                followupEmployeeFinancialSalaryOnlyCoercive:
                    p.followupEmployeeFinancialSalaryOnlyCoercive,
                hideCoerciveFinancialBanners: p.hideCoerciveFinancialBanners,
                isSpecificDeliveryModule: p.isSpecificDeliveryModule,
                showSpecificDeliveryFieldProcedures: p.showSpecificDeliveryFieldProcedures,
                specificDeliveryFinancialized: p.specificDeliveryFinancialized,
            }),
        [
            effectiveEvictionModule,
            seizureToolsReady,
            p.hideCoerciveSeizureSalaryAndProperty,
            p.hideFollowupCoerciveTab,
            showNonEvictionProcedureBlock,
            p.gracePeriodEnded,
            p.coerciveUiLocked,
            p.hideCoerciveGraceNoticeBanner,
            p.executionStatus,
            p.debtorAttendedVoluntarily,
            p.lawyerStartedPostNoticeExecution,
            p.followupEmployeeFinancialSalaryOnlyCoercive,
            p.hideCoerciveFinancialBanners,
            p.isSpecificDeliveryModule,
            p.showSpecificDeliveryFieldProcedures,
            p.specificDeliveryFinancialized,
        ],
    );

    return {
        effectiveEvictionModule,
        seizureToolsReady,
        recordEvictionTimelineAction,
        showEncroachmentCards,
        encroachmentExecutionId,
        needsSpecificDeliveryNatureSetup,
        showSpecificDeliveryProceduresBlock,
        showNonEvictionProcedureBlock,
        showEmptyCoerciveHint,
    };
}
