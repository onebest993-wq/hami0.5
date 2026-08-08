import type {
    HiddenGuarantorRequestKey,
    HiddenPersonalCoerciveRequestKey,
} from '@/app/components/lawyer/ExecutionDashboard/components/hiddenFollowupRequestsUtils';

export type FollowupScenarioHiddenBaselineEntry = {
    hiddenToggleVisible: boolean;
    hiddenPersonalCoerciveKeys: HiddenPersonalCoerciveRequestKey[];
    hiddenGuarantorKeys: HiddenGuarantorRequestKey[];
    breakInventoryVisible: boolean;
    hasAnyHiddenContent: boolean;
};

/**
 * لقطة مرجعية لـ 21 سيناريو — تُحدَّث عند تغيير منطق الطلبات المخفية عمداً.
 * توليد: npx vitest run src/app/application/execution/followup/__tests__/printHiddenBaseline.test.ts
 */
export const FOLLOWUP_SCENARIO_HIDDEN_BASELINE: Record<string, FollowupScenarioHiddenBaselineEntry> = {
    financial_employee: {
        hiddenToggleVisible: true,
        hiddenPersonalCoerciveKeys: ['forced_bring_in', 'travel_ban'],
        hiddenGuarantorKeys: ['guarantor_request'],
        breakInventoryVisible: false,
        hasAnyHiddenContent: true,
    },
    financial_earner: {
        hiddenToggleVisible: true,
        hiddenPersonalCoerciveKeys: [],
        hiddenGuarantorKeys: [],
        breakInventoryVisible: false,
        hasAnyHiddenContent: false,
    },
    civil_earner_low_center: {
        hiddenToggleVisible: true,
        hiddenPersonalCoerciveKeys: [],
        hiddenGuarantorKeys: [],
        breakInventoryVisible: false,
        hasAnyHiddenContent: false,
    },
    civil_earner_high_center: {
        hiddenToggleVisible: true,
        hiddenPersonalCoerciveKeys: [],
        hiddenGuarantorKeys: [],
        breakInventoryVisible: false,
        hasAnyHiddenContent: false,
    },
    specific_delivery_movable_pre_earner: {
        hiddenToggleVisible: true,
        hiddenPersonalCoerciveKeys: [
            'forced_bring_in',
            'travel_ban',
            'arrest_warrant_investigation',
        ],
        hiddenGuarantorKeys: [],
        breakInventoryVisible: false,
        hasAnyHiddenContent: true,
    },
    specific_delivery_movable_pre_employee: {
        hiddenToggleVisible: true,
        hiddenPersonalCoerciveKeys: ['forced_bring_in', 'travel_ban'],
        hiddenGuarantorKeys: ['guarantor_request'],
        breakInventoryVisible: false,
        hasAnyHiddenContent: true,
    },
    specific_delivery_immovable_pending_earner: {
        hiddenToggleVisible: true,
        hiddenPersonalCoerciveKeys: [
            'forced_bring_in',
            'travel_ban',
            'arrest_warrant_investigation',
        ],
        hiddenGuarantorKeys: [],
        breakInventoryVisible: true,
        hasAnyHiddenContent: true,
    },
    specific_delivery_post_financialized_earner: {
        hiddenToggleVisible: true,
        hiddenPersonalCoerciveKeys: [
            'forced_bring_in',
            'travel_ban',
            'arrest_warrant_investigation',
        ],
        hiddenGuarantorKeys: [],
        breakInventoryVisible: false,
        hasAnyHiddenContent: true,
    },
    eviction_earner: {
        hiddenToggleVisible: true,
        hiddenPersonalCoerciveKeys: [
            'forced_bring_in',
            'travel_ban',
            'arrest_warrant_investigation',
        ],
        hiddenGuarantorKeys: [],
        breakInventoryVisible: false,
        hasAnyHiddenContent: true,
    },
    eviction_employee: {
        hiddenToggleVisible: true,
        hiddenPersonalCoerciveKeys: ['forced_bring_in', 'travel_ban'],
        hiddenGuarantorKeys: ['guarantor_request'],
        breakInventoryVisible: false,
        hasAnyHiddenContent: true,
    },
    encroachment_earner: {
        hiddenToggleVisible: true,
        hiddenPersonalCoerciveKeys: [
            'forced_bring_in',
            'travel_ban',
            'arrest_warrant_investigation',
        ],
        hiddenGuarantorKeys: [],
        breakInventoryVisible: false,
        hasAnyHiddenContent: true,
    },
    visitation_earner: {
        hiddenToggleVisible: true,
        hiddenPersonalCoerciveKeys: [],
        hiddenGuarantorKeys: ['guarantor_request'],
        breakInventoryVisible: false,
        hasAnyHiddenContent: true,
    },
    matwaa_earner: {
        hiddenToggleVisible: true,
        hiddenPersonalCoerciveKeys: ['forced_bring_in'],
        hiddenGuarantorKeys: [],
        breakInventoryVisible: false,
        hasAnyHiddenContent: true,
    },
    custody_removal_earner: {
        hiddenToggleVisible: true,
        hiddenPersonalCoerciveKeys: [],
        hiddenGuarantorKeys: ['guarantor_request'],
        breakInventoryVisible: false,
        hasAnyHiddenContent: true,
    },
    custody_removal_employee: {
        hiddenToggleVisible: true,
        hiddenPersonalCoerciveKeys: [],
        hiddenGuarantorKeys: ['guarantor_request'],
        breakInventoryVisible: false,
        hasAnyHiddenContent: true,
    },
    marital_furniture_earner: {
        hiddenToggleVisible: true,
        hiddenPersonalCoerciveKeys: ['forced_bring_in'],
        hiddenGuarantorKeys: [],
        breakInventoryVisible: false,
        hasAnyHiddenContent: true,
    },
    legal_entity_financial: {
        hiddenToggleVisible: true,
        hiddenPersonalCoerciveKeys: ['forced_bring_in'],
        hiddenGuarantorKeys: ['guarantor_request'],
        breakInventoryVisible: false,
        hasAnyHiddenContent: true,
    },
    deceased_financial_earner: {
        hiddenToggleVisible: false,
        hiddenPersonalCoerciveKeys: [],
        hiddenGuarantorKeys: [],
        breakInventoryVisible: false,
        hasAnyHiddenContent: false,
    },
    court_sharia_earner: {
        hiddenToggleVisible: true,
        hiddenPersonalCoerciveKeys: [],
        hiddenGuarantorKeys: [],
        breakInventoryVisible: false,
        hasAnyHiddenContent: false,
    },
    court_sharia_employee: {
        hiddenToggleVisible: true,
        hiddenPersonalCoerciveKeys: ['forced_bring_in'],
        hiddenGuarantorKeys: ['guarantor_request'],
        breakInventoryVisible: false,
        hasAnyHiddenContent: true,
    },
    financial_employee_assignment_block: {
        hiddenToggleVisible: true,
        hiddenPersonalCoerciveKeys: [],
        hiddenGuarantorKeys: ['guarantor_request'],
        breakInventoryVisible: false,
        hasAnyHiddenContent: true,
    },
};
