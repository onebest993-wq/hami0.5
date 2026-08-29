import type { MutableRefObject } from 'react';
import type { ExecutionFile, SeizedAsset, TimelineEvent } from '@/app/types/execution';

export type CoerciveActionDetails = Record<string, string> & {
    decisionRowId?: string;
    monthlyDeductionIqd?: string;
};

export type SeizedAssetDetailsBag = Record<string, unknown>;

export function readAssetDetailsBag(asset: SeizedAsset | undefined): SeizedAssetDetailsBag {
    if (!asset) return {};
    return typeof asset.details === 'object' && asset.details && !Array.isArray(asset.details)
        ? (asset.details as SeizedAssetDetailsBag)
        : {};
}

export type CoerciveSubjectRef = MutableRefObject<{ id?: string; name?: string }>;

export type SaveCoerciveActionDeps = {
    setShowCoerciveActionForm: (v: string | null) => void;
    settlementGuarantorGate: { pendingSettlement?: boolean };
    clearSettlementFromLedger: () => void;
    seizureDetailCompletion: {
        actionType: string;
        decisionRowId: string;
        assetId?: string;
    } | null;
    setSeizureDetailCompletion: (v: null) => void;
    seizedAssets: SeizedAsset[];
    setSeizedAssets: (assets: SeizedAsset[]) => void;
    activeDebtorIsDeceased: boolean;
    executionData: ExecutionFile | null | undefined;
    executionId: string | undefined;
    decisionsStorageExecutionId: string | undefined;
    executionDataRef: MutableRefObject<ExecutionFile | null | undefined>;
    activeWorkspaceDebtorForFollowup: { isPrimary?: boolean; key?: string } | null | undefined;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    nextTimelineId: () => string;
    timelineEvents: TimelineEvent[];
    setTimelineEvents: (events: TimelineEvent[]) => void;
    seizureDraftsByDecisionId: Record<string, SeizedAsset>;
    setSeizureDraftsByDecisionId: (drafts: Record<string, SeizedAsset>) => void;
    seizureDraftsByDecisionIdRef: MutableRefObject<Record<string, SeizedAsset>>;
    coerciveSubjectRef: CoerciveSubjectRef;
    showToast: (
        message: string,
        type?: string,
        opts?: { decisionsLink?: boolean },
    ) => void;
    setLastActionDate: (ymd: string) => void;
};

export function applySalaryGarnishmentPersistPatch(
    persistPatch: Record<string, unknown>,
    details: CoerciveActionDetails,
    actionType: string,
    deps: Pick<SaveCoerciveActionDeps, 'activeWorkspaceDebtorForFollowup' | 'executionData'>,
): void {
    if (actionType !== 'salary' || !/\S/.test(String(details.salaryAmount || '').trim())) return;
    const parsedSalary = Number(String(details.salaryAmount || '').replace(/,/g, '').trim());
    if (!(Number.isFinite(parsedSalary) && parsedSalary > 0)) return;
    const garnishment = parsedSalary / 5;
    const { activeWorkspaceDebtorForFollowup, executionData } = deps;
    if (activeWorkspaceDebtorForFollowup?.isPrimary) {
        persistPatch.employeeSalary = parsedSalary;
        persistPatch.garnishmentAmount = garnishment;
    } else if (activeWorkspaceDebtorForFollowup?.key) {
        const debtorKey = String(activeWorkspaceDebtorForFollowup.key);
        persistPatch.perDebtorSalaries = {
            ...(executionData?.perDebtorSalaries || {}),
            [debtorKey]: String(parsedSalary),
        };
        persistPatch.perDebtorGarnishments = {
            ...(executionData?.perDebtorGarnishments || {}),
            [debtorKey]: String(garnishment),
        };
    }
}
