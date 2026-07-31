import { applyWaitAppealScenarios } from './scenarioWaitAppeal';
import { applyArchiveScenarios } from './scenarioArchive';
import { applyTransitionScenario } from './scenarioTransition';
import { applyFinalCloseScenario } from './scenarioFinalClose';
import { applyCassationScenarios } from './scenarioCassation';
import type { JudgmentConfirmRuntime, JudgmentConfirmScope } from './judgmentConfirmTypes';

export function dispatchJudgmentScenarios(scope: JudgmentConfirmScope, rt: JudgmentConfirmRuntime): void {
    const { action } = rt;
    if (action === 'waiting_for_appeal' || action === 'waiting_for_cassation' || action === 'seal_plaintiff_win') {
        applyWaitAppealScenarios(scope, rt);
    }
    else if (action === 'archive_review' || action === 'archive_annulled' || action === 'finalize_non_merit') {
        applyArchiveScenarios(scope, rt);
    }
    else if (action === 'transition') {
        applyTransitionScenario(scope, rt);
    }
    else if (action === 'final_close') {
        applyFinalCloseScenario(scope, rt);
    }
    else if (
        action === 'final_ratification' ||
        action === 'remand_to_lower' ||
        action === 'correction_request' ||
        action === 'correction_complete'
    ) {
        applyCassationScenarios(scope, rt);
    }
}
