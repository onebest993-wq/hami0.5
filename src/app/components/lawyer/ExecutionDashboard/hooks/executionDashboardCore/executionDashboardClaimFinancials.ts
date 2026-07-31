import {
    buildExecutionClaimBreakdown,
    getEffectiveClaimTypes,
    hasOngoingAlimonyInExecution,
    resolveUnifiedVesselPrincipalAmount,
} from '@/app/components/lawyer/ExecutionCreationView/hooks/executionFormUtils';
import {
    resolveLiabilityGroupLawyerFees,
    resolveLiabilityGroupPrincipal,
    type DebtorLiabilityGroup,
} from '@/app/utils/debtorLiabilityGroups';
import {
    getExecutionModuleStrategy,
    hasEvictionTimelineAction,
    isEncroachmentRemovalClaim,
    isEvictionClaim,
    isSpecificDeliveryClaim,
    EVICTION_TIMELINE_ACTION_IDS,
} from '@/app/utils/executionModuleStrategies';
import {
    isMaritalFurnitureExecutionClaim,
    isNonFinancialExecutionClaim,
    isVisitationExecutionClaim,
    resolvePrimaryExecutionClaimType,
} from '@/app/utils/executionClaimIsolation';
import { resolveMaritalFurnitureFinancialPrincipal } from '@/app/utils/maritalFurniture';
import { isPersonalStatusCourtDecisionsDossier } from '@/app/utils/followupSpecializationVisibility';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';

export function parseExecutionMoneyLike(v: unknown): number {
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    if (typeof v === 'string') {
        const normalizeDigits = (s: string) =>
            s
                .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
                .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
        const normalized = normalizeDigits(v).replace(/\u066B/g, '.');
        const cleaned = normalized.replace(/[^0-9.]/g, '');
        const n = parseFloat(cleaned);
        return Number.isFinite(n) ? n : 0;
    }
    return 0;
}

export function resolveExecutionClaimTypeFlags(
    executionData: Record<string, unknown> | null | undefined,
    claimType: string | undefined,
) {
    return {
        isNonFinancialClaim: isNonFinancialExecutionClaim(executionData, claimType),
        isVisitationClaim: isVisitationExecutionClaim(executionData, claimType),
        isMaritalFurnitureClaim: isMaritalFurnitureExecutionClaim(executionData, claimType),
        isAlimonyClaimType: hasOngoingAlimonyInExecution(executionData, claimType),
    };
}

export function computePrincipalDebtAmount(input: {
    executionData: Record<string, unknown> | null | undefined;
    parsedDebtAmount: number;
    isNonFinancialClaim: boolean;
    isMaritalFurnitureClaim: boolean;
}): number {
    // أثاث زوجية: غير مالي حتى جرد التسليم، ثم قيم «تعذّر» فقط — يجب فحصه قبل isNonFinancialClaim
    if (input.isMaritalFurnitureClaim) {
        const types = getEffectiveClaimTypes(input.executionData);
        if (types.length <= 1) {
            return resolveMaritalFurnitureFinancialPrincipal(input.executionData);
        }
        return buildExecutionClaimBreakdown(input.executionData).reduce((sum, row) => sum + row.amount, 0);
    }
    if (input.isNonFinancialClaim) return 0;
    return resolveUnifiedVesselPrincipalAmount(input.executionData, input.parsedDebtAmount);
}

export function computeFinancialPrincipalAmount(input: {
    liabilityGroupTabsMode: boolean;
    activeLiabilityGroup: DebtorLiabilityGroup | null | undefined;
    isNonFinancialClaim: boolean;
    isMaritalFurnitureClaim: boolean;
    principalDebtAmount: number;
    allDebtorRowsForLiability: Array<Record<string, unknown>>;
    partyMultiplicity: Record<string, unknown> | undefined;
}): number {
    if (!input.liabilityGroupTabsMode || !input.activeLiabilityGroup || input.isNonFinancialClaim) {
        return input.principalDebtAmount;
    }
    if (input.isMaritalFurnitureClaim) return input.principalDebtAmount;
    return resolveLiabilityGroupPrincipal(
        input.allDebtorRowsForLiability,
        input.partyMultiplicity,
        input.activeLiabilityGroup,
    );
}

export function computeFinancialLawyerFeesAmount(input: {
    liabilityGroupTabsMode: boolean;
    activeLiabilityGroup: DebtorLiabilityGroup | null | undefined;
    parsedLawyerFees: number;
    allDebtorRowsForLiability: Array<Record<string, unknown>>;
    lawyerFeesAmount: unknown;
    executionFee: unknown;
}): number {
    if (!input.liabilityGroupTabsMode || !input.activeLiabilityGroup) {
        return input.parsedLawyerFees;
    }
    const globalFees = Math.max(
        parseExecutionMoneyLike(input.lawyerFeesAmount),
        parseExecutionMoneyLike(input.executionFee),
    );
    return resolveLiabilityGroupLawyerFees(
        input.allDebtorRowsForLiability,
        globalFees,
        input.activeLiabilityGroup,
    );
}

export function hasEvictionDataSignals(executionData: ExecutionFile | null | undefined): boolean {
    const ed = executionData as unknown as Record<string, unknown> | null | undefined;
    if (!ed) return false;
    const boolSignals = [
        'eviction_executor_vacate_grant_approved',
        'eviction_voluntary_period_end_declared',
        'notice_voluntary_period_end_declared',
    ];
    for (const k of boolSignals) {
        if (ed[k] === true) return true;
    }
    const strSignals = [
        'eviction_premises_use',
        'eviction_vacate_deadline',
        'eviction_residential_grace_period_start',
        'eviction_residential_grace_manually_ended_at',
        'eviction_executor_vacate_grant_request_date',
    ];
    for (const k of strSignals) {
        if (String(ed[k] ?? '').trim() !== '') return true;
    }
    const arrSignals = ['eviction_judicial_custodians', 'eviction_caseTasksPending', 'eviction_tasks'];
    for (const k of arrSignals) {
        const v = ed[k];
        if (Array.isArray(v) && v.length > 0) return true;
    }
    return false;
}

export function hasEvictionTimelineSignals(activeTimelineEvents: TimelineEvent[]): boolean {
    return (
        hasEvictionTimelineAction(activeTimelineEvents, EVICTION_TIMELINE_ACTION_IDS.FIELD_VISIT) ||
        hasEvictionTimelineAction(activeTimelineEvents, EVICTION_TIMELINE_ACTION_IDS.POLICE_FORCE) ||
        hasEvictionTimelineAction(activeTimelineEvents, EVICTION_TIMELINE_ACTION_IDS.BREAK_INVENTORY) ||
        hasEvictionTimelineAction(activeTimelineEvents, EVICTION_TIMELINE_ACTION_IDS.CUSTODIAN) ||
        hasEvictionTimelineAction(activeTimelineEvents, EVICTION_TIMELINE_ACTION_IDS.HANDOVER_FINAL) ||
        hasEvictionTimelineAction(activeTimelineEvents, EVICTION_TIMELINE_ACTION_IDS.RESIDENTIAL_GRACE_EARLY_END) ||
        hasEvictionTimelineAction(activeTimelineEvents, EVICTION_TIMELINE_ACTION_IDS.HEIRS_EXECUTION_NOTICE_MEMO)
    );
}

export function resolveIsEvictionExecutionModule(input: {
    claimTypeForExecutionModule: string;
    isMaritalFurnitureClaim: boolean;
    useEvictionFieldProcedures: boolean;
    hasEvictionSignals: boolean;
    hasEvictionTimelineSignals: boolean;
}): boolean {
    if (isSpecificDeliveryClaim(input.claimTypeForExecutionModule)) return false;
    if (isEncroachmentRemovalClaim(input.claimTypeForExecutionModule)) return false;
    if (input.isMaritalFurnitureClaim) return false;
    if (!isEvictionClaim(input.claimTypeForExecutionModule)) return false;
    return (
        input.useEvictionFieldProcedures ||
        input.hasEvictionSignals ||
        input.hasEvictionTimelineSignals
    );
}

export function resolveIsPersonalStatusExecutionClaim(input: {
    claimType: string | undefined;
    executionData: ExecutionFile | null | undefined;
    docType: string | undefined;
    classification: string | undefined;
    activeDebtorEntityKind: string | undefined;
}): boolean {
    const ct = String(
        input.claimType || (input.executionData as { claimType?: string } | undefined)?.claimType || '',
    ).trim();
    const edFull = input.executionData as {
        docType?: string;
        classification?: string;
        category?: string;
    } | null;
    return (
        isPersonalStatusCourtDecisionsDossier(
            input.docType || edFull?.docType,
            input.classification || edFull?.classification,
            edFull?.category,
            input.activeDebtorEntityKind,
        ) ||
        (ct.includes('نفقة') && !ct.includes('نفقة عدة') && !ct.includes('مهر'))
    );
}
