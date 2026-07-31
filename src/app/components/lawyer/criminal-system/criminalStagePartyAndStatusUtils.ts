

import {
    isInvestigationStoredStage as isInvestigationStoredStageCore,
    isValidCriminalStage as isValidCriminalStageCore,
    mapLegacyJuvenileCourtNameToAdultStage as mapLegacyJuvenileCourtNameToAdultStageCore,
    normalizeLegacyCriminalStage as normalizeLegacyCriminalStageCore,
    shouldUseJuvenileTrialJourneyLabels as shouldUseJuvenileTrialJourneyLabelsCore,
    stageToProceduralKey as stageToProceduralKeyCore,
    isJuvenileOnlyDefendantScope as isJuvenileOnlyDefendantScopeCore,
    isInvestigationReferralCategory,
    isInvestigationCassationAppealCategory,
} from './criminalStageRuntimeCore';
import type {
    CriminalCaseStage,
    CriminalComplainant,
    CriminalDefendant,
    CrimeType,
    DefendantStatus,
} from './criminalCaseModel';
import type { OurRepresentation } from './criminalProceduralPartyUtils';
import {
    OFFICE_REPRESENTATION_OPTIONS,
    COMPLAINANT_PARTY_BADGE,
    DEFENDANT_PARTY_BADGE,
    isPrivateRightWaiverTimelineCategory,
} from './criminalStageUtils';

/** شارة العمود في شبكة الخصوم حسب جهة الطرف (وليس صفة المكتب). */
export function partyColumnBadge(partyKind: 'complainant' | 'defendant'): string {
    return partyKind === 'complainant' ? COMPLAINANT_PARTY_BADGE : DEFENDANT_PARTY_BADGE;
}

export type CriminalActionParty = {
    id: string;
    fullName: string;
    isJuvenile?: boolean;
    isUnderSeven?: boolean;
    source: 'complainant' | 'defendant';
    /** متوفى — يُستبعد من القوائم الإجرائية الحية. */
    isDeceased?: boolean;
    /**
     * ⚖️ ازدواجية الصفة — هذا الطرف داخل دعوى متقابلة (إمّا case-level
     * isMutualComplaint=true، أو complainant ذو isCrossComplaint=true). يَستخدمه
     * المُنسِّق الموحّد لاستبدال «مشتكي:/متهم:» ببادئة موحَّدة تَمنع التَناقض في الواجهة.
     */
    inMutualComplaint?: boolean;
    /** مشتكٍ يُعامَل كمتهم (شكوى متقابلة على مستوى الكيس أو isCrossComplaint شخصياً). */
    isAccusedAsComplainant?: boolean;
};

/** @deprecated استخدم buildAllParties من partyContextFilter — يُبقى للتوافق. */
export function buildConcernedParties(
    complainants: Array<{ id: string; fullName: string; isJuvenile?: boolean; isUnderSeven?: boolean }>,
    defendants: Array<{ id: string; fullName: string; isJuvenile?: boolean; isUnderSeven?: boolean }>,
): CriminalActionParty[] {
    return [
        ...complainants.map((c) => ({
            id: c.id,
            fullName: c.fullName,
            isJuvenile: c.isJuvenile,
            isUnderSeven: c.isUnderSeven,
            source: 'complainant' as const,
            isDeceased: false,
        })),
        ...defendants.map((d) => ({
            id: d.id,
            fullName: d.fullName,
            isJuvenile: d.isJuvenile,
            isUnderSeven: d.isUnderSeven,
            source: 'defendant' as const,
            isDeceased: false,
        })),
    ];
}

/**
 * 🔖 بادئة الصفة الموحَّدة:
 *  - إن كان الطرف داخل شكوى متقابلة (ازدواجية صفة) → بادئة مُحايدة «الطرف:» لمَنع
 *    التَناقض البصري في القوائم (إذ تتداخل صفة المشتكي والمتهم على نفس الشخص).
 *  - وإلا → نَستخدم البادئة الكلاسيكية «مشتكي:» أو «متهم:».
 */
/** ترميز اسم الحدث إلى الأحرف الأولى (مثل: أ. م. ع). */
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

/** تسمية عرض حالة طلب المحامي (القيم المخزنة pending | approved | rejected). */
export function formatLawyerRequestStatusLabel(status: 'pending' | 'approved' | 'rejected' | 'executed'): string {
    if (status === 'executed') return 'قرار نافذ / مُنفَّذ';
    if (status === 'approved') return 'تم القبول (موافقة)';
    if (status === 'rejected') return 'تم الرفض';
    return 'قيد النظر';
}

export type InvestigationLogStatus = 'awaiting_response' | 'response_received' | 'returned_for_revision';

/** تسمية عرض حالة إجراء المتابعة/الدليل. */
export function formatInvestigationLogStatusLabel(status: InvestigationLogStatus): string {
    if (status === 'response_received') return 'ورد التقرير / الجواب';
    if (status === 'returned_for_revision') return 'أُعيد للتعديل';
    return 'بانتظار الإجابة';
}

export function normalizeInvestigationLogStatus(raw: unknown): InvestigationLogStatus {
    const v = String(raw ?? '').trim();
    if (v === 'response_received' || v === 'completed' || v === 'مُنجز' || v.includes('ورد')) return 'response_received';
    if (v === 'returned_for_revision' || v.includes('أُعيد') || v.includes('اعيد')) return 'returned_for_revision';
    if (v === 'awaiting_response' || v === 'pending' || v.includes('انتظار') || v.includes('النظر')) return 'awaiting_response';
    return 'awaiting_response';
}

/** قائمة الأطراف المستهدفة بالإجراءات (توقيف/كفالة/إفادات…) — مدمجة عند الشكوى المتقابلة. */
export function buildCriminalActionParties(
    complainants: Array<{
        id: string;
        fullName: string;
        isJuvenile?: boolean;
        isUnderSeven?: boolean;
        isCrossComplaint?: boolean;
    }>,
    defendants: Array<{ id: string; fullName: string; isJuvenile?: boolean; isUnderSeven?: boolean }>,
    isMutualComplaint: boolean,
): CriminalActionParty[] {
    // ⚖️ المعيار الموحَّد للشكوى المتقابلة: case-level OR per-complainant flag.
    //    أي مشتكٍ يحمل `isCrossComplaint=true` يُعامَل كمتهم حتى لو لم يَكن الكيس بأكمله متقابلاً.
    const accusedComplainants = complainants.filter(
        (c) => isMutualComplaint || c.isCrossComplaint === true,
    );
    /**
     * 🏷️ علم `inMutualComplaint` يُوضَع على كل طرف في الكيس عندما تَكون الشكوى متقابلة
     *    على مستوى الكيس (isMutualComplaint=true)، أو يَحمل المُشتكي شخصياً علم
     *    isCrossComplaint=true — هذا يُتيح للمُنسِّق استبدال «مشتكي:/متهم:» ببادئة موحَّدة.
     */
    const partiesAreDual = isMutualComplaint || accusedComplainants.length > 0;
    if (accusedComplainants.length === 0) {
        return defendants.map((d) => ({
            id: d.id,
            fullName: d.fullName,
            isJuvenile: d.isJuvenile,
            isUnderSeven: d.isUnderSeven,
            source: 'defendant' as const,
            inMutualComplaint: partiesAreDual,
        }));
    }
    return [
        ...accusedComplainants.map((c) => ({
            id: c.id,
            fullName: c.fullName,
            isJuvenile: c.isJuvenile,
            isUnderSeven: c.isUnderSeven,
            source: 'complainant' as const,
            inMutualComplaint: true,
            isAccusedAsComplainant: true,
        })),
        ...defendants.map((d) => ({
            id: d.id,
            fullName: d.fullName,
            isJuvenile: d.isJuvenile,
            isUnderSeven: d.isUnderSeven,
            source: 'defendant' as const,
            inMutualComplaint: true,
        })),
    ];
}

/**
 * هل هذا المشتكي يَكتسب صفة المتهم؟
 *  - إذا كان `caseRecord.isMutualComplaint === true` (شكوى متقابلة على مستوى الكيس)، فكل المشتكين متّهمون.
 *  - أو إذا كان `complainant.isCrossComplaint === true` (تخصيص لمشتكٍ بعينه).
 */
export function isComplainantAlsoAccused(
    complainant: { isCrossComplaint?: boolean },
    caseRecord: { isMutualComplaint?: boolean },
): boolean {
    return complainant.isCrossComplaint === true || caseRecord.isMutualComplaint === true;
}

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
    return isInvestigationStoredStageCore(stage);
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

export function formatCriminalStageOptionLabel(
    opt: (typeof CRIMINAL_PROCEDURAL_STAGES)[number],
    isJuvenile = false,
): string {
    return formatProceduralStageLabel(opt.key, isJuvenile);
}

export function isValidCriminalStage(v: string): v is CriminalCaseStage {
    return isValidCriminalStageCore(v);
}

/** توحيد قيمة المرحلة المخزنة — دون تحويل مسار الأحداث إلى مسار بالغ. */
export function normalizeLegacyCriminalStage(stage: string, _crimeType?: CrimeType | ''): CriminalCaseStage | '' {
    return normalizeLegacyCriminalStageCore(stage, _crimeType);
}

/** تحويل اسم محكمة قديم (عرض/إحالة) إلى مرحلة بالغ — للمحركات التي لا تستخدم «محكمة الأحداث» كمرحلة. */
export function mapLegacyJuvenileCourtNameToAdultStage(
    courtName: string,
    crimeType?: CrimeType | '',
): CriminalCaseStage {
    return mapLegacyJuvenileCourtNameToAdultStageCore(courtName, crimeType);
}

export function stageToProceduralKey(stage: string): CriminalProceduralKey | null {
    return stageToProceduralKeyCore(stage) as CriminalProceduralKey | null;
}

export function hasJuvenileParty(
    defendants: Pick<CriminalDefendant, 'isJuvenile'>[],
    complainants: Pick<CriminalComplainant, 'isJuvenile'>[],
): boolean {
    return defendants.some((d) => d.isJuvenile === true) || complainants.some((c) => c.isJuvenile === true);
}

export function hasJuvenileComplainant(
    complainants: Pick<CriminalComplainant, 'isJuvenile' | 'isUnderSeven'>[],
): boolean {
    return complainants.some((c) => c.isJuvenile === true || c.isUnderSeven === true);
}

export function hasJuvenileAccused(defendants: Pick<CriminalDefendant, 'isJuvenile'>[]): boolean {
    return defendants.some((d) => d.isJuvenile === true);
}

/** كل المتهمين في النطاق (أو الإضبارة) أحداث — للتسميات فقط. */
export function isJuvenileOnlyDefendantScope(
    defendants: Pick<CriminalDefendant, 'id' | 'isJuvenile'>[],
    scopedDefendantIds?: string[],
): boolean {
    return isJuvenileOnlyDefendantScopeCore(defendants, scopedDefendantIds);
}

/** هل تُعرَض عقدة المسار بمحكمة الأحداث بدل الجنح/الجنايات؟ */
export function shouldUseJuvenileTrialJourneyLabels(
    defendants: Pick<CriminalDefendant, 'id' | 'isJuvenile'>[],
    context?: { defendantIds?: string[]; storedStage?: string },
): boolean {
    return shouldUseJuvenileTrialJourneyLabelsCore(defendants, context);
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

/** صفة المكتب في الترويسة — اختيار المحامي عند الإنشاء. */
export function representationRoleBadge(rep: OurRepresentation | ''): string {
    const opt = OFFICE_REPRESENTATION_OPTIONS.find((o) => o.value === rep);
    return opt ? `[${opt.label}]` : '';
}

export function todayIsoDate(): string {
    return new Date().toISOString().slice(0, 10);
}

/** مكان إيداع/توقيف الحدث — قيم تخزينية (لا تغيّر enums المرحلة). */
export type JuvenileDetentionPlacement = 'juvenile_observation' | 'rehabilitation_school';

export type SocialInquiryWorkflowStatus = 'not_requested' | 'under_preparation' | 'submitted';

export const JUVENILE_DETENTION_PLACEMENT_OPTIONS: ReadonlyArray<{
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

export function isDetentionArrestCategory(category: string): boolean {
    const c = String(category ?? '').trim();
    return (
        c === 'إصدار أمر (استقدام / قبض وتحري)' ||
        c === 'إصدار أمر (استقدام / قبض)' ||
        c === 'إصدار أمر قبض/توقيف' ||
        c === 'إصدار أمر قبض/توقيف (من المحكمة)' ||
        c === 'إصدار أمر استقدام'
    );
}

export function resolveInvestigationTimelineEventType(category: string): 'investigation' | 'decision' {
    const c = String(category ?? '').trim();
    if (
        isInvestigationReferralCategory(c) ||
        isInvestigationCassationAppealCategory(c) ||
        isPrivateRightWaiverTimelineCategory(c) ||
        c.startsWith('قرار ')
    ) {
        return 'decision';
    }
    return 'investigation';
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

const ADULT_ONLY_DEFENDANT_STATUSES: readonly DefendantStatus[] = ['حر', 'مستقدم', 'ملقى القبض عليه', 'موقوف'];

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

export function isAdultOnlyDefendantStatus(status: string): boolean {
    return (ADULT_ONLY_DEFENDANT_STATUSES as readonly string[]).includes(String(status ?? '').trim());
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

