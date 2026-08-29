/**
 * محلّل سيناريوهات محضر المتابعة — يعكس سلسلة الإنتاج:
 * نوع المطالبة × كاسب/موظف × مركز مالي × كيان مدين × وفاة مدين
 */
import {
    buildFollowupModalTabsFromFlags,
    buildFollowupSectionTabOrderFromFlags,
} from '@/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/buildFollowupModalTabsFromFlags';
import { applyFollowupSpecializationOverlays } from '@/app/utils/applyFollowupSpecializationOverlays';
import { applyDebtorDeathFollowupOverlay } from '@/app/utils/partyDeathFollowupOverlay';
import {
    resolveFollowupSpecializationVisibility,
    isCustodyRemovalClaim,
    type FollowupSpecializationVisibility,
} from '@/app/utils/followupSpecializationVisibility';
import type { SpecificDeliveryItem } from '@/app/utils/specificDeliveryItemsUtils';
import type { DebtorEntityKind } from '@/app/utils/debtorEntityKindUtils';

/** التبويبات الثابتة في كل سيناريو (بعد بوابة restricted) */
export const FOLLOWUP_ALWAYS_TAB_IDS = [
    'correspondences',
    'admin',
    'dossier_controls',
    'other_party',
] as const;

export type FollowupScenarioTabId =
    | 'personal'
    | 'coercive'
    | 'seizure_requests'
    | typeof FOLLOWUP_ALWAYS_TAB_IDS[number];

export type FollowupScenarioInput = {
    claimType: string;
    isEmployee: boolean;
    /** متبقي المركز المالي الموحّد (د.ع) — يفعّل بوابة الكاسب */
    financialCenterTotalIqd?: number;
    debtorEntityKind?: DebtorEntityKind | string;
    activeDebtorIsDeceased?: boolean;
    /** وكيل مدين — يقيّد التبويبات الجبرية */
    hideCoerciveTabsForDebtorAgent?: boolean;
    /** كتلة تكليف بعد عدم الحضور — يظهر تبويب شخصي حتى لو مخفي بالأعلام */
    showEmployeeAssignmentCoerciveBlock?: boolean;
    /** فتح تبويب الموظف الشخصي من التخزين المحلي */
    personalTabUnlocked?: boolean;
    specificDeliveryItemNature?: string | null;
    specificDeliveryFinancialized?: boolean;
    specificDeliveryItems?: SpecificDeliveryItem[] | null;
    docType?: string | null;
    classification?: string | null;
    category?: string | null;
};

export type FollowupScenarioPipelineKind = 'effective_earner_gated' | 'debtor_pipeline_inline';

export type FollowupScenarioResult = {
    flagsBase: FollowupSpecializationVisibility;
    flagsWithEarnerGate: FollowupSpecializationVisibility;
    flagsDebtorPipeline: FollowupSpecializationVisibility;
    followupTabsRestricted: boolean;
    showPersonalCoerciveFollowupTab: boolean;
    modalShowPersonalCoerciveFollowupTab: boolean;
    personalTabLockedForEmployee: boolean;
    effectiveTabIds: FollowupScenarioTabId[];
    effectiveSectionTabOrder: FollowupScenarioTabId[];
    debtorPipelineInlineTabIds: FollowupScenarioTabId[];
};

function resolveSpecializationFlags(input: FollowupScenarioInput): FollowupSpecializationVisibility {
    return resolveFollowupSpecializationVisibility(input.claimType, input.isEmployee, {
        specificDeliveryItemNature: input.specificDeliveryItemNature,
        specificDeliveryFinancialized: input.specificDeliveryFinancialized,
        specificDeliveryItems: input.specificDeliveryItems,
        docType: input.docType,
        classification: input.classification,
        category: input.category,
        debtorEntityKind: input.debtorEntityKind ?? 'natural_person',
    });
}

function buildTabsFromFlags(
    flags: FollowupSpecializationVisibility,
    input: {
        showPersonalCoerciveFollowupTab: boolean;
        personalTabLockedForEmployee: boolean;
        followupTabsRestricted: boolean;
    },
): FollowupScenarioTabId[] {
    return buildFollowupModalTabsFromFlags({
        specialization: flags,
        showPersonalCoerciveFollowupTab: input.showPersonalCoerciveFollowupTab,
        personalTabLockedForEmployee: input.personalTabLockedForEmployee,
        followupTabsRestricted: input.followupTabsRestricted,
    }).map((t) => t.id as FollowupScenarioTabId);
}

export function resolveFollowupScenario(input: FollowupScenarioInput): FollowupScenarioResult {
    const financialCenterTotalIqd = Math.max(0, Math.round(Number(input.financialCenterTotalIqd) || 0));
    const flagsBase = resolveSpecializationFlags(input);

    const flagsDebtorPipeline = input.activeDebtorIsDeceased
        ? applyDebtorDeathFollowupOverlay(flagsBase, true)
        : flagsBase;

    const flagsWithEarnerGate = applyFollowupSpecializationOverlays(flagsBase, {
        isEmployee: input.isEmployee,
        financialCenterTotalIqd,
        activeDebtorIsDeceased: input.activeDebtorIsDeceased,
    });

    const followupTabsRestricted =
        Boolean(input.hideCoerciveTabsForDebtorAgent) ||
        String(input.debtorEntityKind ?? 'natural_person') === 'legal_entity';

    const custodyRemovalClaimActive = isCustodyRemovalClaim(input.claimType);
    const employeeCoerciveDetentionRestricted = input.isEmployee && !custodyRemovalClaimActive;

    const personalTabLockedForEmployee =
        employeeCoerciveDetentionRestricted &&
        !Boolean(input.personalTabUnlocked) &&
        !flagsWithEarnerGate.hidePersonalCoerciveFollowupTab;

    const showPersonalCoerciveFollowupTab = !flagsWithEarnerGate.hidePersonalCoerciveFollowupTab;

    const modalShowPersonalCoerciveFollowupTab =
        !flagsWithEarnerGate.hidePersonalCoerciveFollowupTab ||
        Boolean(input.showEmployeeAssignmentCoerciveBlock);

    const modalPersonalTabLockedForEmployee =
        employeeCoerciveDetentionRestricted &&
        !Boolean(input.personalTabUnlocked) &&
        !flagsWithEarnerGate.hidePersonalCoerciveFollowupTab;

    const effectiveTabIds = buildTabsFromFlags(flagsWithEarnerGate, {
        showPersonalCoerciveFollowupTab: modalShowPersonalCoerciveFollowupTab,
        personalTabLockedForEmployee,
        followupTabsRestricted,
    });

    const effectiveSectionTabOrder = buildFollowupSectionTabOrderFromFlags({
        showPersonalCoerciveFollowupTab,
        specialization: flagsWithEarnerGate,
        followupTabsRestricted,
    }) as FollowupScenarioTabId[];

    const debtorPipelineInlineTabIds = buildTabsFromFlags(flagsDebtorPipeline, {
        showPersonalCoerciveFollowupTab:
            !flagsDebtorPipeline.hidePersonalCoerciveFollowupTab ||
            Boolean(input.showEmployeeAssignmentCoerciveBlock),
        personalTabLockedForEmployee:
            employeeCoerciveDetentionRestricted &&
            !Boolean(input.personalTabUnlocked) &&
            !flagsDebtorPipeline.hidePersonalCoerciveFollowupTab,
        followupTabsRestricted,
    });

    return {
        flagsBase,
        flagsWithEarnerGate,
        flagsDebtorPipeline,
        followupTabsRestricted,
        showPersonalCoerciveFollowupTab,
        modalShowPersonalCoerciveFollowupTab,
        personalTabLockedForEmployee,
        effectiveTabIds,
        effectiveSectionTabOrder,
        debtorPipelineInlineTabIds,
    };
}
