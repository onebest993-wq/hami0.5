import { classifyAbsentObjectionOutcome } from '@/app/domain/lawsuit/objectionAppealConsequence';
import { JUDGMENT_TYPE_SULH, JUDGMENT_TYPE_WAIVER } from './judgmentTypeGuards';

/**
 * نوع الحكم الموضوعي عند فتح بوابة الطعن من التذييل بعد الحفظ.
 * لا يُستنتج من شكل الحضور (حضوري/غيابي) المخزَّن في lastJudgmentType.
 */
export function inferJudgmentTypeFromStage(stage: {
    finalDecision?: string | null;
    clientStageOutcome?: string | null;
} | null | undefined): string {
    const fd = String(stage?.finalDecision ?? '').trim();
    if (fd.includes('الصلح') || fd.includes('صلح')) return JUDGMENT_TYPE_SULH;
    if (fd.includes('التنازل') || fd.includes('تنازل')) return JUDGMENT_TYPE_WAIVER;

    const objectionOutcome = classifyAbsentObjectionOutcome(fd);
    if (objectionOutcome === 'void_full') return 'رد الدعوى كلياً';
    if (objectionOutcome === 'partial') return 'رد الدعوى جزئياً';
    if (objectionOutcome === 'form_reject') return 'رد الاعتراض شكلاً';
    if (objectionOutcome === 'uphold') return 'إجابة الدعوى بالكامل';

    if (fd.includes('يحق لموكلك الطعن') || fd.includes('ضد الموكل')) {
        return fd.includes('جزئياً') ? 'رد الدعوى جزئياً' : 'رد الدعوى كلياً';
    }
    if (fd.includes('إجابة الدعوى') || fd.includes('لصالح الموكل')) {
        return fd.includes('جزئياً') ? 'رد الدعوى جزئياً' : 'إجابة الدعوى بالكامل';
    }

    if (stage?.clientStageOutcome === 'LOSS') return 'رد الدعوى كلياً';
    if (stage?.clientStageOutcome === 'PARTIAL') return 'رد الدعوى جزئياً';
    if (stage?.clientStageOutcome === 'WIN') return 'إجابة الدعوى بالكامل';

    return 'إجابة الدعوى بالكامل';
}
