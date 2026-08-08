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
    const fullModify = judgmentType === 'رد الدعوى كلياً';
    const partialModify = judgmentType === 'رد الدعوى جزئياً';

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
                hint: 'موكلك (المعترض) خسر الاعتراض — تأييد الحكم الغيابي. المدعي الأصلي ربح دعواه الأصلية. يحق لموكلك الطعن بالاستئناف أو التمييز.',
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
                hint: 'موكلك (المعترض عليه) خسر الاعتراض — تعديل الحكم. المدعي الأصلي خسر دعواه الأصلية. يحق لموكلك الطعن.',
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
