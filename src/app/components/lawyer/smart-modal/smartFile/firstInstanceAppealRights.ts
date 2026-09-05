import type { Party } from '../../LawyerShared';
import {
    resolveOperationalAppealAction,
    type PartyOutcome,
} from '@/app/domain/lawsuit/litigationDecisionEngine';
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

function clientPartyOutcomeFromHadoriJudgment(
    judgmentType: string,
    effectiveSide: 'المدعي' | 'المدعى عليه',
): PartyOutcome | null {
    const isFullWin =
        judgmentType === JUDGMENT_TYPE_FULL_WIN || judgmentType === 'إجابة الدعوى';
    const isFullLoss = judgmentType === 'رد الدعوى كلياً';
    const isPartial = judgmentType === 'رد الدعوى جزئياً';
    if (isFullWin) return effectiveSide === 'المدعي' ? 'FULL_WIN' : 'FULL_LOSS';
    if (isFullLoss) return effectiveSide === 'المدعي' ? 'FULL_LOSS' : 'FULL_WIN';
    if (isPartial) return 'PARTIAL';
    return null;
}

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
                hint: 'حكم جزئي — يُحفظ المنطوق مرة واحدة؛ طعن موكلك وطعن/اعتراض الخصم من تذييل الإضبارة.',
            };
        }
        return {
            action: 'both_paths',
            hint: 'يُحفظ الحكم مرة واحدة — مسارات الطعن من تذييل الإضبارة بعد الحفظ.',
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

    const partyOutcome = clientPartyOutcomeFromHadoriJudgment(judgmentType, effectiveSide);
    if (!partyOutcome) {
        return { action: 'none', hint: '' };
    }

    const action = resolveOperationalAppealAction(partyOutcome, { partialAction: 'both_paths' });

    if (action === 'wait_opponent') {
        if (judgmentType === 'رد الدعوى كلياً') {
            return {
                action,
                hint: 'كسبتم الدعوى — لا يحق لموكلك الطعن. بانتظار طعن الخصم إن رغب.',
            };
        }
        return {
            action,
            hint: 'كسبتم الدعوى — لا يحق لموكلك الطعن. تُقفل المرافعة بانتظار طعن الخصم.',
        };
    }

    if (action === 'both_paths') {
        return {
            action,
            hint: 'حكم جزئي — يُحفظ المنطوق مرة واحدة؛ طعن موكلك وطعن/اعتراض الخصم من تذييل الإضبارة.',
        };
    }

    if (judgmentType === 'رد الدعوى كلياً') {
        return {
            action: 'self_appeal',
            hint: 'صدر حكم برفض الدعوى — بعد الحفظ يحق لموكلك الطعن من تذييل الإضبارة.',
        };
    }
    return {
        action: 'self_appeal',
        hint: 'صدر حكم بإجابة الدعوى — بعد الحفظ يحق لموكلك الطعن من تذييل الإضبارة.',
    };
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
            return 'يحق لموكلك الطعن';
        case 'both_paths':
            return judgmentType === 'رد الدعوى جزئياً' || String(judgmentType).includes('جزئياً')
                ? 'يحق لكلا الطرفين الطعن (حكم جزئي)'
                : 'يحق لكلا الطرفين الطعن';
        case 'finalize_non_merit':
            return 'إنهاء نهائي — لا حق للطعن';
        case 'archive_void':
            return 'إبطال — أرشفة الإضبارة';
        default:
            return undefined;
    }
}
