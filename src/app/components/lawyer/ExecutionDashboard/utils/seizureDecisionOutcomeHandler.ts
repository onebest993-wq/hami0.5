import type {
    SeizureDecisionOutcomeContext,
    SeizureDecisionOutcomeDetail,
} from './seizureDecisionOutcomeHandler.types';
import { resolveSeizureOutcomeEvent } from './seizureOutcomeResolve';
import { handleSeizureOutcomeInitPhase } from './seizureOutcomeInitPhase';
import { handleSeizureOutcomePropertyPhase } from './seizureOutcomePropertyPhase';
import { handleSeizureOutcomeMovablePhase } from './seizureOutcomeMovablePhase';

export type { SeizureDecisionOutcomeDetail, SeizureDecisionOutcomeContext } from './seizureDecisionOutcomeHandler.types';

/** موجّه رفيع — يفكك السياق ثم يمرّر لمراحل الموافقة المسجّلة */
export function handleSeizureDecisionOutcomeEvent(e: Event, ctx: SeizureDecisionOutcomeContext): void {
    const ce = e as CustomEvent<SeizureDecisionOutcomeDetail>;
    const event = resolveSeizureOutcomeEvent(ce.detail, ctx);
    if (!event) return;

    if (handleSeizureOutcomeInitPhase(ctx, event)) return;

    const { resolved } = event;
    if (!resolved.seizedPropertyId && !resolved.seizedMovableId) return;

    if (resolved.seizedPropertyId) {
        handleSeizureOutcomePropertyPhase(ctx, event);
        return;
    }

    if (resolved.seizedMovableId) {
        handleSeizureOutcomeMovablePhase(ctx, event);
    }
}
