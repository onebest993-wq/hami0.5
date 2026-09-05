import { isNonMeritTerminationType, type FirstInstanceAppealRights } from './judgmentTypes';
import { resolveAbsentObjectionClientRole } from './absentJudgmentFlow';

/**
 * حقوق الطعن بعد قرار الاعتراض على الحكم الغيابي — لا تُعادل البداءة.
 * تأييد الغيابي = المدعي الأصلي ربح دعواه؛ تعديل الحكم = المدعي الأصلي خسر دعواه.
 */
export function resolveAbsentObjectionAppealRights(
    judgmentType: string,
    parties?: Array<{
        id?: number | string;
        role?: string;
        isClient?: boolean;
        isMyOffice?: boolean;
        lawyer?: { isMyOffice?: boolean };
    }> | null,
): FirstInstanceAppealRights {
    const clientRole = resolveAbsentObjectionClientRole(parties);

    if (isNonMeritTerminationType(judgmentType)) {
        return {
            action: 'finalize_non_merit',
            hint: 'إنهاء نهائي — مكتسبة الدرجة القطعية (لا حق للطعن).',
        };
    }

    const upholdAbsent = judgmentType === 'إجابة الدعوى بالكامل';
    const formReject = judgmentType === 'رد الاعتراض شكلاً';
    const fullModify = judgmentType === 'رد الدعوى كلياً';
    const partialModify = judgmentType === 'رد الدعوى جزئياً';

    if (formReject) {
        if (clientRole === 'objected') {
            return {
                action: 'wait_opponent',
                hint: 'رُد الاعتراض شكلاً أو أُبطل للغياب (م/179). الحكم الغيابي اكتسب القطعية بحق المعترض. فك استئخار الاستئناف — الخصومة الاستئنافية مع الحاضر الطاعن فقط.',
            };
        }
        if (clientRole === 'objector') {
            return {
                action: 'none',
                hint: 'رُد اعتراض موكلك شكلاً أو أُبطل للغياب (م/179). اكتسب الحكم الغيابي القطعية بحقه — لا مهلة طعن جديدة من هذا القرار.',
            };
        }
        return {
            action: 'none',
            hint: 'رد الاعتراض شكلاً (م/179) — الحكم الغيابي بات بحق المعترض. تُفك الاستئخار وتقتصر الخصومة الاستئنافية على المدعي والحاضر الطاعن.',
        };
    }

    if (upholdAbsent) {
        if (clientRole === 'objected') {
            return {
                action: 'wait_opponent',
                hint: 'موكلك (المعترض عليه) ربح الاعتراض — تأييد الحكم الغيابي. المدعي الأصلي ربح دعواه. لا يحق لموكلك الطعن — بانتظار طعن المعترض.',
            };
        }
        if (clientRole === 'objector') {
            return {
                action: 'self_appeal',
                hint: 'موكلك (المعترض) خسر الاعتراض — تأييد الحكم الغيابي. المدعي الأصلي ربح دعواه. يحق لموكلك الطعن المقرر قانوناً.',
            };
        }
        return {
            action: 'both_paths',
            hint: 'تأييد الحكم الغيابي — المدعي الأصلي ربح دعواه. الخاسر من الاعتراض فقط يحق له الطعن.',
        };
    }

    if (fullModify) {
        if (clientRole === 'objector') {
            return {
                action: 'wait_opponent',
                hint: 'موكلك (المعترض) ربح الاعتراض — تعديل الحكم الغيابي. المدعي الأصلي خسر دعواه. لا يحق لموكلك الطعن — بانتظار طعن المدعي الأصلي.',
            };
        }
        if (clientRole === 'objected') {
            return {
                action: 'self_appeal',
                hint: 'موكلك (المعترض عليه) خسر الاعتراض — تعديل الحكم. المدعي الأصلي خسر دعواه الأصلية. يحق لموكلك الطعن المقرر قانوناً.',
            };
        }
        return {
            action: 'both_paths',
            hint: 'تعديل الحكم الغيابي — المدعي الأصلي خسر دعواه. الخاسر من الاعتراض يحق له الطعن.',
        };
    }

    if (partialModify) {
        return {
            action: 'both_paths',
            hint: 'تعديل جزئي للحكم الغيابي — يحق للطرفين الطعن فيما حُسم عليه.',
        };
    }

    return { action: 'none', hint: '' };
}

/** منطوق الحفظ بعد قرار الاعتراض — تأييد أو تعديل، انتظار أو طعن. */
export function resolveAbsentObjectionWaitDecisionText(
    judgmentType: string,
    action: FirstInstanceAppealRights['action'],
): string | null {
    if (action === 'wait_opponent') {
        if (judgmentType === 'رد الدعوى كلياً') {
            return 'تعديل الحكم الغيابي — بانتظار طعن المعترض عليه';
        }
        if (judgmentType === 'رد الدعوى جزئياً') {
            return 'تعديل جزئي للحكم الغيابي — بانتظار طعن الطرف الآخر';
        }
        if (judgmentType === 'رد الاعتراض شكلاً') {
            return 'رد الاعتراض شكلاً — اكتسب الحكم الغيابي القطعية بحق المعترض';
        }
        return 'تأييد الحكم الغيابي — بانتظار طعن المعترض';
    }
    if (action === 'self_appeal') {
        if (judgmentType === 'رد الدعوى كلياً') {
            return 'تعديل الحكم الغيابي — يحق لموكلك الطعن';
        }
        if (judgmentType === 'رد الدعوى جزئياً') {
            return 'تعديل جزئي للحكم الغيابي — يحق لموكلك الطعن';
        }
        return 'تأييد الحكم الغيابي — يحق لموكلك الطعن';
    }
    return null;
}
