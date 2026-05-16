/**
 * آلة حالات: تبليغ المدين الكاسب لاستحصال الأتعاب والمصاريف (إضبارة تخلية).
 * منطق صرفي فقط — العرض في EvictionEarnerFeeCollectionFlow.
 */

export type FeeCollectionPurpose = 'none' | 'ordinary' | 'coercive';

export interface EvictionEarnerFeeCollectionSM {
    v: 1;
    /** بعد موافقة المنفذ على الاستحصال: اختيار غاية التبليغ */
    feeCollectionPurpose: FeeCollectionPurpose;
    /** B1: تاريخ التبليغ الاعتيادي ضمن فرع الإحضار الجبري */
    b1OrdinaryNoticeDate: string | null;
    /** انتهاء المهلة القانونية بعد B1 دون ضغط إعادة الضبط */
    b1PeriodComplete: boolean;
    b2ForcedMemoIssued: boolean;
    /** تخفى عن الأنظار — يفتح B3 وفق المسار */
    b2DebtorEvading: boolean;
    b3InvestigationRequested: boolean;
    b3ProcessedConfirmed: boolean;
    b4WarrantLogged: boolean;
}

export function defaultEvictionEarnerFeeCollectionSM(): EvictionEarnerFeeCollectionSM {
    return {
        v: 1,
        feeCollectionPurpose: 'none',
        b1OrdinaryNoticeDate: null,
        b1PeriodComplete: false,
        b2ForcedMemoIssued: false,
        b2DebtorEvading: false,
        b3InvestigationRequested: false,
        b3ProcessedConfirmed: false,
        b4WarrantLogged: false,
    };
}

export type EarnerFeeSmAction =
    | { type: 'RESET' }
    | { type: 'PICK_ORDINARY' }
    | { type: 'PICK_COERCIVE' }
    | { type: 'SET_B1_DATE'; date: string }
    | { type: 'B1_PERIOD_DONE' }
    | { type: 'B2_FORCED_MEMO' }
    | { type: 'B2_EVADING'; value: boolean }
    | { type: 'B3_REQUEST' }
    | { type: 'B3_CONFIRM_PROCESSED' }
    | { type: 'B4_WARRANT' };

function clearedAfterPurpose(): Pick<
    EvictionEarnerFeeCollectionSM,
    | 'b1OrdinaryNoticeDate'
    | 'b1PeriodComplete'
    | 'b2ForcedMemoIssued'
    | 'b2DebtorEvading'
    | 'b3InvestigationRequested'
    | 'b3ProcessedConfirmed'
    | 'b4WarrantLogged'
> {
    return {
        b1OrdinaryNoticeDate: null,
        b1PeriodComplete: false,
        b2ForcedMemoIssued: false,
        b2DebtorEvading: false,
        b3InvestigationRequested: false,
        b3ProcessedConfirmed: false,
        b4WarrantLogged: false,
    };
}

export function reduceEvictionEarnerFeeSm(
    s: EvictionEarnerFeeCollectionSM,
    a: EarnerFeeSmAction
): EvictionEarnerFeeCollectionSM {
    switch (a.type) {
        case 'RESET':
            return defaultEvictionEarnerFeeCollectionSM();
        case 'PICK_ORDINARY':
            return {
                ...s,
                feeCollectionPurpose: 'ordinary',
                ...clearedAfterPurpose(),
            };
        case 'PICK_COERCIVE':
            return {
                ...s,
                feeCollectionPurpose: 'coercive',
                ...clearedAfterPurpose(),
            };
        case 'SET_B1_DATE':
            return {
                ...s,
                b1OrdinaryNoticeDate: a.date,
                b1PeriodComplete: false,
            };
        case 'B1_PERIOD_DONE':
            return { ...s, b1PeriodComplete: true };
        case 'B2_FORCED_MEMO':
            return { ...s, b2ForcedMemoIssued: true };
        case 'B2_EVADING':
            return { ...s, b2DebtorEvading: a.value };
        case 'B3_REQUEST':
            return { ...s, b3InvestigationRequested: true };
        case 'B3_CONFIRM_PROCESSED':
            return { ...s, b3ProcessedConfirmed: true };
        case 'B4_WARRANT':
            return { ...s, b4WarrantLogged: true };
        default:
            return s;
    }
}

/** خطوات فرع B للعرض (1 = أعلى الخط الزمني) */
export const EARNER_FEE_BRANCH_B_STEPS = [
    { id: 'b1', label: 'تبليغ اعتيادي (أولاً)' },
    { id: 'b2', label: 'الإحضار الجبري' },
    { id: 'b3', label: 'مفاتحة محكمة التحقيق (أمر قبض)' },
    { id: 'b4', label: 'صدور مذكرة أمر القبض' },
] as const;
