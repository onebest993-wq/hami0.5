import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import { asUnknownRecord } from '@/app/utils/asUnknownRecord';
import type { HandlerClusterContextSpreads } from './handlerClusterContextShared';

type UnknownBag = object | undefined;

type FollowupOtherPartyHandlerClusterSource = HandlerClusterContextSpreads;

export type FollowupOtherPartyHandlerClusterInput = {
    executionDataRef: MutableRefObject<ExecutionFile | null | undefined>;
    executionId: string | undefined;
    parentDossierId: string | undefined;
    delegationParentFileId?: string | null | undefined;
    activeSubFileId?: string | null | undefined;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
    pushTimelineEventRef?: MutableRefObject<unknown>;
    executionData: ExecutionFile | null | undefined;
    decisionsStorageExecutionId: string | undefined;
    isRepresentingDebtor: boolean;
    openDecisionsModalWithBoot: (boot?: {
        tab?: 'current' | 'previous' | 'appeals';
        decisionId?: string | null;
    }) => void;
    timelineEvents: TimelineEvent[];
    nextTimelineId: () => string;
    showToast: (message: string, type?: string, opts?: Record<string, unknown>) => void;
};

function readBagValue<T>(bags: ReadonlyArray<UnknownBag>, key: string): T {
    for (const bag of bags) {
        if (bag && key in bag) {
            return asUnknownRecord(bag)[key] as T;
        }
    }

    return undefined as T;
}

export function pickFollowupOtherPartyHandlerClusterInput(
    source: FollowupOtherPartyHandlerClusterSource,
): FollowupOtherPartyHandlerClusterInput {
    const bags: ReadonlyArray<UnknownBag> = [
        source.core,
        source.followupOrchestrator,
        source.seizureOrchestrator,
        source.coercionOrchestrator,
        source.dossierLifecyclePanel,
        source.claimFinancials,
        source.graceAndSummoning,
        source.debtorWorkspaceContext,
        source.subsequentNoticeFlow,
        source.followupTabAssembly,
        source.followupSeizureTabs,
        source.decisionsOrchestrator,
    ];

    return {
        executionDataRef: readBagValue<FollowupOtherPartyHandlerClusterInput['executionDataRef']>(
            bags,
            'executionDataRef',
        ),
        executionId: readBagValue<FollowupOtherPartyHandlerClusterInput['executionId']>(
            bags,
            'executionId',
        ),
        parentDossierId: readBagValue<FollowupOtherPartyHandlerClusterInput['parentDossierId']>(
            bags,
            'parentDossierId',
        ),
        delegationParentFileId: readBagValue<
            FollowupOtherPartyHandlerClusterInput['delegationParentFileId']
        >(bags, 'delegationParentFileId'),
        activeSubFileId: readBagValue<FollowupOtherPartyHandlerClusterInput['activeSubFileId']>(
            bags,
            'activeSubFileId',
        ),
        persistExecutionMerge: readBagValue<
            FollowupOtherPartyHandlerClusterInput['persistExecutionMerge']
        >(bags, 'persistExecutionMerge'),
        setTimelineEvents: readBagValue<FollowupOtherPartyHandlerClusterInput['setTimelineEvents']>(
            bags,
            'setTimelineEvents',
        ),
        pushTimelineEventRef: readBagValue<
            FollowupOtherPartyHandlerClusterInput['pushTimelineEventRef']
        >(bags, 'pushTimelineEventRef'),
        executionData: readBagValue<FollowupOtherPartyHandlerClusterInput['executionData']>(
            bags,
            'executionData',
        ),
        decisionsStorageExecutionId: readBagValue<
            FollowupOtherPartyHandlerClusterInput['decisionsStorageExecutionId']
        >(bags, 'decisionsStorageExecutionId'),
        isRepresentingDebtor: readBagValue<
            FollowupOtherPartyHandlerClusterInput['isRepresentingDebtor']
        >(bags, 'isRepresentingDebtor'),
        openDecisionsModalWithBoot: readBagValue<
            FollowupOtherPartyHandlerClusterInput['openDecisionsModalWithBoot']
        >(bags, 'openDecisionsModalWithBoot'),
        timelineEvents: readBagValue<FollowupOtherPartyHandlerClusterInput['timelineEvents']>(
            bags,
            'timelineEvents',
        ),
        nextTimelineId: readBagValue<FollowupOtherPartyHandlerClusterInput['nextTimelineId']>(
            bags,
            'nextTimelineId',
        ),
        showToast: readBagValue<FollowupOtherPartyHandlerClusterInput['showToast']>(
            bags,
            'showToast',
        ),
    };
}
