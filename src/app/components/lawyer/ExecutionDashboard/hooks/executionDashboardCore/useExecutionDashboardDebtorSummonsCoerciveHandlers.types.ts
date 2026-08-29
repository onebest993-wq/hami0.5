import type { Dispatch, SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import type { EvictionEarnerFeeCollectionSM } from '@/app/utils/evictionEarnerFeeCollectionMachine';

export type ForcedSummoningAnalysis = {
    canForceSummon: boolean;
    lockReasonAr?: string;
};

export type UseExecutionDashboardDebtorSummonsCoerciveHandlersParams = {
    executionData: ExecutionFile | null | undefined;
    unifiedSummonsTargetDebtorKey: string;
    primaryDebtorKeyResolved: string;
    debtorSummonsMarkerLocal: Record<string, unknown> | null;
    summonsPurposeDraft: string;
    forcedSummoningAnalysis: ForcedSummoningAnalysis;
    activeDebtorNameResolved: string;
    activeFollowupDebtorKey: string;
    nextTimelineId: () => string;
    persistExecutionMerge: (patch: Record<string, unknown>) => boolean | void;
    showToast: (message: string, type?: string) => void;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
    setDebtorSummonsMarkerLocal: Dispatch<SetStateAction<Record<string, unknown> | null>>;
    setSummonsMarkerPopoverOpen: (open: boolean) => void;
    setForcedAttendanceIssued: Dispatch<SetStateAction<boolean>>;
    setActiveNoticeState: Dispatch<SetStateAction<string | null>>;
    setForcedPathAttendanceSecured: Dispatch<SetStateAction<boolean>>;
    setDebtorForcedToAttend: Dispatch<SetStateAction<boolean>>;
    setInvestigationCourtRequested: Dispatch<SetStateAction<boolean>>;
    setInvestigationPathDebtorPresent: Dispatch<SetStateAction<boolean>>;
    setInvestigationMemoIssued: Dispatch<SetStateAction<boolean>>;
    setArrestWarrantUnlocked: Dispatch<SetStateAction<boolean>>;
    setDebtorEvaded: Dispatch<SetStateAction<boolean>>;
    setDebtorArrested: Dispatch<SetStateAction<boolean>>;
    setEarnerFeeCollectionSm: Dispatch<SetStateAction<EvictionEarnerFeeCollectionSM>>;
};
