import type {
    CriminalCaseStage,
    CriminalComplainant,
    CriminalDefendant,
    CrimeType,
} from './criminalCaseModel';

/** المسار الإجرائي — القيم المخزنة ثابتة؛ التسميات المرئية تُشتق عبر formatProceduralStageLabel. */
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

/** خيارا مرحلة الدعوى فقط عندما يكون كل المتهمين أحداثاً. */
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

const JUVENILE_MERGED_STAGE_LABELS: Record<CriminalProceduralKey, string> = {
    ...BASE_PROCEDURAL_STAGE_LABELS,
};

/** مرحلة تحقيق (عامة أو أحداث) — للتحقق من حقول الموقع والتسميات. */
export function isInvestigationStoredStage(stage: string): boolean {
    return stage === 'مرحلة التحقيق' || stage === 'تحقيق الأحداث';
}

export function isJuvenileExclusiveStoredStage(stage: string): boolean {
    return JUVENILE_EXCLUSIVE_STAGE_VALUES.has(String(stage ?? '').trim());
}

/** مراحل نموذج الإضبارة الجديدة — حسب تركيب المتهمين (بالغ/حدث). */
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

export function isStageAllowedForNewCasePartyMix(
    stage: string,
    partyMix: 'adults_only' | 'juveniles_only' | 'mixed',
): boolean {
    const raw = String(stage ?? '').trim();
    if (!raw) return true;
    if (partyMix === 'juveniles_only') return JUVENILE_EXCLUSIVE_STAGE_VALUES.has(raw);
    return ADULT_FORM_STAGE_VALUES.has(raw);
}

/** تسمية مرحلة للعرض فقط — لا تغيّر قيمة الـ enum المخزنة. */
export function formatProceduralStageLabel(key: CriminalProceduralKey, isJuvenile = false): string {
    return isJuvenile ? JUVENILE_MERGED_STAGE_LABELS[key] : BASE_PROCEDURAL_STAGE_LABELS[key];
}

/** تسمية مرحلة من قيمة المخزن (مثل «محكمة الجنح»). */
export function formatCriminalStageLabel(stage: string, isJuvenile = false): string {
    const key = stageToProceduralKey(stage);
    if (!key) return String(stage ?? '').trim() || '—';
    return formatProceduralStageLabel(key, isJuvenile);
}

export function isValidCriminalStage(v: string): v is CriminalCaseStage {
    return (
        v === 'مرحلة التحقيق' ||
        v === 'تحقيق الأحداث' ||
        v === 'محكمة الأحداث' ||
        v === 'محكمة الجنح' ||
        v === 'محكمة الجنايات' ||
        v === 'cassation_court'
    );
}

/** توحيد قيمة المرحلة المخزنة — دون تحويل مسار الأحداث إلى مسار بالغ. */
export function normalizeLegacyCriminalStage(stage: string, _crimeType?: CrimeType | ''): CriminalCaseStage | '' {
    const raw = String(stage ?? '').trim();
    if (!raw) return '';
    return isValidCriminalStage(raw) ? raw : '';
}

/** تحويل اسم محكمة قديم (عرض/إحالة) إلى مرحلة بالغ — للمحركات التي لا تستخدم «محكمة الأحداث» كمرحلة. */
export function mapLegacyJuvenileCourtNameToAdultStage(
    courtName: string,
    crimeType?: CrimeType | '',
): CriminalCaseStage {
    const raw = String(courtName ?? '').trim();
    if (raw !== 'محكمة الأحداث') return 'محكمة الجنح';
    return crimeType === 'جناية' ? 'محكمة الجنايات' : 'محكمة الجنح';
}

export function stageToProceduralKey(stage: string): CriminalProceduralKey | null {
    if (stage === 'مرحلة التحقيق') return 'investigation';
    if (stage === 'تحقيق الأحداث') return 'juvenile_investigation';
    if (stage === 'محكمة الأحداث') return 'juvenile_trial';
    if (stage === 'محكمة الجنح') return 'misdemeanor';
    if (stage === 'محكمة الجنايات') return 'felony';
    if (stage === 'cassation_court') return 'cassation';
    return null;
}

export function hasJuvenileParty(
    defendants: Pick<CriminalDefendant, 'isJuvenile'>[],
    complainants: Pick<CriminalComplainant, 'isJuvenile'>[],
): boolean {
    return defendants.some((d) => d.isJuvenile === true) || complainants.some((c) => c.isJuvenile === true);
}

export function hasJuvenileAccused(defendants: Pick<CriminalDefendant, 'isJuvenile'>[]): boolean {
    return defendants.some((d) => d.isJuvenile === true);
}

/** كل المتهمين في النطاق (أو الإضبارة) أحداث — للتسميات فقط. */
export function isJuvenileOnlyDefendantScope(
    defendants: Pick<CriminalDefendant, 'id' | 'isJuvenile'>[],
    scopedDefendantIds?: string[],
): boolean {
    const ids = (scopedDefendantIds ?? []).map((x) => String(x ?? '').trim()).filter(Boolean);
    const pool = ids.length ? defendants.filter((d) => ids.includes(d.id)) : defendants;
    return pool.length > 0 && pool.every((d) => d.isJuvenile === true);
}

/** هل تُعرَض عقدة المسار بمحكمة الأحداث بدل الجنح/الجنايات؟ */
export function shouldUseJuvenileTrialJourneyLabels(
    defendants: Pick<CriminalDefendant, 'id' | 'isJuvenile'>[],
    context?: { defendantIds?: string[]; storedStage?: string },
): boolean {
    const stored = String(context?.storedStage ?? '').trim();
    if (stored === 'محكمة الأحداث') return true;
    return isJuvenileOnlyDefendantScope(defendants, context?.defendantIds);
}

export type CourtDisplayContext = {
    hasJuvenileDefendant?: boolean;
    storedCourtName?: string;
};

export type InvestigationDepositLocationFields = {
    investigationPapersAt?: string;
    policeStationName?: string;
    investigationOfficeName?: string;
    investigationCourtName?: string;
};

/** مكان إيداع أوراق التحقيق: [نوع الجهة + اسم الجهة] — مثال: مركز شرطة الجمهوري */
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

/** ترويسة محكمة الموضوع — صنف المحكمة + الاسم الفعلي (رقم الدعوى في سطر منفصل). */
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

/** اسم المحكمة/المسار المعروض في الترويسة — عرض فقط؛ القيمة المخزنة للمرحلة لا تتغير. */
export function resolveCourtDisplayName(stage: string, ctx: CourtDisplayContext = {}): string {
    const stored = String(ctx.storedCourtName ?? '').trim();
    if (stored) return stored;

    const key = stageToProceduralKey(stage);
    if (key) {
        if (ctx.hasJuvenileDefendant) {
            return formatProceduralStageLabel(key, true);
        }
        return BASE_PROCEDURAL_STAGE_LABELS[key];
    }

    return String(stage ?? '').trim() || '—';
}

export function resolveStageListLabel(stage: string, hasJuvenileDefendant: boolean): string {
    return formatCriminalStageLabel(stage, hasJuvenileDefendant);
}

export function isJuvenileTrialStage(stage: string, defendants: Pick<CriminalDefendant, 'isJuvenile'>[]): boolean {
    return (stage === 'محكمة الجنح' || stage === 'محكمة الجنايات') && hasJuvenileAccused(defendants);
}

export function isReferralTrialStage(v: string): v is 'محكمة الجنح' | 'محكمة الجنايات' {
    return v === 'محكمة الجنح' || v === 'محكمة الجنايات';
}

export function todayIsoDate(): string {
    return new Date().toISOString().slice(0, 10);
}
