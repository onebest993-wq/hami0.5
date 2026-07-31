import type {
    CassationAppealRemandTarget,
    CassationAppealResult,
    JudicialDecisionKind,
} from '@/app/types/criminal';
import {
    getCassationResultFormOptions as getCassationResultFormOptionsBase,
    isProceduralCassationResult,
} from './proceduralCassationResults';

export { getCassationResultFormOptionsBase as getCassationResultFormOptions };

export const REMAND_COURT_OPTIONS: { value: CassationAppealRemandTarget; label: string }[] = [
    { value: 'investigation', label: 'مكتب التحقيق' },
    { value: 'misdemeanor', label: 'محكمة الجنح' },
    { value: 'felony', label: 'محكمة الجنايات' },
];

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

