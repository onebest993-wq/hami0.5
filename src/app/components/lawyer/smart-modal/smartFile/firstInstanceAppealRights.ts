import type { Party } from '../../LawyerShared';
import { JUDGMENT_TYPE_VOID } from './judgmentConstants';
import type { FirstInstanceAppealRights } from './firstInstanceAppealRightsTypes';
import {
    hasInterpleaderParties,
    isInterpleaderJudgmentType,
    resolveInterpleaderHadoriAppealRights,
    resolveLawyerJudgmentBucket,
} from './interpleaderJudgmentEngine';
import { resolveClientPartyBucket } from './clientPartyBucket';
import {
    isNonMeritTerminationType,
    JUDGMENT_TYPE_FULL_WIN,
} from './judgmentTypeGuards';

/**
 * حقوق الطعن في البداءة (حكم حضوري) — حسب نوع المنطوق وجانب الموكل.
 * - إجابة كاملة: المدعي ينتظر طعن الخصم فقط؛ المدعى عليه يطعن.
 * - رد كلي: المدعي يطعن؛ المدعى عليه ينتظر فقط.
 * - رد جزئي: الطعن متاح للطرفين.
 */
export function resolveFirstInstanceHadoriAppealRights(
    judgmentType: string,
    lawyerSide: 'المدعي' | 'المدعى عليه' | null,
    context?: {
        parties?: Party[];
        representedParty?: string | null;
    },
): FirstInstanceAppealRights {
    const lawyerBucket =
        resolveClientPartyBucket(context?.parties)
        ?? resolveLawyerJudgmentBucket(context?.representedParty, context?.parties)
        ?? (lawyerSide === 'المدعي'
            ? 'plaintiff'
            : lawyerSide === 'المدعى عليه'
              ? 'defendant'
              : null);
    const effectiveSide: 'المدعي' | 'المدعى عليه' | null =
        lawyerSide
        ?? (lawyerBucket === 'plaintiff'
            ? 'المدعي'
            : lawyerBucket === 'defendant'
              ? 'المدعى عليه'
              : null);

    if (hasInterpleaderParties(context?.parties)) {
        if (judgmentType === JUDGMENT_TYPE_VOID || judgmentType === 'إبطال') {
            return { action: 'archive_void', hint: '' };
        }
        if (isNonMeritTerminationType(judgmentType)) {
            return {
                action: 'finalize_non_merit',
                hint: 'إنهاء نهائي — مكتسبة الدرجة القطعية (لا حق للطعن).',
            };
        }
    }

    if (isInterpleaderJudgmentType(judgmentType)) {
        return resolveInterpleaderHadoriAppealRights(judgmentType, lawyerBucket);
    }

    if (!effectiveSide) {
        if (judgmentType === JUDGMENT_TYPE_VOID || judgmentType === 'إبطال') {
            return { action: 'archive_void', hint: '' };
        }
        if (isNonMeritTerminationType(judgmentType)) {
            return {
                action: 'finalize_non_merit',
                hint: 'إنهاء نهائي — مكتسبة الدرجة القطعية (لا حق للطعن).',
            };
        }
        if (judgmentType === 'رد الدعوى جزئياً') {
            return {
                action: 'both_paths',
                hint: 'حكم جزئي — يحق لكلا الطرفين الطعن فيما حُسم عليه.',
            };
        }
        return {
            action: 'both_paths',
            hint: 'اختر الإجراء المناسب: انتظار طعن الخصم إن كنت الكاسب، أو الانتقال للطعن إن كنت الخاسر.',
        };
    }

    if (judgmentType === JUDGMENT_TYPE_VOID || judgmentType === 'إبطال') {
        return { action: 'archive_void', hint: '' };
    }

    if (isNonMeritTerminationType(judgmentType)) {
        return {
            action: 'finalize_non_merit',
            hint: 'إنهاء نهائي — مكتسبة الدرجة القطعية (لا حق للطعن).',
        };
    }

    const isFullWin =
        judgmentType === JUDGMENT_TYPE_FULL_WIN || judgmentType === 'إجابة الدعوى';
    const isFullLoss = judgmentType === 'رد الدعوى كلياً';
    const isPartial = judgmentType === 'رد الدعوى جزئياً';

    if (isFullWin) {
        if (effectiveSide === 'المدعي') {
            return {
                action: 'wait_opponent',
                hint: 'كسبتم الدعوى — لا يحق لموكلك الطعن. تُقفل المرافعة بانتظار طعن الخصم.',
            };
        }
        return {
            action: 'self_appeal',
            hint: 'صدر حكم بإجابة الدعوى — يحق لموكلك الطعن بالاستئناف أو التمييز.',
        };
    }

    if (isFullLoss) {
        if (effectiveSide === 'المدعي') {
            return {
                action: 'self_appeal',
                hint: 'صدر حكم برفض الدعوى — يحق لموكلك الطعن.',
            };
        }
        return {
            action: 'wait_opponent',
            hint: 'كسبتم الدعوى — لا يحق لموكلك الطعن. بانتظار طعن الخصم إن رغب.',
        };
    }

    if (isPartial) {
        return {
            action: 'self_appeal',
            hint: 'حكم جزئي — يحق لموكلك والخصم الطعن فيما حُسم عليه.',
        };
    }

    return { action: 'none', hint: '' };
}

/** تلميح ذكي لكل خيار حكم حسب صفة الموكل — يُعرض في قائمة المنطوق. */
export function resolveJudgmentAppealHintForLawyer(
    judgmentType: string,
    lawyerSide: 'المدعي' | 'المدعى عليه' | null,
    context?: {
        parties?: Party[];
        representedParty?: string | null;
    },
): string | undefined {
    const rights = resolveFirstInstanceHadoriAppealRights(judgmentType, lawyerSide, context);
    switch (rights.action) {
        case 'wait_opponent':
            return 'لا يحق لموكلك الطعن — بانتظار طعن الخصم';
        case 'self_appeal':
            return judgmentType === 'رد الدعوى جزئياً'
                ? 'يحق لموكلك الطعن (حكم جزئي)'
                : 'يحق لموكلك الطعن';
        case 'finalize_non_merit':
            return 'إنهاء نهائي — لا حق للطعن';
        case 'archive_void':
            return 'إبطال — أرشفة الإضبارة';
        default:
            return undefined;
    }
}
