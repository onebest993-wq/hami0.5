import type {
    CassationAppealRemandTarget,
    CassationAppealResult,
    JudicialDecisionAppeal,
    JudicialDecisionKind,
} from '@/app/types/criminal';
import {
    buildProceduralCassationBadgeText,
    DISPOSITIVE_CASSATION_RESULT_OPTIONS,
    isProceduralCassationResult,
    PROCEDURAL_CASSATION_RESULT_OPTIONS,
} from './proceduralCassationResults';

export type CassationResultFormValue = CassationAppealResult;

/** خيارات الحسم الختامي — للتوافق مع الاستيرادات القديمة. */
export const CASSATION_RESULT_FORM_OPTIONS: { value: CassationResultFormValue; label: string }[] = [
    { value: 'affirmation', label: 'تصديق' },
    { value: 'quash_remand', label: 'نقض وإعادة' },
    { value: 'quash_dismissal', label: 'نقض (استدراك)' },
    { value: 'quash_modify', label: 'نقض وتعديل الوصف والمادة' },
];

export { getCassationResultFormOptions } from './proceduralCassationResults';

/** كل خيارات النتيجة — للاختيار اليدوي الحر في المودال. */
export const ALL_CASSATION_RESULT_FORM_OPTIONS: { value: CassationResultFormValue; label: string }[] = [
    ...DISPOSITIVE_CASSATION_RESULT_OPTIONS,
    ...PROCEDURAL_CASSATION_RESULT_OPTIONS,
];

export const REMAND_COURT_OPTIONS: { value: CassationAppealRemandTarget; label: string }[] = [
    { value: 'investigation', label: 'مكتب التحقيق' },
    { value: 'misdemeanor', label: 'محكمة الجنح' },
    { value: 'felony', label: 'محكمة الجنايات' },
];

const LEGACY_RESULT_MAP: Record<string, CassationAppealResult> = {
    confirm: 'affirmation',
    affirmation: 'affirmation',
    quash: 'quash_dismissal',
    quash_dismissal: 'quash_dismissal',
    quash_remand: 'quash_remand',
    quash_modify: 'quash_modify',
    quash_modify_legal: 'quash_modify',
    procedural_affirmation: 'procedural_affirmation',
    procedural_annulment: 'procedural_annulment',
    procedural_remand_direction: 'procedural_remand_direction',
};

export function normalizeCassationAppealResult(raw: string | undefined): CassationAppealResult | '' {
    const key = String(raw ?? '').trim();
    if (!key) return '';
    return LEGACY_RESULT_MAP[key] ?? (key as CassationAppealResult);
}

export function remandCourtLabel(stage: CassationAppealRemandTarget | undefined): string {
    if (stage === 'investigation') return 'مكتب التحقيق';
    if (stage === 'felony') return 'محكمة الجنايات';
    if (stage === 'misdemeanor') return 'محكمة الجنح';
    return '—';
}

export type RecordJudicialCassationResultPayload = {
    result: CassationAppealResult;
    isObjectiveGrounds: boolean;
    targetDefendantIds?: string[];
    remandTargetStage?: CassationAppealRemandTarget;
    modifiedCharge?: string;
    modifiedArticle?: string;
    date?: string;
    details?: string;
    cassationDirectives?: string;
};

export function validateJudicialCassationResultForm(
    payload: Partial<RecordJudicialCassationResultPayload>,
    _partyIds?: string[],
    decisionType?: JudicialDecisionKind,
): string | null {
    if (!payload.result) return 'اختر نتيجة الطعن التمييزي.';
    if (decisionType === 'preparatory' && !isProceduralCassationResult(payload.result)) {
        return 'نتيجة غير متوافقة مع قرار إجرائي تحقيقي.';
    }
    if (decisionType === 'dispositive' && isProceduralCassationResult(payload.result)) {
        return 'هذه النتيجة مخصّصة للقرارات الإجرائية التحقيقية فقط.';
    }
    if (payload.result === 'procedural_remand_direction' && !String(payload.cassationDirectives ?? '').trim()) {
        return 'أدخل توجيهات محكمة التمييز بشأن إعادة التوجيه الإجرائي.';
    }
    return null;
}

/** شارة السجل الزمني تحت القرار المطعون فيه. */
export function buildCassationHistoricalBadge(
    appeal: Pick<
        JudicialDecisionAppeal,
        | 'result'
        | 'beneficiaryIds'
        | 'isObjectiveGrounds269b'
        | 'remandTargetStage'
        | 'modifiedCharge'
        | 'modifiedArticle'
        | 'cassationDirectives'
    >,
    partyLabelById: (id: string) => string,
    decisionTitle = 'القرار المطعون فيه',
): string | null {
    const result = normalizeCassationAppealResult(
        typeof appeal.result === 'string' ? appeal.result : undefined,
    );
    if (!result) return null;

    if (isProceduralCassationResult(result)) {
        return buildProceduralCassationBadgeText(result, { title: decisionTitle }, appeal);
    }

    const shared269 = appeal.isObjectiveGrounds269b === true;
    const suffix269 = shared269 ? ' بموجب المادة 269/ب أصولية' : '';

    if (result === 'affirmation') {
        return 'تصديق تمييزي للقرار المطعون فيه — تثبيت الحكم.';
    }

    if (result === 'quash_remand') {
        const court = remandCourtLabel(appeal.remandTargetStage);
        return `نقض تمييزي للقرار وإعادة الملف إلى ${court}${suffix269}.`;
    }

    if (result === 'quash_modify') {
        const charge = String(appeal.modifiedCharge ?? '').trim();
        const article = String(appeal.modifiedArticle ?? '').trim();
        const parts = [charge, article].filter(Boolean).join(' • ');
        return `نقض تمييزي للقرار وتعديل الوصف/المادة${parts ? `: ${parts}` : ''}${suffix269}.`;
    }

    const ids = Array.isArray(appeal.beneficiaryIds) ? appeal.beneficiaryIds : [];
    const names = ids.map(partyLabelById).filter((n) => n && n !== '—');
    const label = names.length ? names.join('، ') : '—';
    return `نقض تمييزي للقرار وإفراج نهائي عن: ${label}${suffix269}.`;
}

export function cassationBadgeTone(result: CassationAppealResult | ''): string {
    if (result === 'affirmation' || result === 'procedural_affirmation') {
        return 'border-emerald-500/55 bg-gradient-to-r from-emerald-950/55 to-slate-900/40 text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.2)]';
    }
    if (result === 'quash_remand' || result === 'procedural_remand_direction') {
        return 'border-amber-500/50 bg-gradient-to-r from-amber-950/45 to-slate-900/40 text-amber-100';
    }
    if (result === 'quash_modify') {
        return 'border-violet-500/50 bg-gradient-to-r from-violet-950/50 to-slate-900/40 text-violet-100';
    }
    return 'border-rose-500/55 bg-gradient-to-r from-rose-950/50 to-violet-950/35 text-rose-50 shadow-[0_0_14px_rgba(244,63,94,0.18)]';
}

/**
 * شارة نتيجة التمييز المُختصرة — نص قصير يَظهر بجوار عنوان القرار،
 * مع نمط ألوان مُصغّر مُتناسب مع `cassationBadgeTone`.
 */
export function formatCassationResultShortLabel(result: CassationAppealResult | ''): string {
    if (result === 'affirmation') return 'تصديق';
    if (result === 'procedural_affirmation') return 'تأييد القرار';
    if (result === 'quash_remand') return 'نقض وإعادة';
    if (result === 'procedural_remand_direction') return 'نقض وإعادة';
    if (result === 'quash_modify') return 'نقض وتعديل';
    if (result === 'quash_dismissal') return 'نقض (إفراج)';
    if (result === 'procedural_annulment') return 'نقض القرار';
    return '';
}

/** نمط مُصغّر لشارة النتيجة بجوار العنوان — نَفس فلسفة الألوان لكن بكثافة أخف. */
export function cassationResultMarkClass(result: CassationAppealResult | ''): string {
    if (result === 'affirmation' || result === 'procedural_affirmation') {
        return 'border-emerald-500/50 bg-emerald-500/12 text-emerald-100';
    }
    if (result === 'quash_remand' || result === 'procedural_remand_direction') {
        return 'border-amber-500/50 bg-amber-500/12 text-amber-100';
    }
    if (result === 'quash_modify') {
        return 'border-violet-500/50 bg-violet-500/12 text-violet-100';
    }
    return 'border-rose-500/55 bg-rose-500/12 text-rose-100';
}
