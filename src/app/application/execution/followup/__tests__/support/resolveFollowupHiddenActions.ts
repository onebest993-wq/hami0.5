import type { ExecutionFile } from '@/app/types/execution';
import type {
    HiddenFollowupVisibilityInput,
    HiddenGuarantorContext,
    HiddenGuarantorRequestKey,
    HiddenPersonalCoerciveRequestKey,
} from '@/app/components/lawyer/ExecutionDashboard/components/hiddenFollowupRequestsUtils';
import {
    hasAnyHiddenFollowupContent,
    listHiddenGuarantorCatalog,
    listHiddenPersonalCoerciveCatalog,
    shouldAlwaysShowHiddenRequestsToggle,
    shouldShowGuarantorRequestInSeizureTab,
    shouldShowHiddenBreakInventoryRequest,
} from '@/app/components/lawyer/ExecutionDashboard/components/hiddenFollowupRequestsUtils';
import {
    isCustodyRemovalClaim,
    isPersonalStatusCourtDecisionsDossier,
} from '@/app/utils/followupSpecializationVisibility';
import { shouldShowEarnerExecutiveDetentionFromFinancialCenter } from '@/app/utils/earnerPersonalCoerciveFinancialGate';
import {
    registryIdForHiddenGuarantorKey,
    registryIdForHiddenPersonalKey,
    type FollowupRegistryActionId,
} from './followupActionRegistry';
import {
    resolveFollowupScenario,
    type FollowupScenarioInput,
    type FollowupScenarioResult,
} from './followupScenarioResolver';

export type FollowupHiddenActionContext = {
    settlementBreachTriggeredAt?: string | null;
    ledgerPendingSettlement?: unknown;
    /** محاكاة كفيل ضامن نشط في بيانات التنفيذ */
    guarantorFollowupActive?: boolean;
};

export type ResolveFollowupHiddenActionsInput = FollowupScenarioInput & FollowupHiddenActionContext;

export type FollowupHiddenActionSnapshot = {
    hiddenToggleVisible: boolean;
    hiddenPersonalCoerciveKeys: HiddenPersonalCoerciveRequestKey[];
    hiddenGuarantorKeys: HiddenGuarantorRequestKey[];
    breakInventoryVisible: boolean;
    hasAnyHiddenContent: boolean;
    registryActionIds: FollowupRegistryActionId[];
};

function financialCenterIqd(input: ResolveFollowupHiddenActionsInput): number {
    return Math.max(0, Math.round(Number(input.financialCenterTotalIqd) || 0));
}

function buildGuarantorExecutionStub(active: boolean): ExecutionFile | null {
    if (!active) return null;
    return {
        guarantor_followup: { executor_approved: true, details_saved: true },
    } as ExecutionFile;
}

/** يعكس بناء flags في ExecutionFollowupModalLatePanels */
export function buildFollowupHiddenVisibilityFlags(
    scenario: FollowupScenarioResult,
    input: ResolveFollowupHiddenActionsInput,
): HiddenFollowupVisibilityInput {
    const flags = scenario.flagsWithEarnerGate;
    const financialCenter = financialCenterIqd(input);
    const hideExecutiveDetentionJudgeCard = !shouldShowEarnerExecutiveDetentionFromFinancialCenter({
        isEmployee: input.isEmployee,
        financialCenterTotalIqd: financialCenter,
    });

    const isPersonalStatusExecutionClaim = isPersonalStatusCourtDecisionsDossier(
        input.docType,
        input.classification,
        input.category,
        input.debtorEntityKind ?? 'natural_person',
    );

    const visibilityFlags: HiddenFollowupVisibilityInput = {
        ...flags,
        showPersonalCoerciveFollowupTab: scenario.modalShowPersonalCoerciveFollowupTab,
        showGuarantorInSeizureTab: false,
        isPersonalStatusExecutionClaim,
        isAlimonyClaim: String(input.claimType ?? '').includes('نفقة'),
        activeDebtorIsEmployee: input.isEmployee,
        isCustodyRemovalClaim: isCustodyRemovalClaim(input.claimType),
        personalTabLockedForEmployee: scenario.personalTabLockedForEmployee,
        showHiddenExecutiveDossierPresentation:
            !hideExecutiveDetentionJudgeCard && !input.isEmployee && financialCenter > 0,
    };

    const guarantorCtx = buildFollowupGuarantorContext(input);
    visibilityFlags.showGuarantorInSeizureTab = shouldShowGuarantorRequestInSeizureTab(
        visibilityFlags,
        guarantorCtx,
    );

    return visibilityFlags;
}

export function buildFollowupGuarantorContext(
    input: ResolveFollowupHiddenActionsInput,
): HiddenGuarantorContext {
    return {
        executionData: buildGuarantorExecutionStub(Boolean(input.guarantorFollowupActive)),
        settlementBreachTriggeredAt: input.settlementBreachTriggeredAt ?? null,
        ledgerPendingSettlement: input.ledgerPendingSettlement ?? null,
        financialCenterTotalIqd: financialCenterIqd(input),
        activeDebtorIsDeceased: Boolean(input.activeDebtorIsDeceased),
        activeDebtorIsEmployee: input.isEmployee,
    };
}

export function resolveFollowupHiddenActions(
    input: ResolveFollowupHiddenActionsInput,
): FollowupHiddenActionSnapshot {
    const scenario = resolveFollowupScenario(input);
    const visibilityFlags = buildFollowupHiddenVisibilityFlags(scenario, input);
    const guarantorCtx = buildFollowupGuarantorContext(input);

    const hiddenToggleVisible = shouldAlwaysShowHiddenRequestsToggle({
        activeDebtorIsDeceased: input.activeDebtorIsDeceased,
    });

    const rawPersonalKeys = listHiddenPersonalCoerciveCatalog(visibilityFlags).map((item) => item.key);
    const rawGuarantorKeys = listHiddenGuarantorCatalog(visibilityFlags, guarantorCtx).map(
        (item) => item.key,
    );
    const rawBreakInventory = shouldShowHiddenBreakInventoryRequest(visibilityFlags);
    const rawHasHidden = hasAnyHiddenFollowupContent(visibilityFlags, guarantorCtx);

    const hiddenPersonalCoerciveKeys = hiddenToggleVisible ? rawPersonalKeys : [];
    const hiddenGuarantorKeys = hiddenToggleVisible ? rawGuarantorKeys : [];
    const breakInventoryVisible = hiddenToggleVisible && rawBreakInventory;
    const hasAnyHiddenContent = hiddenToggleVisible && rawHasHidden;

    const registryActionIds: FollowupRegistryActionId[] = [];
    if (hiddenToggleVisible) {
        registryActionIds.push('hidden:toggle');
        if (breakInventoryVisible) registryActionIds.push('hidden:break_inventory');
        for (const key of hiddenPersonalCoerciveKeys) {
            registryActionIds.push(registryIdForHiddenPersonalKey(key));
        }
        for (const key of hiddenGuarantorKeys) {
            registryActionIds.push(registryIdForHiddenGuarantorKey(key));
        }
    }

    return {
        hiddenToggleVisible,
        hiddenPersonalCoerciveKeys,
        hiddenGuarantorKeys,
        breakInventoryVisible,
        hasAnyHiddenContent: hiddenToggleVisible && rawHasHidden,
        registryActionIds,
    };
}
