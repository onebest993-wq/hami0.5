import type { SeizureDecisionOutcomeContext } from './seizureDecisionOutcomeHandler.types';

/** حدث مبسّط لمرحلة init بعد إزالة resolve/property/movable phases */
export type SeizureOutcomeInitEvent = {
    resolved: { subtype: string };
    requestKind: string;
    savedAtEarly: boolean;
    seizureTarget: string;
};

/**
 * مرحلة الموافقة المبدئية — طلبات فارغة بلا إكمال/سجل.
 * البت يبقى في مركز القرارات والطعون فقط.
 */
export function handleSeizureOutcomeInitPhase(
    ctx: SeizureDecisionOutcomeContext,
    event: SeizureOutcomeInitEvent,
): boolean {
    const { resolved, requestKind, savedAtEarly, seizureTarget } = event;
    const subtype = resolved.subtype;

    if (seizureTarget === 'guarantor' && requestKind === 'seizure' && !savedAtEarly) {
        ctx.setShowCoerciveActionForm(null);
        ctx.setSeizureDetailCompletion(null);
        return true;
    }

    const isBasicSeizureSubtype =
        subtype === 'property' ||
        subtype === 'movable' ||
        subtype === 'movable_auction' ||
        subtype === 'third_party' ||
        subtype === 'salary' ||
        subtype === 'notice' ||
        !subtype;

    // أي موافقة حجز أساسي: اكتفِ بمركز القرارات — لا إكمال لاحق
    if ((requestKind === 'seizure' || isBasicSeizureSubtype) && !savedAtEarly) {
        return true;
    }

    return true;
}
