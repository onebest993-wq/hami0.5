import type { UseDecisionsAppealsAppealRenderersArgs } from './appeal-renderers/appealRenderersTypes';
export type { UseDecisionsAppealsAppealRenderersArgs } from './appeal-renderers/appealRenderersTypes';
import {
    DECISION_BTN_PRIMARY,
    DECISION_BTN_PRIMARY_FLEX,
    DECISION_BTN_PRIMARY_WFULL,
    DECISION_BTN_SECONDARY_FLEX,
} from './appeal-renderers/appealRendererButtonClasses';
import { useAppealEntryButtonsRenderer } from './appeal-renderers/useAppealEntryButtonsRenderer';
import { useAppealGrievanceDecideRenderer } from './appeal-renderers/useAppealGrievanceDecideRenderer';
import { useAppealAwaitingCassationRenderer } from './appeal-renderers/useAppealAwaitingCassationRenderer';
import { useAppealTamyeezPhaseRenderer } from './appeal-renderers/useAppealTamyeezPhaseRenderer';
import { useAppealDecisionCardStatus } from './appeal-renderers/useAppealDecisionCardStatus';
import { useAppealDeadlineLapseRenderer } from './appeal-renderers/useAppealDeadlineLapseRenderer';

export function useDecisionsAppealsAppealRenderers(args: UseDecisionsAppealsAppealRenderersArgs) {
    const { renderAppealEntryButtons } = useAppealEntryButtonsRenderer(args);
    const { renderAppealGrievanceDecideButtons } = useAppealGrievanceDecideRenderer(args);
    const { renderAppealAwaitingCassationButtons } = useAppealAwaitingCassationRenderer(args);
    const { renderAppealTamyeezPhasePanel } = useAppealTamyeezPhaseRenderer(args);
    const { buildDecisionCardStatus } = useAppealDecisionCardStatus(args);
    const { renderAppealDeadlineLapseActions } = useAppealDeadlineLapseRenderer(args);

    return {
        DECISION_BTN_PRIMARY,
        DECISION_BTN_PRIMARY_WFULL,
        DECISION_BTN_PRIMARY_FLEX,
        DECISION_BTN_SECONDARY_FLEX,
        renderAppealEntryButtons,
        renderAppealGrievanceDecideButtons,
        renderAppealAwaitingCassationButtons,
        renderAppealTamyeezPhasePanel,
        renderAppealDeadlineLapseActions,
        buildDecisionCardStatus,
    };
}
