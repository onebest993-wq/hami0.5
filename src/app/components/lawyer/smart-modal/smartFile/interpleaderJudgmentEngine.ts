import type { Party } from '../../LawyerShared';
import { partitionPartiesForHeader } from './partyRoleClassification';
import {
    JUDGMENT_TYPE_VOID,
} from './judgmentConstants';
import type { FirstInstanceAppealRights } from './firstInstanceAppealRightsTypes';
import { resolveLawyerSide } from './lawyerSideResolution';
import { resolveClientPartyBucket, type LawyerJudgmentBucket } from './clientPartyBucket';
export { resolveClientPartyBucket, type LawyerJudgmentBucket } from './clientPartyBucket';
export { resolveClientMarkedParty } from './clientMarkedParty';

export type JudgmentOptionWithHint = {
    value: string;
    label: string;
    hint?: string;
};

export const INTERPLEADER_JUDGMENT_PLAINTIFF_FULL =
    'إجابة دعوى المدعي (بالكامل)';
export const INTERPLEADER_JUDGMENT_THIRD_FULL =
    'الحكم للشخص الثالث الاختصامي (بطلباته)';
export const INTERPLEADER_JUDGMENT_BOTH_DISMISSED =
    'رد الدعوى الأصلية ورد طلب التدخل';
const INTERPLEADER_JUDGMENT_PLAINTIFF_PARTIAL =
    'إجابة دعوى المدعي (جزئياً)';
export const INTERPLEADER_JUDGMENT_THIRD_PARTIAL =
    'إجابة طلب الشخص الثالث (جزئياً)';
const INTERPLEADER_JUDGMENT_FORMAL_NULLITY =
    'إبطال عريضة الدعوى وعريضة التدخل';

const INTERPLEADER_JUDGMENT_VALUES = new Set<string>([
    INTERPLEADER_JUDGMENT_PLAINTIFF_FULL,
    INTERPLEADER_JUDGMENT_THIRD_FULL,
    INTERPLEADER_JUDGMENT_BOTH_DISMISSED,
    INTERPLEADER_JUDGMENT_PLAINTIFF_PARTIAL,
    INTERPLEADER_JUDGMENT_THIRD_PARTIAL,
    INTERPLEADER_JUDGMENT_FORMAL_NULLITY,
]);

export function hasInterpleaderParties(parties?: Party[]): boolean {
    if (!Array.isArray(parties) || parties.length === 0) return false;
    return partitionPartiesForHeader(parties).interpleaders.length > 0;
}

export function isInterpleaderJudgmentType(type: string): boolean {
    return INTERPLEADER_JUDGMENT_VALUES.has(String(type ?? '').trim());
}

export function interpleaderFirstInstanceJudgmentOptions(): JudgmentOptionWithHint[] {
    return [
        {
            value: INTERPLEADER_JUDGMENT_PLAINTIFF_FULL,
            label: INTERPLEADER_JUDGMENT_PLAINTIFF_FULL,
            hint: '(يتضمن ضمناً رد دعوى الشخص الثالث الاختصامي)',
        },
        {
            value: INTERPLEADER_JUDGMENT_THIRD_FULL,
            label: INTERPLEADER_JUDGMENT_THIRD_FULL,
            hint: '(يتضمن ضمناً رد الدعوى الأصلية للمدعي)',
        },
        {
            value: INTERPLEADER_JUDGMENT_BOTH_DISMISSED,
            label: INTERPLEADER_JUDGMENT_BOTH_DISMISSED,
            hint: '(المدعى عليه هو الكاسب الوحيد للنزاع)',
        },
        {
            value: INTERPLEADER_JUDGMENT_PLAINTIFF_PARTIAL,
            label: INTERPLEADER_JUDGMENT_PLAINTIFF_PARTIAL,
            hint: '(رد الجزء المتبقي، ورد دعوى الشخص الثالث بالكامل)',
        },
        {
            value: INTERPLEADER_JUDGMENT_THIRD_PARTIAL,
            label: INTERPLEADER_JUDGMENT_THIRD_PARTIAL,
            hint: '(رد الجزء المتبقي، ورد الدعوى الأصلية بالكامل)',
        },
        {
            value: INTERPLEADER_JUDGMENT_FORMAL_NULLITY,
            label: INTERPLEADER_JUDGMENT_FORMAL_NULLITY,
            hint: '(لأسباب شكلية أو لترك الدعوى للمراجعة)',
        },
    ];
}

export function interpleaderTerminationJudgmentOptions(): JudgmentOptionWithHint[] {
    return [{ value: JUDGMENT_TYPE_VOID, label: JUDGMENT_TYPE_VOID }];
}

export function resolveLawyerJudgmentBucket(
    representedParty?: string | null,
    parties?: Array<{
        role?: string;
        isClient?: boolean;
        side?: 'right' | 'left';
        isMyOffice?: boolean;
        lawyer?: { isMyOffice?: boolean };
    }>,
): LawyerJudgmentBucket | null {
    const fromClientMarker = resolveClientPartyBucket(parties);
    if (fromClientMarker) return fromClientMarker;

    const side = resolveLawyerSide(representedParty, parties);
    if (side === 'المدعي') return 'plaintiff';
    if (side === 'المدعى عليه') return 'defendant';
    return null;
}

type ClientOutcome = 'full_win' | 'full_loss' | 'partial' | 'void';

function resolveClientOutcome(judgmentType: string, bucket: LawyerJudgmentBucket): ClientOutcome {
    switch (judgmentType) {
        case INTERPLEADER_JUDGMENT_PLAINTIFF_FULL:
            if (bucket === 'plaintiff') return 'full_win';
            if (bucket === 'defendant') return 'full_loss';
            return 'full_loss';
        case INTERPLEADER_JUDGMENT_THIRD_FULL:
            if (bucket === 'plaintiff') return 'full_loss';
            if (bucket === 'defendant') return 'full_win';
            return 'full_win';
        case INTERPLEADER_JUDGMENT_BOTH_DISMISSED:
            if (bucket === 'defendant') return 'full_win';
            return 'full_loss';
        case INTERPLEADER_JUDGMENT_PLAINTIFF_PARTIAL:
            if (bucket === 'plaintiff') return 'partial';
            if (bucket === 'defendant') return 'partial';
            return 'full_loss';
        case INTERPLEADER_JUDGMENT_THIRD_PARTIAL:
            if (bucket === 'plaintiff') return 'full_loss';
            if (bucket === 'defendant') return 'full_win';
            if (bucket === 'interpleader') return 'partial';
            return 'partial';
        case INTERPLEADER_JUDGMENT_FORMAL_NULLITY:
            return 'void';
        default:
            return 'partial';
    }
}

export function resolveInterpleaderHadoriAppealRights(
    judgmentType: string,
    bucket: LawyerJudgmentBucket | null,
): FirstInstanceAppealRights {
    if (!bucket) {
        if (judgmentType === INTERPLEADER_JUDGMENT_FORMAL_NULLITY) {
            return { action: 'archive_void', hint: '' };
        }
        return {
            action: 'both_paths',
            hint: '',
        };
    }

    if (bucket === 'interpleader') {
        if (
            judgmentType === INTERPLEADER_JUDGMENT_THIRD_FULL
            || judgmentType === INTERPLEADER_JUDGMENT_THIRD_PARTIAL
        ) {
            return {
                action: 'wait_opponent',
                hint: 'إجابة طلب الشخص الثالث — لا يحق لموكلك الطعن. بانتظار طعن الخصم.',
            };
        }
        if (
            judgmentType === INTERPLEADER_JUDGMENT_PLAINTIFF_FULL
            || judgmentType === INTERPLEADER_JUDGMENT_PLAINTIFF_PARTIAL
            || judgmentType === INTERPLEADER_JUDGMENT_BOTH_DISMISSED
        ) {
            return {
                action: 'self_appeal',
                hint: 'رد طلب الشخص الثالث — يحق لموكلك الطعن بالاستئناف أو التمييز.',
            };
        }
    }

    const outcome = resolveClientOutcome(judgmentType, bucket);

    if (outcome === 'void') {
        return { action: 'archive_void', hint: '' };
    }

    if (outcome === 'full_win') {
        return {
            action: 'wait_opponent',
            hint: 'كسبتم الدعوى — لا يحق لموكلك الطعن. تُقفل المرافعة بانتظار طعن الخصم.',
        };
    }

    if (outcome === 'full_loss') {
        return {
            action: 'self_appeal',
            hint: 'صدر حكم لصالح الخصم — يحق لموكلك الطعن بالاستئناف أو التمييز.',
        };
    }

    return {
        action: 'self_appeal',
        hint: 'حكم جزئي — يحق لموكلك والخصم الطعن فيما حُسم عليه.',
    };
}

export function resolveInterpleaderDecisionText(
    judgmentType: string,
    bucket: LawyerJudgmentBucket | null,
): string {
    if (!bucket) return `محسومة - بانتظار الطعن (${judgmentType})`;

    const outcome = resolveClientOutcome(judgmentType, bucket);
    if (outcome === 'void') return 'دعوى مبطلة شكلاً';
    if (outcome === 'full_win') return 'محسومة لصالح الموكل - بانتظار الطعن';
    if (outcome === 'full_loss') return 'محسومة ضد الموكل - بانتظار الطعن';
    return 'محسومة جزئياً - بانتظار الطعن';
}

export function interpleaderClientAwaitingOpponentAppeal(
    judgmentType: string,
    bucket: LawyerJudgmentBucket | null,
): boolean {
    if (!bucket) return false;
    return resolveClientOutcome(judgmentType, bucket) === 'full_win';
}

/** نتيجة الدعوى الأصلية للمدعي — لتحديث درع الحجز (المادة 245). */
export function interpleaderOriginalClaimOutcome(
    judgmentType: string,
): 'full_win' | 'partial_win' | 'full_loss' | 'neutral' | null {
    if (!isInterpleaderJudgmentType(judgmentType)) return null;

    switch (judgmentType) {
        case INTERPLEADER_JUDGMENT_PLAINTIFF_FULL:
            return 'full_win';
        case INTERPLEADER_JUDGMENT_PLAINTIFF_PARTIAL:
            return 'partial_win';
        case INTERPLEADER_JUDGMENT_THIRD_FULL:
        case INTERPLEADER_JUDGMENT_BOTH_DISMISSED:
        case INTERPLEADER_JUDGMENT_THIRD_PARTIAL:
            return 'full_loss';
        case INTERPLEADER_JUDGMENT_FORMAL_NULLITY:
            return 'neutral';
        default:
            return null;
    }
}
