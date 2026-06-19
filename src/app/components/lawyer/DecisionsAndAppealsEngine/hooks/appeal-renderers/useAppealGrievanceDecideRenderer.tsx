import type { Decision } from '../../types';
import type { UseDecisionsAppealsAppealRenderersArgs } from './appealRenderersTypes';
import {
    DECISION_BTN_GRIEVANCE_ACCEPT,
    DECISION_BTN_GRIEVANCE_REJECT,
} from '../../decisionCardPresentation';
import { appealWindowsForDecision, type AppealDeadlineWindows, type DecisionsAppealsAppealSlot } from '../../utils';

export function useAppealGrievanceDecideRenderer(args: UseDecisionsAppealsAppealRenderersArgs) {
    const { applyGrievanceCourtOutcome } = args;

        const renderAppealGrievanceDecideButtons = (
            decision: Decision,
            variant: DecisionsAppealsAppealSlot,
            windows?: AppealDeadlineWindows
        ) => {
            const w =
                windows ?? appealWindowsForDecision(decision);
            if (w.isPastGrievanceDeadline) return null;
            const rowClass =
                variant === 'appealsTab'
                    ? 'flex flex-row-reverse flex-wrap gap-2'
                    : 'mb-3 flex flex-row-reverse flex-wrap gap-2';
            return (
                <div className={rowClass}>
                    <button
                        type="button"
                        onClick={() => applyGrievanceCourtOutcome(decision, true)}
                        className={DECISION_BTN_GRIEVANCE_ACCEPT}
                    >
                        قبول التظلم
                    </button>
                    <button
                        type="button"
                        onClick={() => applyGrievanceCourtOutcome(decision, false)}
                        className={DECISION_BTN_GRIEVANCE_REJECT}
                    >
                        رد التظلم
                    </button>
                </div>
            );
        };

    return { renderAppealGrievanceDecideButtons };
}
