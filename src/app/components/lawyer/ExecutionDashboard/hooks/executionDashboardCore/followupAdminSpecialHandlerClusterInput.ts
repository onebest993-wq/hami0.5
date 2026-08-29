import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import { asUnknownRecord } from '@/app/utils/asUnknownRecord';
import type { HandlerClusterContextSpreads } from './handlerClusterContextShared';

type UnknownBag = object | undefined;

type FollowupAdminSpecialHandlerClusterSource = HandlerClusterContextSpreads;

export type FollowupAdminSpecialHandlerClusterInput = {
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
    specialRequestDate: string;
    specialRequestManualTitle: string;
    specialRequestContent: string;
    nextTimelineId: () => string;
    showToast: (message: string, type?: string, opts?: Record<string, unknown>) => void;
    setSpecialRequestTemplatePick: Dispatch<SetStateAction<string>>;
    setSpecialRequestContent: Dispatch<SetStateAction<string>>;
    setSpecialRequestManualTitle: Dispatch<SetStateAction<string>>;
    setSpecialRequestDate: Dispatch<SetStateAction<string>>;
};

function readBagValue<T>(bags: ReadonlyArray<UnknownBag>, key: string): T {
    for (const bag of bags) {
        if (bag && key in bag) {
            return asUnknownRecord(bag)[key] as T;
        }
    }

    return undefined as T;
}

export function pickFollowupAdminSpecialHandlerClusterInput(
    source: FollowupAdminSpecialHandlerClusterSource,
): FollowupAdminSpecialHandlerClusterInput {
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
        executionDataRef: readBagValue<FollowupAdminSpecialHandlerClusterInput['executionDataRef']>(
            bags,
            'executionDataRef',
        ),
        executionId: readBagValue<FollowupAdminSpecialHandlerClusterInput['executionId']>(
            bags,
            'executionId',
        ),
        parentDossierId: readBagValue<FollowupAdminSpecialHandlerClusterInput['parentDossierId']>(
            bags,
            'parentDossierId',
        ),
        delegationParentFileId: readBagValue<
            FollowupAdminSpecialHandlerClusterInput['delegationParentFileId']
        >(bags, 'delegationParentFileId'),
        activeSubFileId: readBagValue<FollowupAdminSpecialHandlerClusterInput['activeSubFileId']>(
            bags,
            'activeSubFileId',
        ),
        persistExecutionMerge: readBagValue<
            FollowupAdminSpecialHandlerClusterInput['persistExecutionMerge']
        >(bags, 'persistExecutionMerge'),
        setTimelineEvents: readBagValue<FollowupAdminSpecialHandlerClusterInput['setTimelineEvents']>(
            bags,
            'setTimelineEvents',
        ),
        pushTimelineEventRef: readBagValue<
            FollowupAdminSpecialHandlerClusterInput['pushTimelineEventRef']
        >(bags, 'pushTimelineEventRef'),
        executionData: readBagValue<FollowupAdminSpecialHandlerClusterInput['executionData']>(
            bags,
            'executionData',
        ),
        decisionsStorageExecutionId: readBagValue<
            FollowupAdminSpecialHandlerClusterInput['decisionsStorageExecutionId']
        >(bags, 'decisionsStorageExecutionId'),
        specialRequestDate: readBagValue<FollowupAdminSpecialHandlerClusterInput['specialRequestDate']>(
            bags,
            'specialRequestDate',
        ),
        specialRequestManualTitle: readBagValue<
            FollowupAdminSpecialHandlerClusterInput['specialRequestManualTitle']
        >(bags, 'specialRequestManualTitle'),
        specialRequestContent: readBagValue<
            FollowupAdminSpecialHandlerClusterInput['specialRequestContent']
        >(bags, 'specialRequestContent'),
        nextTimelineId: readBagValue<FollowupAdminSpecialHandlerClusterInput['nextTimelineId']>(
            bags,
            'nextTimelineId',
        ),
        showToast: readBagValue<FollowupAdminSpecialHandlerClusterInput['showToast']>(
            bags,
            'showToast',
        ),
        setSpecialRequestTemplatePick: readBagValue<
            FollowupAdminSpecialHandlerClusterInput['setSpecialRequestTemplatePick']
        >(bags, 'setSpecialRequestTemplatePick'),
        setSpecialRequestContent: readBagValue<
            FollowupAdminSpecialHandlerClusterInput['setSpecialRequestContent']
        >(bags, 'setSpecialRequestContent'),
        setSpecialRequestManualTitle: readBagValue<
            FollowupAdminSpecialHandlerClusterInput['setSpecialRequestManualTitle']
        >(bags, 'setSpecialRequestManualTitle'),
        setSpecialRequestDate: readBagValue<
            FollowupAdminSpecialHandlerClusterInput['setSpecialRequestDate']
        >(bags, 'setSpecialRequestDate'),
    };
}
