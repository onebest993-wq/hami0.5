import type { CrimeType, DefendantStatus } from './criminalCaseModel';
import { isInvestigationStoredStage } from './criminalProceduralStageUtils';

/** مكان إيداع/توقيف الحدث — قيم تخزينية (لا تغيّر enums المرحلة). */
export type JuvenileDetentionPlacement = 'juvenile_observation' | 'rehabilitation_school';

export type SocialInquiryWorkflowStatus = 'not_requested' | 'under_preparation' | 'submitted';

const JUVENILE_DETENTION_PLACEMENT_OPTIONS: ReadonlyArray<{
    value: JuvenileDetentionPlacement;
    label: string;
}> = [
    {
        value: 'juvenile_observation',
        label: 'دار ملاحظة الأحداث (قيد التحقيق/المحاكمة)',
    },
    {
        value: 'rehabilitation_school',
        label: 'مدرسة تأهيل الأحداث (محكوم)',
    },
] as const;

export function juvenileDetentionPlacementLabel(code: JuvenileDetentionPlacement | ''): string {
    const hit = JUVENILE_DETENTION_PLACEMENT_OPTIONS.find((o) => o.value === code);
    return hit?.label ?? '';
}

export function isValidJuvenileDetentionPlacement(v: string): v is JuvenileDetentionPlacement {
    return v === 'juvenile_observation' || v === 'rehabilitation_school';
}

export function isValidSocialInquiryWorkflowStatus(v: string): v is SocialInquiryWorkflowStatus {
    return v === 'not_requested' || v === 'under_preparation' || v === 'submitted';
}

export function socialInquiryWorkflowLabel(status: SocialInquiryWorkflowStatus | ''): string {
    if (status === 'not_requested') return 'لم يُطلب بعد';
    if (status === 'under_preparation') return 'قيد الإعداد';
    if (status === 'submitted') return 'مُستلم ومُودع';
    return '—';
}

export const JUVENILE_REMEDIAL_DECISION_OPTIONS: ReadonlyArray<{
    value:
        | 'juvenile_deliver_guardian'
        | 'juvenile_behavioral_surveillance'
        | 'juvenile_reform_boys';
    label: string;
}> = [
    { value: 'juvenile_deliver_guardian', label: 'التسليم للولي أو ضامن بموجب تعهد' },
    { value: 'juvenile_behavioral_surveillance', label: 'مراقبة السلوك' },
    { value: 'juvenile_reform_boys', label: 'الإيداع في مدرسة تأهيل الأحداث' },
] as const;

export const CONFIDENTIAL_SESSION_BADGE = '[🔒 جلسة سرية بحكم القانون]';

/** تسميات عرض حالة المتهم/الحدث — القيم المخزنة تبقى كما هي. */
export const DEFENDANT_STATUS_UI_LABELS: Record<DefendantStatus, string> = {
    حر: 'حر',
    مستقدم: 'مستقدم',
    هارب: 'هارب',
    'ملقى القبض عليه': 'ملقى القبض عليه',
    موقوف: 'موقوف',
    مكفل: 'مكفل',
    bailed_pending_appeal: 'كفالة معلقة (بانتظار الادعاء العام)',
    psychiatric_eval: 'مُودع للفحص العقلي',
    provisional_delivery: 'مسلّم لوليه / لضامنه',
    behavioral_surveillance: 'تحت مراقبة السلوك',
    juvenile_detention: 'موقوف (دار الملاحظة)',
    متوفى: 'متوفى',
    'مشمول بالعفو': 'مشمول بالعفو',
};

const JUVENILE_ONLY_DEFENDANT_STATUSES: readonly DefendantStatus[] = [
    'provisional_delivery',
    'behavioral_surveillance',
    'juvenile_detention',
];

/** الحالات الأساسية الخمس — نص عرض/قيمة واحدة وفق أصول المحاكمات الجزائية. */
export const CORE_DEFENDANT_STATUSES = ['حر', 'مستقدم', 'هارب', 'موقوف', 'مكفل'] as const;
export type CoreDefendantStatus = (typeof CORE_DEFENDANT_STATUSES)[number];

export type DefendantStatusCaseType = 'misdemeanor' | 'felony';
export type DefendantStatusProceduralStage = 'investigation' | 'trial';
export type DefendantStatusSelectOption = { value: DefendantStatus; label: string };

/** خيارات حالة الحدث في التحقيق — قيم التخزين + تسمية قانونية للعرض. */
export const JUVENILE_DEFENDANT_STATUS_SELECT_OPTIONS: readonly DefendantStatusSelectOption[] = [
    { value: 'حر', label: 'حر' },
    { value: 'مستقدم', label: 'مستقدم' },
    { value: 'هارب', label: 'هارب' },
    { value: 'juvenile_detention', label: 'موقوف (دار الملاحظة)' },
    { value: 'provisional_delivery', label: 'مسلّم لوليه / لضامنه' },
] as const;

/** حالات الحدث القابلة للتحويل من حالة البالغ — لا «مكفل» (الحدث لا يُكفَّل). */
const JUVENILE_STATUS_LIST: readonly CoreDefendantStatus[] = ['حر', 'مستقدم', 'هارب', 'موقوف'];
const MISDEMEANOR_INVESTIGATION_ADULT: readonly CoreDefendantStatus[] = ['حر', 'مستقدم', 'هارب', 'موقوف', 'مكفل'];
const TRIAL_OR_FELONY_ADULT: readonly CoreDefendantStatus[] = ['موقوف', 'مكفل', 'هارب'];

export function formatDefendantStatusLabel(status: DefendantStatus | '' | string): string {
    const key = String(status ?? '').trim();
    if (!key) return '—';
    return DEFENDANT_STATUS_UI_LABELS[key as DefendantStatus] ?? key;
}

export function isJuvenileOnlyDefendantStatus(status: string): boolean {
    return (JUVENILE_ONLY_DEFENDANT_STATUSES as readonly string[]).includes(String(status ?? '').trim());
}

/** نوع الجريمة لفرز حالة المتهم (جنحة / جناية). */
export function resolveDefendantStatusCaseType(params: {
    crimeType?: CrimeType | '';
    stage?: string;
}): DefendantStatusCaseType {
    const stage = String(params.stage ?? '').trim();
    if (stage === 'محكمة الجنايات') return 'felony';
    const ct = String(params.crimeType ?? '').trim();
    if (ct === 'جناية') return 'felony';
    return 'misdemeanor';
}

/** المرحلة الإجرائية: تحقيق أو محاكمة. */
export function resolveDefendantStatusProceduralStage(stage: string): DefendantStatusProceduralStage {
    const s = String(stage ?? '').trim();
    if (!s || isInvestigationStoredStage(s)) return 'investigation';
    return 'trial';
}

/** فرز ديناميكي حاسم: caseType + proceduralStage + isJuvenile — نصوص كلمة واحدة. */
export function filterDefendantStatusOptions(params: {
    caseType: DefendantStatusCaseType;
    proceduralStage: DefendantStatusProceduralStage;
    isJuvenile: boolean;
}): CoreDefendantStatus[] {
    const { caseType, proceduralStage, isJuvenile } = params;

    if (isJuvenile) {
        return [];
    }

    if (caseType === 'felony') {
        return [...TRIAL_OR_FELONY_ADULT];
    }

    if (caseType === 'misdemeanor' && proceduralStage === 'investigation') {
        return [...MISDEMEANOR_INVESTIGATION_ADULT];
    }

    return [...TRIAL_OR_FELONY_ADULT];
}

/** تحويل قيم قديمة/موسّعة إلى إحدى الحالات الخمس الأساسية للعرض والاختيار. */
export function coerceDefendantStatusToCore(status: DefendantStatus | '' | string): CoreDefendantStatus | '' {
    const s = String(status ?? '').trim();
    if (!s) return '';
    if ((CORE_DEFENDANT_STATUSES as readonly string[]).includes(s)) return s as CoreDefendantStatus;
    if (s === 'juvenile_detention' || s === 'ملقى القبض عليه') return 'موقوف';
    if (s === 'provisional_delivery' || s === 'behavioral_surveillance' || s === 'bailed_pending_appeal') return 'مكفل';
    return '';
}

/** تسمية عرض مختصرة للحالة — مع تسميات قانونية خاصة بالحدث. */
export function formatDefendantStatusShortLabel(status: DefendantStatus | '' | string): string {
    const key = String(status ?? '').trim();
    if (!key) return '—';
    if (key === 'juvenile_detention') return 'موقوف (دار الملاحظة)';
    if (key === 'provisional_delivery') return 'مسلّم لوليه / لضامنه';
    const core = coerceDefendantStatusToCore(status);
    if (core) return core;
    return formatDefendantStatusLabel(key);
}

export function getJuvenileDefendantStatusSelectOptions(
    currentStatus?: DefendantStatus | '',
): DefendantStatusSelectOption[] {
    const options: DefendantStatusSelectOption[] = JUVENILE_DEFENDANT_STATUS_SELECT_OPTIONS.map((o) => ({
        ...o,
    }));
    let cur = String(currentStatus ?? '').trim() as DefendantStatus;
    if (cur === 'موقوف' || cur === 'ملقى القبض عليه') cur = 'juvenile_detention';
    if (!cur) return options;
    if (options.some((o) => o.value === cur)) return options;
    const label = formatDefendantStatusShortLabel(cur);
    return [{ value: cur, label }, ...options];
}

/** خيارات القائمة المنسدلة — تصفية ثلاثية + تسمية كلمة واحدة. */
export function getDefendantStatusSelectOptions(params: {
    isJuvenile: boolean;
    crimeType?: CrimeType | '';
    stage?: string;
    caseType?: DefendantStatusCaseType;
    proceduralStage?: DefendantStatusProceduralStage;
    currentStatus?: DefendantStatus | '';
}): ReadonlyArray<DefendantStatusSelectOption> {
    if (params.isJuvenile) {
        return getJuvenileDefendantStatusSelectOptions(params.currentStatus);
    }

    const caseType =
        params.caseType ?? resolveDefendantStatusCaseType({ crimeType: params.crimeType, stage: params.stage });
    const proceduralStage =
        params.proceduralStage ?? resolveDefendantStatusProceduralStage(String(params.stage ?? ''));

    const values = filterDefendantStatusOptions({
        caseType,
        proceduralStage,
        isJuvenile: params.isJuvenile,
    });

    const options: DefendantStatusSelectOption[] = values.map((value) => ({
        value: value as DefendantStatus,
        label: value,
    }));

    const curRaw = String(params.currentStatus ?? '').trim() as DefendantStatus;
    const cur = coerceDefendantStatusToCore(curRaw) || curRaw;
    if (cur && !(values as readonly string[]).includes(cur)) {
        const label = coerceDefendantStatusToCore(curRaw) || formatDefendantStatusShortLabel(curRaw);
        return [{ value: cur as DefendantStatus, label }, ...options];
    }

    return options;
}

/** ألوان شارة/زر حالة المتهم — انطباع بصري فوري. */
export function getDefendantStatusButtonClass(status: DefendantStatus | '' | string): string {
    const s = String(status ?? '').trim();
    if (!s) return 'border-slate-600/60 bg-slate-800 text-white/50';
    if (s === 'حر') return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200';
    if (s === 'مكفل' || s === 'provisional_delivery' || s === 'bailed_pending_appeal')
        return 'border-amber-500/40 bg-amber-500/15 text-amber-200';
    if (s === 'موقوف' || s === 'ملقى القبض عليه' || s === 'juvenile_detention' || s === 'psychiatric_eval')
        return 'border-red-500/40 bg-red-500/15 text-red-200';
    if (s === 'هارب' || s === 'مستقدم') return 'border-slate-500/40 bg-slate-600/35 text-slate-300';
    if (s === 'behavioral_surveillance') return 'border-indigo-500/40 bg-indigo-500/15 text-indigo-200';
    if (s === 'متوفى' || s === 'مشمول بالعفو') return 'border-slate-500/40 bg-slate-700/40 text-slate-400';
    return 'border-slate-600/60 bg-slate-800 text-white/80';
}

/** إعادة ضبط الحالة عند تبديل توغل الحدث لتفادي بقاء قيمة غير متوافقة. */
export function normalizeDefendantStatusForJuvenileToggle(
    status: DefendantStatus | '',
    nextIsJuvenile: boolean,
): DefendantStatus | '' {
    const core = coerceDefendantStatusToCore(status);
    const s = String(status ?? '').trim() as DefendantStatus | '';
    if (!s) return '';
    if (nextIsJuvenile) {
        if (
            (JUVENILE_DEFENDANT_STATUS_SELECT_OPTIONS as readonly { value: string }[]).some(
                (o) => o.value === s,
            )
        ) {
            return s;
        }
        if (core && (JUVENILE_STATUS_LIST as readonly string[]).includes(core)) {
            if (core === 'موقوف') return 'juvenile_detention';
            return core as DefendantStatus;
        }
        return '';
    }
    if (!nextIsJuvenile && isJuvenileOnlyDefendantStatus(s)) return 'حر';
    return core ? (core as DefendantStatus) : s;
}
