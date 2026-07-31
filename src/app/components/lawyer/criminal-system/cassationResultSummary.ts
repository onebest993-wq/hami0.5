import type {
    CassationAppealRemandTarget,
    CassationAppealResult,
    JudicialDecisionAppeal,
} from '@/app/types/criminal';
import {
    buildProceduralCassationBadgeText,
    isProceduralCassationResult,
} from './proceduralCassationResults';

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

export function normalizeCassationAppealResultLite(
    raw: string | undefined,
): CassationAppealResult | '' {
    const key = String(raw ?? '').trim();
    if (!key) return '';
    return LEGACY_RESULT_MAP[key] ?? (key as CassationAppealResult);
}

export function remandCourtLabelLite(stage: CassationAppealRemandTarget | undefined): string {
    if (stage === 'investigation') return 'مكتب التحقيق';
    if (stage === 'felony') return 'محكمة الجنايات';
    if (stage === 'misdemeanor') return 'محكمة الجنح';
    return '—';
}

export function formatCassationResultShortLabelLite(result: CassationAppealResult | ''): string {
    if (result === 'affirmation') return 'تصديق';
    if (result === 'procedural_affirmation') return 'تأييد القرار';
    if (result === 'quash_remand') return 'نقض وإعادة';
    if (result === 'procedural_remand_direction') return 'نقض وإعادة';
    if (result === 'quash_modify') return 'نقض وتعديل';
    if (result === 'quash_dismissal') return 'نقض (إفراج)';
    if (result === 'procedural_annulment') return 'نقض القرار';
    return '';
}

export function buildCassationHistoricalBadgeLite(
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
    const result = normalizeCassationAppealResultLite(
        typeof appeal.result === 'string' ? appeal.result : undefined,
    );
    if (!result) return null;

    if (isProceduralCassationResult(result)) {
        return buildProceduralCassationBadgeText(result, { title: decisionTitle }, appeal);
    }

    const suffix269 = appeal.isObjectiveGrounds269b === true ? ' بموجب المادة 269/ب أصولية' : '';

    if (result === 'affirmation') {
        return 'تصديق تمييزي للقرار المطعون فيه — تثبيت الحكم.';
    }

    if (result === 'quash_remand') {
        const court = remandCourtLabelLite(appeal.remandTargetStage);
        return `نقض تمييزي للقرار وإعادة الملف إلى ${court}${suffix269}.`;
    }

    if (result === 'quash_modify') {
        const charge = String(appeal.modifiedCharge ?? '').trim();
        const article = String(appeal.modifiedArticle ?? '').trim();
        const parts = [charge, article].filter(Boolean).join(' • ');
        return `نقض تمييزي للقرار وتعديل الوصف/المادة${parts ? `: ${parts}` : ''}${suffix269}.`;
    }

    const ids = Array.isArray(appeal.beneficiaryIds) ? appeal.beneficiaryIds : [];
    const names = ids.map(partyLabelById).filter((name) => name && name !== '—');
    const label = names.length ? names.join('، ') : '—';
    return `نقض تمييزي للقرار وإفراج نهائي عن: ${label}${suffix269}.`;
}
