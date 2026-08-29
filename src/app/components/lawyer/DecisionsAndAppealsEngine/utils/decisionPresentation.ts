import type { Decision } from '../types';
import {
    decisionCardGlassClasses,
    type DecisionCardEnforcementVisual,
} from '../decisionCardGlassShell';
import {
    type AppealUiPerspective,
} from '../appealUiLabels';
import {
    appealPipelineRowForCard,
    resolveCreditorDecisionEnforcementState,
} from './appealEngineCore';
import { DECISION_GLASS_CARD } from './appeal-engine/decisionCardFormatting';

export type { DecisionCardEnforcementVisual } from '../decisionCardGlassShell';

export const DECISION_CARD_LAYOUT =
    'flex h-full flex-col justify-between rounded-xl p-2.5 text-right shadow-lg backdrop-blur-sm transition-all duration-300';

export function resolveDecisionCardEnforcementVisual(
    hub: Decision,
    all: Decision[],
    needsExecutor: boolean,
    hubTab: 'current' | 'previous' | 'appeals' | 'archive' = 'previous',
    appealLegallyFinal = false,
    appealPerspective: AppealUiPerspective = 'creditor_agent'
): DecisionCardEnforcementVisual {
    const pipe = appealPipelineRowForCard(hub, all);
    return resolveCreditorDecisionEnforcementState(hub, pipe, {
        hubTab,
        appealLegallyFinal,
        needsExecutor,
        appealPerspective,
        allDecisions: all,
    }).visual;
}

export function decisionCardSurfaceClasses(
    visual: DecisionCardEnforcementVisual | null,
    hubTab: 'current' | 'previous' | 'appeals' | 'archive'
): string {
    if (hubTab !== 'previous' && hubTab !== 'archive' && hubTab !== 'current') {
        return DECISION_GLASS_CARD;
    }
    if (!visual) return DECISION_GLASS_CARD;

    return decisionCardGlassClasses(visual);
}

