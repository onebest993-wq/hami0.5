import type {
    CassationAppealResult,
    DispositiveCassationAppealResult,
    JudicialDecision,
    JudicialDecisionAppeal,
    JudicialDecisionKind,
    ProceduralCassationAppealResult,
} from '@/app/types/criminal';
import type { CriminalCase, CriminalDefendant, DefendantStatus } from './criminalStore';
import { isDetentionRequestTemplate, normalizeProceduralRequestTemplate } from './proceduralRequestTypes';

export const DISPOSITIVE_CASSATION_RESULT_OPTIONS: { value: CassationAppealResult; label: string }[] = [
    { value: 'affirmation', label: 'تصديق' },
    { value: 'quash_remand', label: 'نقض وإعادة' },
    { value: 'quash_dismissal', label: 'نقض (استدراك)' },
    { value: 'quash_modify', label: 'نقض وتعديل الوصف والمادة' },
];

/**
 * خيارات نتيجة التمييز على القرار الإجرائي — مُبسَّطة لاختيارين فقط:
 * - تأييد القرار (`procedural_affirmation`)
 * - نقض القرار (`procedural_annulment`)
 *
 * الخيار القديم `procedural_remand_direction` لا يُعرض في الواجهة بعد الآن،
 * لكن النوع والمنطق التابع له يبقى مُحتفَظاً به لدعم البيانات المُخزَّنة سابقاً.
 */
export const PROCEDURAL_CASSATION_RESULT_OPTIONS: { value: CassationAppealResult; label: string }[] = [
    { value: 'procedural_affirmation', label: 'تأييد القرار' },
    { value: 'procedural_annulment', label: 'نقض القرار' },
];

/**
 * مجموعة كاملة لنتائج التمييز على القرار الإجرائي — تَشمل القيم المخزَّنة سابقاً
 * (مثل `procedural_remand_direction`) لضمان توافق العرض/المنطق مع البيانات القديمة،
 * حتى وإن لم تَعُد قائمة الواجهة تُتيح اختيارها.
 */
const PROCEDURAL_RESULT_SET = new Set<string>([
    'procedural_affirmation',
    'procedural_annulment',
    'procedural_remand_direction',
]);
const DISPOSITIVE_RESULT_SET = new Set<string>(DISPOSITIVE_CASSATION_RESULT_OPTIONS.map((o) => o.value));

export function getCassationResultFormOptions(decisionType: JudicialDecisionKind | undefined): {
    value: CassationAppealResult;
    label: string;
}[] {
    return decisionType === 'dispositive' ? DISPOSITIVE_CASSATION_RESULT_OPTIONS : PROCEDURAL_CASSATION_RESULT_OPTIONS;
}

export function isProceduralCassationResult(result: string | undefined): result is ProceduralCassationAppealResult {
    return PROCEDURAL_RESULT_SET.has(String(result ?? '').trim());
}

export function isDispositiveCassationResult(result: string | undefined): result is DispositiveCassationAppealResult {
    return DISPOSITIVE_RESULT_SET.has(String(result ?? '').trim());
}

export function isArrestOrSummonProceduralDecision(decision: Pick<JudicialDecision, 'title' | 'proceduralTemplate'>): boolean {
    const key = normalizeProceduralRequestTemplate(decision.proceduralTemplate ?? decision.title);
    if (
        key === 'إصدار أمر (استقدام / قبض وتحري)' ||
        key === 'إصدار أمر (استقدام / قبض)' ||
        key === 'إصدار أمر استقدام / قبض'
    ) {
        return true;
    }
    return /استقدام|قبض/.test(key) && !/كفالة|إخلاء/.test(key);
}

function isDetentionProceduralDecision(decision: Pick<JudicialDecision, 'title' | 'proceduralTemplate'>): boolean {
    const key = normalizeProceduralRequestTemplate(decision.proceduralTemplate ?? decision.title);
    return isDetentionRequestTemplate(key) || /توقيف/.test(key);
}

function isBailDenialProceduralDecision(decision: Pick<JudicialDecision, 'title' | 'proceduralTemplate'>): boolean {
    const key = normalizeProceduralRequestTemplate(decision.proceduralTemplate ?? decision.title);
    if (key === 'طلب إخلاء سبيل بكفالة / بتعهد' || key === 'قرار إخلاء سبيل بكفالة / تعهد') return true;
    return /كفالة|إخلاء سبيل/.test(key) && decision.requestOutcomeStatus === 'rejected';
}

function resolveAppellantDefendantIds(
    appeal: Pick<JudicialDecisionAppeal, 'appellantIds' | 'targetDefendantIds'>,
    caseRecord: CriminalCase,
): string[] {
    const fromAppeal = (Array.isArray(appeal.targetDefendantIds) ? appeal.targetDefendantIds : appeal.appellantIds ?? [])
        .map((x) => String(x ?? '').trim())
        .filter(Boolean);
    if (fromAppeal.length) return fromAppeal;
    return (caseRecord.defendants ?? []).map((d) => d.id).filter(Boolean);
}

/** فئات أحداث تُستمد من السجل القضائي — لا تُعرض في تبويب المسار الإجرائي. */
const JUDICIAL_LEDGER_MIRROR_TIMELINE_CATEGORIES = [
    'نتيجة تمييزية — قرار إجرائي',
    'نتيجة تمييزية — إبطال قرار إجرائي',
    'توجيه تمييزي — قرار إجرائي',
    'نتيجة تمييزية على قرار',
] as const;

export function isJudicialLedgerMirrorTimelineCategory(category: string | undefined): boolean {
    const c = String(category ?? '').trim();
    return (JUDICIAL_LEDGER_MIRROR_TIMELINE_CATEGORIES as readonly string[]).includes(c);
}

function releaseDefendant(d: CriminalDefendant): CriminalDefendant {
    const next = { ...d, status: 'حر' as DefendantStatus };
    next.detentionAuthority = '';
    next.detentionExpiryDate = '';
    return next;
}

function releaseDefendantsForAnnulment(caseRecord: CriminalCase, defendantIds: string[]): CriminalCase {
    const idSet = new Set(defendantIds);
    const defendants = (Array.isArray(caseRecord.defendants) ? caseRecord.defendants : []).map((d) =>
        idSet.has(d.id) ? releaseDefendant(d) : d,
    );
    return { ...caseRecord, defendants };
}

function annulArrestSummonStatus(caseRecord: CriminalCase, defendantIds: string[]): CriminalCase {
    const idSet = new Set(defendantIds);
    const defendants = (Array.isArray(caseRecord.defendants) ? caseRecord.defendants : []).map((d) => {
        if (!idSet.has(d.id)) return d;
        const wasArrestRelated =
            d.status === 'مستقدم' || d.status === 'ملقى القبض عليه' || d.status === 'موقوف' || d.status === 'juvenile_detention';
        if (!wasArrestRelated) return d;
        return releaseDefendant(d);
    });
    return { ...caseRecord, defendants };
}

type ProceduralCassationEffectsInput = {
    result: CassationAppealResult;
    cassationDirectives?: string;
    date: string;
};

export function applyProceduralCassationEffects(
    caseRecord: CriminalCase,
    decision: JudicialDecision,
    appeal: JudicialDecisionAppeal,
    input: ProceduralCassationEffectsInput,
): CriminalCase {
    const appellantIds = resolveAppellantDefendantIds(appeal, caseRecord);
    if (input.result === 'procedural_affirmation') {
        return caseRecord;
    }

    if (input.result === 'procedural_annulment') {
        let next = { ...caseRecord };
        if (isBailDenialProceduralDecision(decision)) {
            next = releaseDefendantsForAnnulment(next, appellantIds);
        } else if (isArrestOrSummonProceduralDecision(decision) || isDetentionProceduralDecision(decision)) {
            next = annulArrestSummonStatus(next, appellantIds);
        } else {
            next = releaseDefendantsForAnnulment(next, appellantIds);
        }
        return next;
    }

    if (input.result === 'procedural_remand_direction') {
        return caseRecord;
    }

    return caseRecord;
}

export function buildProceduralCassationBadgeText(
    result: CassationAppealResult,
    decision: Pick<JudicialDecision, 'title'>,
    appeal: Pick<JudicialDecisionAppeal, 'cassationDirectives'>,
): string | null {
    if (result === 'procedural_affirmation') {
        return 'تصديق تمييزي للقرار الإجرائي المطعون فيه — تأييد القرار.';
    }
    if (result === 'procedural_annulment') {
        return `نقض وإبطال تمييزي للقرار الإجرائي: ${decision.title}`;
    }
    if (result === 'procedural_remand_direction') {
        const dir = String(appeal.cassationDirectives ?? '').trim();
        return dir
            ? `نقض تمييزي وإعادة للتوجيه الإجرائي — توجيهات: ${dir}`
            : 'نقض تمييزي وإعادة القرار للتوجيه الإجرائي.';
    }
    return null;
}
