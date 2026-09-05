import type { SeizureDecisionOutcomeContext, SeizureDecisionOutcomeDetail } from './seizureDecisionOutcomeHandler.types';
import { handleSeizureOutcomeInitPhase } from './seizureOutcomeInitPhase';

export type { SeizureDecisionOutcomeDetail, SeizureDecisionOutcomeContext } from './seizureDecisionOutcomeHandler.types';

/**
 * بعد موافقة طلب الحجز — لا مراحل إكمال/سير عمل.
 * init-phase فقط (البت في مركز القرارات).
 */
export function handleSeizureDecisionOutcomeEvent(e: Event, ctx: SeizureDecisionOutcomeContext): void {
    const ce = e as CustomEvent<SeizureDecisionOutcomeDetail & Record<string, unknown>>;
    const detail = (ce.detail || {}) as Record<string, unknown>;

    const subtype = String(detail.seizureSubtype || detail.subtype || '').trim();
    const requestKind = String(detail.requestKind || 'seizure').trim();
    const savedAtEarly = Boolean(String(detail.seizureRequestSavedAt || '').trim());
    const seizureTarget = String(detail.seizureTarget || '').trim();

    handleSeizureOutcomeInitPhase(ctx, {
        resolved: { subtype },
        requestKind,
        savedAtEarly,
        seizureTarget,
    });
}
