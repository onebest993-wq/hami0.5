import type { CaseStage } from '../../LawyerShared';
import {
    CASSATION_CORRECTION_TAB_LABEL,
    shouldShowCassationCorrectionTabLabel,
} from './extraordinaryAppealGateway';

export type ChromeStageStripItem = {
    key: string;
    displayName: string;
    realIndex: number | null;
    isPlaceholder: boolean;
    isPast: boolean;
    isActive: boolean;
    isViewing: boolean;
    postCassationRemand: boolean;
};

function stageNameOf(stage: CaseStage | undefined): string {
    return String(stage?.stageName ?? stage?.name ?? '').trim();
}

export function resolveStepperStageDisplayName(
    stage: CaseStage,
    _index: number,
    stages: CaseStage[],
    caseStatus?: string,
): string {
    const base = stageNameOf(stage);
    if (!base) return '—';
    if (shouldShowCassationCorrectionTabLabel(stage, stages, caseStatus)) {
        return CASSATION_CORRECTION_TAB_LABEL;
    }
    return base;
}

export function shouldShowFutureCassationStage(_stages: CaseStage[]): boolean {
    return false;
}

/** شريط المراحل: مراحل فعلية + تمييز قادم + تمييز ما قبل/بعد النقض */
export function buildChromeStageStripItems(
    stages: CaseStage[],
    activeStageIndex: number,
    viewingStageIndex: number,
    caseStatus?: string,
): ChromeStageStripItem[] {
    const items: ChromeStageStripItem[] = stages.map((stage, idx) => {
        const isPast = stage.status === 'completed' || stage.status === 'locked';
        const postCassationRemand =
            Boolean(stage.wasReopened && idx === activeStageIndex);

        return {
            key: `${String(stage.id ?? 'stage')}-${idx}`,
            displayName: resolveStepperStageDisplayName(stage, idx, stages, caseStatus),
            realIndex: idx,
            isPlaceholder: false,
            isPast,
            isActive: idx === activeStageIndex,
            isViewing: idx === viewingStageIndex,
            postCassationRemand,
        };
    });

    return items;
}
