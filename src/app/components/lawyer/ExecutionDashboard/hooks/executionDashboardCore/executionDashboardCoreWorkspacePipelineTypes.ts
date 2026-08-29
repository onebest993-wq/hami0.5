import type { useExecutionDashboardCoreWorkspacePipeline } from './useExecutionDashboardCoreWorkspacePipeline';

export type ExecutionDashboardCoreWorkspacePipelineValue = ReturnType<
    typeof useExecutionDashboardCoreWorkspacePipeline
>;

/** حقول تُمرَّر مع خط الأنابيب من مراحل لاحقة (متابعة/مدين) وليست على قيمة الـ hook وحدها. */
export type ExecutionDashboardCoreWorkspacePipelineChainBag = ExecutionDashboardCoreWorkspacePipelineValue & {
    setPaidDebt?: (value: number | ((prev: number) => number)) => void;
    setShowNotesModal?: (show: boolean) => void;
    debtorBrowserTabsMode?: boolean;
    effectiveFollowupDebtorEntry?: unknown;
    activeWorkspaceDebtorForFollowup?: unknown;
    activeTimelineEventsDebtorScoped?: unknown;
    monetaryStrictForSummoningEngine?: unknown;
    isRepresentingDebtor?: boolean;
    effectiveDebtors?: unknown;
    clearThirdPartyFundsDraft?: unknown;
};
