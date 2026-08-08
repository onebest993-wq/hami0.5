import type { SpecificDeliveryItem } from '@/app/utils/specificDeliveryItemsUtils';
import type { FollowupScenarioInput, FollowupScenarioTabId } from './followupScenarioResolver';

export type FollowupScenarioFlagExpectation = Partial<
    Record<
        | 'hidePersonalCoerciveFollowupTab'
        | 'hideFollowupCoerciveTab'
        | 'hideFollowupSeizureRequestsTab'
        | 'suppressHiddenPersonalCoerciveRequests'
        | 'showEncroachmentRemovalRequestCards'
        | 'showCorrespondencesSoftProcedures'
        | 'forceSettlementBuriedOnly'
        | 'showFinancialGuarantorRequestOnly',
        boolean
    >
>;

export type FollowupScenarioDefinition = {
    id: string;
    titleAr: string;
    axes: {
        claimType: string;
        debtor: 'earner' | 'employee';
        executionModule?: 'financial_standard' | 'eviction_hybrid' | 'specific_delivery_phase';
        financialCenter?: 'zero' | 'low' | 'mid' | 'high';
        debtorEntity?: 'natural_person' | 'legal_entity';
        deceased?: boolean;
    };
    input: FollowupScenarioInput;
    expectedEffectiveTabIds: FollowupScenarioTabId[];
    expectedFlags?: FollowupScenarioFlagExpectation;
    personalTabLocked?: boolean;
    /** مسار debtor pipeline inline يختلف عن effective عند بوابة الكاسب — يُوثَّق للمرحلة 2 */
    knownDebtorPipelineDrift?: boolean;
    /** chip tabs ≠ section order (مثلاً كتلة التكليف) */
    modalSectionTabOrderDrift?: boolean;
    knownFragility?: string;
};

const SD_MOVABLE_PENDING: SpecificDeliveryItem[] = [
    {
        id: 'sd-test-movable',
        name: 'سيارة',
        nature: 'movable',
        status: 'pending',
    },
];

const SD_IMMOVABLE_PENDING: SpecificDeliveryItem[] = [
    {
        id: 'sd-test-immovable',
        name: 'عقار',
        nature: 'immovable',
        status: 'pending',
    },
];

export const FOLLOWUP_SCENARIO_CATALOG: FollowupScenarioDefinition[] = [
    {
        id: 'financial_employee',
        titleAr: 'استحصال مالي — مدين موظف',
        axes: {
            claimType: 'استحصال دين مالي',
            debtor: 'employee',
            executionModule: 'financial_standard',
            financialCenter: 'mid',
        },
        input: {
            claimType: 'استحصال دين مالي',
            isEmployee: true,
            financialCenterTotalIqd: 400_000,
        },
        expectedEffectiveTabIds: [
            'seizure_requests',
            'correspondences',
            'admin',
            'dossier_controls',
            'other_party',
        ],
        expectedFlags: {
            hidePersonalCoerciveFollowupTab: true,
            hideFollowupCoerciveTab: true,
            forceSettlementBuriedOnly: true,
        },
    },
    {
        id: 'financial_earner',
        titleAr: 'استحصال مالي — مدين كاسب',
        axes: {
            claimType: 'استحصال دين مالي',
            debtor: 'earner',
            executionModule: 'financial_standard',
            financialCenter: 'mid',
        },
        input: {
            claimType: 'استحصال دين مالي',
            isEmployee: false,
            financialCenterTotalIqd: 400_000,
        },
        expectedEffectiveTabIds: [
            'personal',
            'seizure_requests',
            'correspondences',
            'admin',
            'dossier_controls',
            'other_party',
        ],
        expectedFlags: {
            hidePersonalCoerciveFollowupTab: false,
            hideFollowupCoerciveTab: true,
            showFinancialGuarantorRequestOnly: true,
        },
    },
    {
        id: 'civil_earner_low_center',
        titleAr: 'مطالبة مدنية عامة — كاسب — مركز مالي منخفض',
        axes: {
            claimType: 'مطالبة مدنية',
            debtor: 'earner',
            financialCenter: 'low',
        },
        input: {
            claimType: 'مطالبة مدنية',
            isEmployee: false,
            financialCenterTotalIqd: 50_000,
        },
        expectedEffectiveTabIds: [
            'personal',
            'coercive',
            'seizure_requests',
            'correspondences',
            'admin',
            'dossier_controls',
            'other_party',
        ],
        knownDebtorPipelineDrift: false,
    },
    {
        id: 'civil_earner_high_center',
        titleAr: 'مطالبة مدنية — كاسب — مركز > 250k (بوابة الكاسب)',
        axes: {
            claimType: 'مطالبة مدنية',
            debtor: 'earner',
            financialCenter: 'high',
        },
        input: {
            claimType: 'مطالبة مدنية',
            isEmployee: false,
            financialCenterTotalIqd: 300_000,
        },
        expectedEffectiveTabIds: [
            'personal',
            'coercive',
            'seizure_requests',
            'correspondences',
            'admin',
            'dossier_controls',
            'other_party',
        ],
        knownDebtorPipelineDrift: false,
    },
    {
        id: 'specific_delivery_movable_pre_earner',
        titleAr: 'تسليم شيء معين — منقول — قبل التسليم — كاسب',
        axes: {
            claimType: 'تسليم شيء معين',
            debtor: 'earner',
            executionModule: 'specific_delivery_phase',
        },
        input: {
            claimType: 'تسليم شيء معين',
            isEmployee: false,
            specificDeliveryItems: SD_MOVABLE_PENDING,
        },
        expectedEffectiveTabIds: [
            'coercive',
            'correspondences',
            'admin',
            'dossier_controls',
            'other_party',
        ],
        expectedFlags: {
            hidePersonalCoerciveFollowupTab: true,
            hideFollowupSeizureRequestsTab: true,
        },
    },
    {
        id: 'specific_delivery_movable_pre_employee',
        titleAr: 'تسليم شيء معين — منقول — قبل التسليم — موظف',
        axes: {
            claimType: 'تسليم شيء معين',
            debtor: 'employee',
            executionModule: 'specific_delivery_phase',
        },
        input: {
            claimType: 'تسليم شيء معين',
            isEmployee: true,
            specificDeliveryItems: SD_MOVABLE_PENDING,
        },
        expectedEffectiveTabIds: [
            'coercive',
            'correspondences',
            'admin',
            'dossier_controls',
            'other_party',
        ],
        expectedFlags: {
            hidePersonalCoerciveFollowupTab: true,
            hideFollowupSeizureRequestsTab: true,
        },
    },
    {
        id: 'specific_delivery_immovable_pending_earner',
        titleAr: 'تسليم شيء معين — غير منقول معلّق — كاسب',
        axes: {
            claimType: 'تسليم شيء معين',
            debtor: 'earner',
            executionModule: 'specific_delivery_phase',
        },
        input: {
            claimType: 'تسليم شيء معين',
            isEmployee: false,
            specificDeliveryItems: SD_IMMOVABLE_PENDING,
        },
        expectedEffectiveTabIds: [
            'coercive',
            'correspondences',
            'admin',
            'dossier_controls',
            'other_party',
        ],
        expectedFlags: {
            hidePersonalCoerciveFollowupTab: true,
            hideFollowupSeizureRequestsTab: true,
        },
    },
    {
        id: 'specific_delivery_movable_pre_legal_entity',
        titleAr: 'تسليم شيء معين — منقول — مدين كيان قانوني',
        axes: {
            claimType: 'تسليم شيء معين',
            debtor: 'earner',
            debtorEntity: 'legal_entity',
            executionModule: 'specific_delivery_phase',
        },
        input: {
            claimType: 'تسليم شيء معين',
            isEmployee: false,
            debtorEntityKind: 'legal_entity',
            specificDeliveryItems: SD_MOVABLE_PENDING,
        },
        expectedEffectiveTabIds: [
            'coercive',
            'correspondences',
            'admin',
            'dossier_controls',
            'other_party',
        ],
        expectedFlags: {
            hideFollowupCoerciveTab: false,
            showCorrespondencesSoftProcedures: true,
            hidePersonalCoerciveFollowupTab: true,
            hideFollowupSeizureRequestsTab: true,
        },
    },
    {
        id: 'specific_delivery_post_financialized_earner',
        titleAr: 'تسليم شيء معين — بعد التحويل المالي — كاسب',
        axes: {
            claimType: 'تسليم شيء معين',
            debtor: 'earner',
            executionModule: 'specific_delivery_phase',
        },
        input: {
            claimType: 'تسليم شيء معين',
            isEmployee: false,
            specificDeliveryFinancialized: true,
            specificDeliveryItems: [
                {
                    id: 'sd-fin',
                    name: 'عين',
                    nature: 'movable',
                    status: 'financialized',
                    financializedAmount: 500_000,
                },
            ],
        },
        expectedEffectiveTabIds: [
            'coercive',
            'seizure_requests',
            'correspondences',
            'admin',
            'dossier_controls',
            'other_party',
        ],
        expectedFlags: {
            hidePersonalCoerciveFollowupTab: true,
            hideFollowupCoerciveTab: false,
            showFinancialGuarantorRequestOnly: true,
        },
    },
    {
        id: 'eviction_earner',
        titleAr: 'تخلية مأجور — كاسب',
        axes: {
            claimType: 'تخلية مأجور',
            debtor: 'earner',
            executionModule: 'eviction_hybrid',
        },
        input: { claimType: 'تخلية مأجور', isEmployee: false },
        expectedEffectiveTabIds: [
            'coercive',
            'seizure_requests',
            'correspondences',
            'admin',
            'dossier_controls',
            'other_party',
        ],
        expectedFlags: { hidePersonalCoerciveFollowupTab: true },
    },
    {
        id: 'eviction_employee',
        titleAr: 'تخلية مأجور — موظف',
        axes: {
            claimType: 'تخلية مأجور',
            debtor: 'employee',
            executionModule: 'eviction_hybrid',
        },
        input: { claimType: 'تخلية مأجور', isEmployee: true },
        expectedEffectiveTabIds: [
            'coercive',
            'seizure_requests',
            'correspondences',
            'admin',
            'dossier_controls',
            'other_party',
        ],
        expectedFlags: { hidePersonalCoerciveFollowupTab: true },
    },
    {
        id: 'encroachment_earner',
        titleAr: 'إزالة تجاوز — كاسب',
        axes: { claimType: 'إزالة تجاوز', debtor: 'earner' },
        input: { claimType: 'إزالة تجاوز', isEmployee: false },
        expectedEffectiveTabIds: [
            'coercive',
            'correspondences',
            'admin',
            'dossier_controls',
            'other_party',
        ],
        expectedFlags: {
            hidePersonalCoerciveFollowupTab: true,
            hideFollowupSeizureRequestsTab: true,
            showEncroachmentRemovalRequestCards: true,
        },
    },
    {
        id: 'visitation_earner',
        titleAr: 'مشاهدة — كاسب',
        axes: { claimType: 'مشاهدة', debtor: 'earner' },
        input: { claimType: 'مشاهدة', isEmployee: false },
        expectedEffectiveTabIds: [
            'personal',
            'correspondences',
            'admin',
            'dossier_controls',
            'other_party',
        ],
        expectedFlags: {
            hidePersonalCoerciveFollowupTab: false,
            hideFollowupCoerciveTab: true,
            hideFollowupSeizureRequestsTab: true,
            suppressHiddenPersonalCoerciveRequests: true,
        },
    },
    {
        id: 'matwaa_earner',
        titleAr: 'مطاوعة — كاسب',
        axes: { claimType: 'مطاوعة', debtor: 'earner' },
        input: { claimType: 'مطاوعة', isEmployee: false },
        expectedEffectiveTabIds: [
            'correspondences',
            'admin',
            'dossier_controls',
            'other_party',
        ],
        expectedFlags: {
            hidePersonalCoerciveFollowupTab: true,
            hideFollowupCoerciveTab: true,
            hideFollowupSeizureRequestsTab: true,
            suppressHiddenPersonalCoerciveRequests: true,
        },
    },
    {
        id: 'custody_removal_earner',
        titleAr: 'نزع حضانة (تسليم ولد) — كاسب',
        axes: { claimType: 'تسليم ولد', debtor: 'earner' },
        input: { claimType: 'تسليم ولد', isEmployee: false },
        expectedEffectiveTabIds: [
            'personal',
            'correspondences',
            'admin',
            'dossier_controls',
            'other_party',
        ],
        expectedFlags: {
            hideFollowupCoerciveTab: true,
            hideFollowupSeizureRequestsTab: true,
            suppressHiddenPersonalCoerciveRequests: false,
        },
    },
    {
        id: 'custody_removal_employee',
        titleAr: 'نزع حضانة — موظف',
        axes: { claimType: 'تسليم ولد', debtor: 'employee' },
        input: { claimType: 'تسليم ولد', isEmployee: true },
        expectedEffectiveTabIds: [
            'personal',
            'correspondences',
            'admin',
            'dossier_controls',
            'other_party',
        ],
        personalTabLocked: false,
        expectedFlags: {
            hideFollowupCoerciveTab: true,
            hideFollowupSeizureRequestsTab: true,
        },
    },
    {
        id: 'marital_furniture_earner',
        titleAr: 'أثاث زوجية — كاسب',
        axes: { claimType: 'أثاث زوجية', debtor: 'earner' },
        input: { claimType: 'أثاث زوجية', isEmployee: false },
        expectedEffectiveTabIds: [
            'seizure_requests',
            'correspondences',
            'admin',
            'dossier_controls',
            'other_party',
        ],
        expectedFlags: {
            hidePersonalCoerciveFollowupTab: true,
            hideFollowupCoerciveTab: true,
            suppressHiddenPersonalCoerciveRequests: true,
        },
    },
    {
        id: 'legal_entity_financial',
        titleAr: 'استحصال مالي — مدين كيان قانوني',
        axes: {
            claimType: 'استحصال دين مالي',
            debtor: 'earner',
            debtorEntity: 'legal_entity',
        },
        input: {
            claimType: 'استحصال دين مالي',
            isEmployee: false,
            debtorEntityKind: 'legal_entity',
        },
        expectedEffectiveTabIds: [
            'correspondences',
            'admin',
            'dossier_controls',
            'other_party',
        ],
        expectedFlags: {
            showCorrespondencesSoftProcedures: true,
            hideFollowupCoerciveTab: true,
            hideFollowupSeizureRequestsTab: true,
        },
    },
    {
        id: 'deceased_financial_earner',
        titleAr: 'استحصال مالي — كاسب — مدين متوفي',
        axes: {
            claimType: 'استحصال دين مالي',
            debtor: 'earner',
            deceased: true,
        },
        input: {
            claimType: 'استحصال دين مالي',
            isEmployee: false,
            activeDebtorIsDeceased: true,
            financialCenterTotalIqd: 400_000,
        },
        expectedEffectiveTabIds: [
            'correspondences',
            'admin',
            'dossier_controls',
            'other_party',
        ],
        knownDebtorPipelineDrift: false,
    },
    {
        id: 'court_sharia_earner',
        titleAr: 'قرارات محاكم — شرعي — كاسب',
        axes: { claimType: 'قرارات وأحكام المحاكم', debtor: 'earner' },
        input: {
            claimType: 'قرارات وأحكام المحاكم',
            isEmployee: false,
            docType: 'قرارات وأحكام المحاكم',
            classification: 'شرعي',
        },
        expectedEffectiveTabIds: [
            'personal',
            'seizure_requests',
            'correspondences',
            'admin',
            'dossier_controls',
            'other_party',
        ],
        expectedFlags: {
            hideFollowupCoerciveTab: true,
            hidePersonalCoerciveFollowupTab: false,
        },
    },
    {
        id: 'court_sharia_employee',
        titleAr: 'قرارات محاكم — شرعي — موظف',
        axes: { claimType: 'قرارات وأحكام المحاكم', debtor: 'employee' },
        input: {
            claimType: 'قرارات وأحكام المحاكم',
            isEmployee: true,
            docType: 'قرارات وأحكام المحاكم',
            classification: 'شرعي',
        },
        expectedEffectiveTabIds: [
            'seizure_requests',
            'correspondences',
            'admin',
            'dossier_controls',
            'other_party',
        ],
        expectedFlags: {
            hideFollowupCoerciveTab: true,
            hidePersonalCoerciveFollowupTab: true,
            suppressHiddenPersonalCoerciveRequests: true,
        },
    },
    {
        id: 'financial_employee_assignment_block',
        titleAr: 'موظف — تبويب شخصي عبر كتلة التكليف',
        axes: { claimType: 'استحصال دين مالي', debtor: 'employee' },
        input: {
            claimType: 'استحصال دين مالي',
            isEmployee: true,
            showEmployeeAssignmentCoerciveBlock: true,
        },
        expectedEffectiveTabIds: [
            'personal',
            'seizure_requests',
            'correspondences',
            'admin',
            'dossier_controls',
            'other_party',
        ],
        personalTabLocked: false,
        modalSectionTabOrderDrift: true,
    },
];
