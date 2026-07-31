import type { CriminalCaseStage, CriminalComplainant, CriminalDefendant, CrimeType, DefendantStatus } from './criminalCaseModel';
import { isInvestigationStoredStage, stageToProceduralKey } from './criminalStageRuntimeCore';

export const INVESTIGATION_TIMELINE_OTHER_CATEGORY = 'إجراء مخصص (إدخال يدوي)';
export const INVESTIGATION_AFFIDAVIT_TIMELINE_CATEGORY = 'تدوين إفادة (مشتكي / شاهد)';
export const LEGACY_MERGED_STATEMENTS_TIMELINE_CATEGORY = 'تدوين أقوال (مشتكي/شاهد/متهم)';

export type CriminalActionParty = {
    id: string;
    fullName: string;
    isJuvenile?: boolean;
    isUnderSeven?: boolean;
    source: 'complainant' | 'defendant';
    isDeceased?: boolean;
    inMutualComplaint?: boolean;
    isAccusedAsComplainant?: boolean;
};

export const CRIMINAL_PROCEDURAL_STAGES = [
    { value: 'مرحلة التحقيق' as const, key: 'investigation', label: 'مرحلة التحقيق' },
    { value: 'تحقيق الأحداث' as const, key: 'juvenile_investigation', label: 'تحقيق - أحداث' },
    { value: 'محكمة الأحداث' as const, key: 'juvenile_trial', label: 'محكمة - أحداث' },
    { value: 'محكمة الجنح' as const, key: 'misdemeanor', label: 'محكمة الجنح' },
    { value: 'محكمة الجنايات' as const, key: 'felony', label: 'محكمة الجنايات' },
    {
        value: 'cassation_court' as const,
        key: 'cassation',
        label: 'محكمة التمييز / الاستئناف بصفتها التمييزية',
    },
] as const;

export const JUVENILE_EXCLUSIVE_FORM_STAGE_OPTIONS = [
    { value: 'تحقيق الأحداث' as const, label: 'تحقيق - أحداث' },
    { value: 'محكمة الأحداث' as const, label: 'محكمة - أحداث' },
] as const;

const JUVENILE_EXCLUSIVE_STAGE_VALUES = new Set<string>(
    JUVENILE_EXCLUSIVE_FORM_STAGE_OPTIONS.map((o) => o.value),
);

const ADULT_FORM_STAGE_VALUES = new Set<string>(
    CRIMINAL_PROCEDURAL_STAGES.filter(
        (opt) => opt.key !== 'juvenile_investigation' && opt.key !== 'juvenile_trial',
    ).map((opt) => opt.value),
);

export type CriminalProceduralKey = (typeof CRIMINAL_PROCEDURAL_STAGES)[number]['key'];

const BASE_PROCEDURAL_STAGE_LABELS: Record<CriminalProceduralKey, string> = {
    investigation: 'مرحلة التحقيق',
    juvenile_investigation: 'تحقيق - أحداث',
    juvenile_trial: 'محكمة - أحداث',
    misdemeanor: 'محكمة الجنح',
    felony: 'محكمة الجنايات',
    cassation: 'محكمة التمييز / الاستئناف بصفتها التمييزية',
};

export type JuvenileDetentionPlacement = 'juvenile_observation' | 'rehabilitation_school';
type SocialInquiryWorkflowStatus = 'not_requested' | 'under_preparation' | 'submitted';
export const CONFIDENTIAL_SESSION_BADGE = '[🔒 جلسة سرية بحكم القانون]';

export function hasJuvenileParty(
    defendants: Pick<CriminalDefendant, 'isJuvenile'>[],
    complainants: Pick<CriminalComplainant, 'isJuvenile'>[],
): boolean {
    return defendants.some((d) => d.isJuvenile === true) || complainants.some((c) => c.isJuvenile === true);
}

export function hasJuvenileAccused(defendants: Pick<CriminalDefendant, 'isJuvenile'>[]): boolean {
    return defendants.some((d) => d.isJuvenile === true);
}

export function isJuvenileTrialStage(stage: string, defendants: Pick<CriminalDefendant, 'isJuvenile'>[]): boolean {
    return (stage === 'محكمة الجنح' || stage === 'محكمة الجنايات') && hasJuvenileAccused(defendants);
}

export function isReferralTrialStage(v: string): v is 'محكمة الجنح' | 'محكمة الجنايات' {
    return v === 'محكمة الجنح' || v === 'محكمة الجنايات';
}

export function normalizeTimelineCategoryForDisplay(category: string): string {
    const c = String(category ?? '').trim();
    if (!c) return '';
    if (
        c === LEGACY_MERGED_STATEMENTS_TIMELINE_CATEGORY ||
        c === 'تدوين أقوال (مشتكي / شاهد / متهم)' ||
        (/تدوين\s+أقوال/i.test(c) && /مشتكي/i.test(c) && /متهم/i.test(c))
    ) {
        return INVESTIGATION_AFFIDAVIT_TIMELINE_CATEGORY;
    }
    if (c === 'تدوين إفادة (مشتكي / مخبر / شاهد)') return INVESTIGATION_AFFIDAVIT_TIMELINE_CATEGORY;
    if (c === 'قرار إخلاء سبيل (بكفالة / بتعهد)') return 'طلب إخلاء سبيل بكفالة / بتعهد';
    if (c === 'قرار إخلاء سبيل بكفالة / بتعهد') return 'طلب إخلاء سبيل بكفالة / بتعهد';
    if (c === 'مخاطبة جهة رسمية / خبراء / أدلة جنائية') return 'مخاطبة مراجع رسمية';
    if (c === 'ورود تقرير رسمي / طبي / كشف المخطط') return 'ورود تقارير رسمية';
    if (c === 'إجراء آخر (إدخال يدوي)') return INVESTIGATION_TIMELINE_OTHER_CATEGORY;
    return c;
}

export function formatTimelineCategoryDisplayLabel(category: string): string {
    const normalized = normalizeTimelineCategoryForDisplay(category);
    return normalized || 'غير مصنف';
}

export function isInvalidTimelineTitlePlaceholder(title: string): boolean {
    const t = String(title ?? '').trim();
    if (!t) return true;
    if (/^[!؟?.\-_\s]+$/.test(t)) return true;
    if (/^f+$/i.test(t)) return true;
    if (/^[a-z0-9]{1,4}$/i.test(t) && !/[اأإآبتثجحخدذرزسشصضطظعغفقكلمنهوي]/i.test(t)) return true;
    return false;
}

export function resolveTimelineEventTitle(category: string, manualTitle?: string): string {
    const cat = String(category ?? '').trim();
    const manual = String(manualTitle ?? '').trim();
    if (cat === INVESTIGATION_TIMELINE_OTHER_CATEGORY || cat === 'إجراء آخر (إدخال يدوي)') {
        return manual || INVESTIGATION_TIMELINE_OTHER_CATEGORY;
    }
    if (manual && !isInvalidTimelineTitlePlaceholder(manual)) return manual;
    return cat || '—';
}

export function formatLawyerRequestStatusLabel(status: 'pending' | 'approved' | 'rejected' | 'executed'): string {
    if (status === 'executed') return 'قرار نافذ / مُنفَّذ';
    if (status === 'approved') return 'تم القبول (موافقة)';
    if (status === 'rejected') return 'تم الرفض';
    return 'قيد النظر';
}

export function anonymizeJuvenilePartyName(fullName: string): string {
    const parts = String(fullName ?? '')
        .trim()
        .split(/\s+/)
        .filter((p) => p.length > 0);
    if (!parts.length) return '—';
    return parts.map((p) => `${p.charAt(0)}.`).join(' ');
}

export function displayPartyNameForCase(
    fullName: string,
    options: { isJuvenile?: boolean; isConfidential?: boolean; forExportOrPrint?: boolean },
): string {
    const raw = String(fullName ?? '').trim() || '—';
    if (raw.startsWith('مشكو منه مجهول') || raw.startsWith('حدث مجهول')) return raw;
    if (!options.isJuvenile) return raw;
    if (options.isConfidential || options.forExportOrPrint) {
        return anonymizeJuvenilePartyName(raw);
    }
    return raw;
}

export function formatConcernedPartyLabel(
    party: CriminalActionParty,
    opts?: { anonymizeJuvenile?: boolean },
): string {
    const name = displayPartyNameForCase(String(party.fullName ?? '').trim() || '—', {
        isJuvenile: Boolean(party.isJuvenile),
        isConfidential: opts?.anonymizeJuvenile === true,
        forExportOrPrint: opts?.anonymizeJuvenile === true,
    });
    if (party.inMutualComplaint) {
        const prefix = party.isUnderSeven ? 'الطرف-صغير' : party.isJuvenile ? 'الطرف-حدث' : 'الطرف';
        return `${prefix}: ${name}`;
    }
    if (party.source === 'complainant') {
        if (party.isUnderSeven) return `مشتكي/مجني عليه-صغير: ${name}`;
        return party.isJuvenile ? `مشتكي/مجني عليه-حدث: ${name}` : `مشتكي: ${name}`;
    }
    if (party.isUnderSeven) return `مشكو منه/متهم-صغير: ${name}`;
    return party.isJuvenile ? `مشكو منه/متهم-حدث: ${name}` : `متهم: ${name}`;
}

export function resolveNewCaseStageSelectOptions(
    partyMix: 'adults_only' | 'juveniles_only' | 'mixed',
): ReadonlyArray<{ value: CriminalCaseStage; label: string }> {
    if (partyMix === 'juveniles_only') {
        return JUVENILE_EXCLUSIVE_FORM_STAGE_OPTIONS;
    }
    return CRIMINAL_PROCEDURAL_STAGES.filter(
        (opt) => opt.key !== 'juvenile_investigation' && opt.key !== 'juvenile_trial',
    ).map((opt) => ({
        value: opt.value,
        label: BASE_PROCEDURAL_STAGE_LABELS[opt.key],
    }));
}

export function isJuvenileExclusiveStoredStage(stage: string): boolean {
    return JUVENILE_EXCLUSIVE_STAGE_VALUES.has(String(stage ?? '').trim());
}

export function isStageAllowedForNewCasePartyMix(
    stage: string,
    partyMix: 'adults_only' | 'juveniles_only' | 'mixed',
): boolean {
    const raw = String(stage ?? '').trim();
    if (!raw) return true;
    if (partyMix === 'juveniles_only') return JUVENILE_EXCLUSIVE_STAGE_VALUES.has(raw);
    return ADULT_FORM_STAGE_VALUES.has(raw);
}

export function formatProceduralStageLabel(key: CriminalProceduralKey, isJuvenile = false): string {
    if (isJuvenile && (key === 'misdemeanor' || key === 'felony')) return 'محكمة - أحداث';
    return BASE_PROCEDURAL_STAGE_LABELS[key];
}

export function formatCriminalStageLabel(stage: string, isJuvenile = false): string {
    const key = stageToProceduralKey(stage);
    if (!key) return String(stage ?? '').trim() || '—';
    return formatProceduralStageLabel(key, isJuvenile);
}

export type CourtDisplayContext = {
    hasJuvenileDefendant?: boolean;
    storedCourtName?: string;
};

export function resolveCourtDisplayName(stage: string, ctx: CourtDisplayContext = {}): string {
    const stored = String(ctx.storedCourtName ?? '').trim();
    if (stored) return stored;
    const key = stageToProceduralKey(stage);
    if (key) {
        if (ctx.hasJuvenileDefendant) return formatProceduralStageLabel(key, true);
        return BASE_PROCEDURAL_STAGE_LABELS[key];
    }
    return String(stage ?? '').trim() || '—';
}

export type InvestigationDepositLocationFields = {
    investigationPapersAt?: string;
    policeStationName?: string;
    investigationOfficeName?: string;
    investigationCourtName?: string;
};

export function formatInvestigationDepositLocation(loc: InvestigationDepositLocationFields): string {
    const papersAt = String(loc.investigationPapersAt ?? '').trim();
    const name =
        papersAt === 'مركز شرطة'
            ? String(loc.policeStationName ?? '').trim()
            : papersAt === 'مكتب تحقيق قضائي'
              ? String(loc.investigationOfficeName ?? '').trim()
              : String(loc.investigationCourtName ?? '').trim();
    if (papersAt && name) {
        if (name.startsWith(papersAt) || name.includes(papersAt)) return name;
        return `${papersAt} ${name}`;
    }
    return name || papersAt || '';
}

export type TrialCourtHeaderFields = {
    courtName?: string;
    courtCaseNumber?: string;
    caseNumber?: string;
};

export function formatTrialCourtHeaderPrimary(
    caseStage: 'misdemeanor' | 'felony',
    loc: TrialCourtHeaderFields,
): string {
    const courtName = String(loc.courtName ?? '').trim();
    const stageLabel = caseStage === 'felony' ? 'محكمة الجنايات' : 'محكمة الجنح';
    if (!courtName) return stageLabel;
    const nameAlreadyIncludesStage =
        caseStage === 'felony'
            ? /جنايات|جناية/.test(courtName)
            : /جنح|جنحة/.test(courtName);
    if (nameAlreadyIncludesStage) return courtName;
    return `${stageLabel} — ${courtName}`;
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

export const CORE_DEFENDANT_STATUSES = ['حر', 'مستقدم', 'هارب', 'موقوف', 'مكفل'] as const;
export type CoreDefendantStatus = (typeof CORE_DEFENDANT_STATUSES)[number];
export type DefendantStatusCaseType = 'misdemeanor' | 'felony';
export type DefendantStatusProceduralStage = 'investigation' | 'trial';
export type DefendantStatusSelectOption = { value: DefendantStatus; label: string };

export const JUVENILE_DEFENDANT_STATUS_SELECT_OPTIONS: readonly DefendantStatusSelectOption[] = [
    { value: 'حر', label: 'حر' },
    { value: 'مستقدم', label: 'مستقدم' },
    { value: 'هارب', label: 'هارب' },
    { value: 'juvenile_detention', label: 'موقوف (دار الملاحظة)' },
    { value: 'provisional_delivery', label: 'مسلّم لوليه / لضامنه' },
] as const;

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

export function resolveDefendantStatusProceduralStage(stage: string): DefendantStatusProceduralStage {
    const s = String(stage ?? '').trim();
    if (!s || isInvestigationStoredStage(s)) return 'investigation';
    return 'trial';
}

export function filterDefendantStatusOptions(params: {
    caseType: DefendantStatusCaseType;
    proceduralStage: DefendantStatusProceduralStage;
    isJuvenile: boolean;
}): CoreDefendantStatus[] {
    const { caseType, proceduralStage, isJuvenile } = params;
    if (isJuvenile) return [];
    if (caseType === 'felony') return [...TRIAL_OR_FELONY_ADULT];
    if (caseType === 'misdemeanor' && proceduralStage === 'investigation') {
        return [...MISDEMEANOR_INVESTIGATION_ADULT];
    }
    return [...TRIAL_OR_FELONY_ADULT];
}

export function coerceDefendantStatusToCore(status: DefendantStatus | '' | string): CoreDefendantStatus | '' {
    const s = String(status ?? '').trim();
    if (!s) return '';
    if ((CORE_DEFENDANT_STATUSES as readonly string[]).includes(s)) return s as CoreDefendantStatus;
    if (s === 'juvenile_detention' || s === 'ملقى القبض عليه') return 'موقوف';
    if (s === 'provisional_delivery' || s === 'behavioral_surveillance' || s === 'bailed_pending_appeal') {
        return 'مكفل';
    }
    return '';
}

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
    const options: DefendantStatusSelectOption[] = JUVENILE_DEFENDANT_STATUS_SELECT_OPTIONS.map((o) => ({ ...o }));
    let cur = String(currentStatus ?? '').trim() as DefendantStatus;
    if (cur === 'موقوف' || cur === 'ملقى القبض عليه') cur = 'juvenile_detention';
    if (!cur) return options;
    if (options.some((o) => o.value === cur)) return options;
    const label = formatDefendantStatusShortLabel(cur);
    return [{ value: cur, label }, ...options];
}

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
    let options: DefendantStatusSelectOption[] = values.map((value) => ({
        value: value as DefendantStatus,
        label: value,
    }));
    const curRaw = String(params.currentStatus ?? '').trim() as DefendantStatus;
    const cur = coerceDefendantStatusToCore(curRaw) || curRaw;
    if (cur && !(values as readonly string[]).includes(cur)) {
        const label = coerceDefendantStatusToCore(curRaw) || formatDefendantStatusShortLabel(curRaw);
        options = [{ value: cur as DefendantStatus, label }, ...options];
    }
    // تكفيل يظهر فقط إن كان المتهم موقوفاً حالياً، أو مكفلاً أصلاً (للإبقاء على الخيار)
    const allowBailStatus =
        cur === 'مكفل' ||
        cur === 'provisional_delivery' ||
        cur === 'bailed_pending_appeal' ||
        cur === 'موقوف' ||
        cur === 'ملقى القبض عليه' ||
        cur === 'juvenile_detention' ||
        cur === 'psychiatric_eval';
    if (!allowBailStatus) {
        options = options.filter((o) => o.value !== 'مكفل');
    }
    return options;
}

export function getDefendantStatusButtonClass(status: DefendantStatus | '' | string): string {
    const s = String(status ?? '').trim();
    if (!s) return 'border-slate-600/60 bg-slate-800 text-white/50';
    if (s === 'حر') return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200';
    if (s === 'مكفل' || s === 'provisional_delivery' || s === 'bailed_pending_appeal') {
        return 'border-amber-500/40 bg-amber-500/15 text-amber-200';
    }
    if (s === 'موقوف' || s === 'ملقى القبض عليه' || s === 'juvenile_detention' || s === 'psychiatric_eval') {
        return 'border-red-500/40 bg-red-500/15 text-red-200';
    }
    if (s === 'هارب' || s === 'مستقدم') return 'border-slate-500/40 bg-slate-600/35 text-slate-300';
    if (s === 'behavioral_surveillance') return 'border-indigo-500/40 bg-indigo-500/15 text-indigo-200';
    if (s === 'متوفى' || s === 'مشمول بالعفو') return 'border-slate-500/40 bg-slate-700/40 text-slate-400';
    return 'border-slate-600/60 bg-slate-800 text-white/80';
}

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
