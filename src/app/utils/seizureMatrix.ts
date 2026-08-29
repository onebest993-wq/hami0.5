import type { Debtor, ExecutionFile } from '@/app/types/execution';
import { isDebtorRowEmployee } from '@/app/stores';

/** مهنة المدين لمصفوفة الحجز */
export type SeizureDebtorJob = 'employee' | 'kasib';

/** نوع المدين لمصفوفة الحجز */
export type SeizureDebtorType = 'natural_person' | 'government';

export type SeizureMatrixRuleId =
    | 'rule_0_government'
    | 'rule_1_zero'
    | 'rule_2_soft'
    | 'rule_3_tier1'
    | 'rule_4_tier2'
    | 'rule_5_full';

export type SeizureMatrixButtonKey = 'salary' | 'movable' | 'third_party' | 'property';

export type SeizureMatrixButtons = Record<SeizureMatrixButtonKey, boolean>;

export interface SeizureMatrixInput {
    /** الرصيد المتبقي بذمة المدين — حصراً من المركز المالي */
    remainingBalanceIqd: number;
    debtorJob: SeizureDebtorJob;
    debtorType: SeizureDebtorType;
    /** بعد موافقة المحامي في الحالة الأولى (1–2 مليون) */
    lawyerSoftOptIn?: boolean;
}

export interface SeizureProgressiveDisclosure {
    showAdditionalExpand: boolean;
    additionalButtons: SeizureMatrixButtonKey[];
    showMaximumExpand: boolean;
    maximumButtons: SeizureMatrixButtonKey[];
}

export interface SeizureMatrixResult {
    ruleId: SeizureMatrixRuleId;
    remainingBalanceIqd: number;
    hideSeizureTab: boolean;
    requiresSoftActivationModal: boolean;
    showTabContentButtons: boolean;
    allSeizureDisabled: boolean;
    buttons: SeizureMatrixButtons;
    progressiveDisclosure: SeizureProgressiveDisclosure;
}

const TIER_SOFT_MAX = 2_000_000;
const TIER1_MAX = 5_000_000;
const TIER2_MAX = 15_000_000;

const ALL_BUTTONS_OFF: SeizureMatrixButtons = {
    salary: false,
    movable: false,
    third_party: false,
    property: false,
};

function withButtons(partial: Partial<SeizureMatrixButtons>): SeizureMatrixButtons {
    return { ...ALL_BUTTONS_OFF, ...partial };
}

function rule2OptInButtons(job: SeizureDebtorJob): SeizureMatrixButtons {
    if (job === 'employee') return withButtons({ salary: true });
    return withButtons({ movable: true });
}

function tierBaseButtons(job: SeizureDebtorJob): SeizureMatrixButtons {
    if (job === 'employee') return withButtons({ salary: true, movable: true });
    return withButtons({ movable: true });
}

export function resolveSeizureButtonLadder(job: SeizureDebtorJob): SeizureMatrixButtonKey[] {
    if (job === 'employee') return ['salary', 'movable', 'third_party', 'property'];
    return ['movable', 'third_party', 'property'];
}

/** تقسيم الخيارات المخفية إلى كشف تدريجي: إضافية ثم قصوى */
export function computeSeizureProgressiveDisclosure(
    recommended: SeizureMatrixButtons,
    job: SeizureDebtorJob
): SeizureProgressiveDisclosure {
    const ladder = resolveSeizureButtonLadder(job);
    const hidden = ladder.filter((key) => !recommended[key]);
    if (hidden.length === 0) {
        return {
            showAdditionalExpand: false,
            additionalButtons: [],
            showMaximumExpand: false,
            maximumButtons: [],
        };
    }
    if (hidden.length === 1) {
        return {
            showAdditionalExpand: true,
            additionalButtons: hidden,
            showMaximumExpand: false,
            maximumButtons: [],
        };
    }
    return {
        showAdditionalExpand: true,
        additionalButtons: [hidden[0]],
        showMaximumExpand: true,
        maximumButtons: hidden.slice(1),
    };
}

function finalizeMatrixResult(
    partial: Omit<SeizureMatrixResult, 'progressiveDisclosure'>,
    job: SeizureDebtorJob
): SeizureMatrixResult {
    return {
        ...partial,
        progressiveDisclosure: computeSeizureProgressiveDisclosure(partial.buttons, job),
    };
}

export function computeSeizureMatrix(input: SeizureMatrixInput): SeizureMatrixResult {
    const remaining = Math.max(0, Math.round(Number(input.remainingBalanceIqd) || 0));

    if (input.debtorType === 'government') {
        return finalizeMatrixResult(
            {
                ruleId: 'rule_0_government',
                remainingBalanceIqd: remaining,
                hideSeizureTab: true,
                requiresSoftActivationModal: false,
                showTabContentButtons: false,
                allSeizureDisabled: true,
                buttons: ALL_BUTTONS_OFF,
            },
            input.debtorJob
        );
    }

    if (remaining === 0) {
        return finalizeMatrixResult(
            {
                ruleId: 'rule_1_zero',
                remainingBalanceIqd: 0,
                hideSeizureTab: true,
                requiresSoftActivationModal: false,
                showTabContentButtons: false,
                allSeizureDisabled: true,
                buttons: ALL_BUTTONS_OFF,
            },
            input.debtorJob
        );
    }

    if (remaining <= TIER_SOFT_MAX) {
        const optedIn = Boolean(input.lawyerSoftOptIn);
        const buttons = optedIn ? rule2OptInButtons(input.debtorJob) : ALL_BUTTONS_OFF;
        const result = finalizeMatrixResult(
            {
                ruleId: 'rule_2_soft',
                remainingBalanceIqd: remaining,
                hideSeizureTab: false,
                requiresSoftActivationModal: !optedIn,
                showTabContentButtons: optedIn,
                allSeizureDisabled: !optedIn,
                buttons,
            },
            input.debtorJob
        );
        if (!optedIn) {
            return {
                ...result,
                progressiveDisclosure: {
                    showAdditionalExpand: false,
                    additionalButtons: [],
                    showMaximumExpand: false,
                    maximumButtons: [],
                },
            };
        }
        return result;
    }

    if (remaining <= TIER1_MAX) {
        return finalizeMatrixResult(
            {
                ruleId: 'rule_3_tier1',
                remainingBalanceIqd: remaining,
                hideSeizureTab: false,
                requiresSoftActivationModal: false,
                showTabContentButtons: true,
                allSeizureDisabled: false,
                buttons: tierBaseButtons(input.debtorJob),
            },
            input.debtorJob
        );
    }

    if (remaining <= TIER2_MAX) {
        return finalizeMatrixResult(
            {
                ruleId: 'rule_4_tier2',
                remainingBalanceIqd: remaining,
                hideSeizureTab: false,
                requiresSoftActivationModal: false,
                showTabContentButtons: true,
                allSeizureDisabled: false,
                buttons: withButtons({
                    ...tierBaseButtons(input.debtorJob),
                    third_party: true,
                }),
            },
            input.debtorJob
        );
    }

    return finalizeMatrixResult(
        {
            ruleId: 'rule_5_full',
            remainingBalanceIqd: remaining,
            hideSeizureTab: false,
            requiresSoftActivationModal: false,
            showTabContentButtons: true,
            allSeizureDisabled: false,
            buttons: withButtons({
                ...tierBaseButtons(input.debtorJob),
                third_party: true,
                property: true,
            }),
        },
        input.debtorJob
    );
}

const GOVERNMENT_ENTITY_MARKERS =
    /دائرة\s*حكومية|جهة\s*حكومية|وزارة|محافظة|بلدية|مؤسسة\s*حكومية|هيئة\s*حكومية/i;

export function resolveSeizureDebtorType(
    debtor: Debtor | undefined,
    executionData?: ExecutionFile | Record<string, unknown> | null
): SeizureDebtorType {
    const ed = executionData as Record<string, unknown> | null | undefined;
    const explicit = String(
        ed?.debtor_entity_type ?? (debtor as { entityType?: string } | undefined)?.entityType ?? ''
    ).trim();
    if (
        explicit === 'government' ||
        explicit === 'حكومي' ||
        explicit === 'دائرة حكومية' ||
        explicit === 'جهة حكومية'
    ) {
        return 'government';
    }
    const occ = String(debtor?.occupation ?? '').trim();
    if (GOVERNMENT_ENTITY_MARKERS.test(occ)) return 'government';
    const name = String(debtor?.name ?? debtor?.fullName ?? '').trim();
    if (GOVERNMENT_ENTITY_MARKERS.test(name)) return 'government';
    return 'natural_person';
}

export function resolveSeizureDebtorJob(
    debtor: Debtor | undefined,
    activeDebtorIsEmployee?: boolean
): SeizureDebtorJob {
    if (activeDebtorIsEmployee || isDebtorRowEmployee(debtor)) return 'employee';
    const occ = String(debtor?.occupation ?? '').toLowerCase();
    if (occ === 'موظف' || occ.includes('موظف')) return 'employee';
    return 'kasib';
}

export function resolveSeizureMatrixFromExecution(args: {
    remainingBalanceIqd: number;
    executionData?: ExecutionFile | null;
    activeDebtor?: Debtor;
    activeDebtorIsEmployee?: boolean;
}): SeizureMatrixResult {
    const debtor =
        args.activeDebtor ??
        (Array.isArray(args.executionData?.debtors) ? args.executionData?.debtors[0] : undefined);
    return computeSeizureMatrix({
        remainingBalanceIqd: args.remainingBalanceIqd,
        debtorJob: resolveSeizureDebtorJob(debtor, args.activeDebtorIsEmployee),
        debtorType: resolveSeizureDebtorType(debtor, args.executionData),
        lawyerSoftOptIn: Boolean(
            (args.executionData as Record<string, unknown> | null | undefined)?.seizure_matrix_soft_opt_in
        ),
    });
}
