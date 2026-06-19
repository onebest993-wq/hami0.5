import type { CaseStage } from '../../LawyerShared';
import {
    isAppealStageName,
    isCassationStageName,
    isFirstInstanceStageName,
} from './judgmentTypes';

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
    _stages: CaseStage[],
): string {
    const base = stageNameOf(stage);
    if (!base) return '—';
    return base;
}

export function shouldShowFutureCassationStage(stages: CaseStage[]): boolean {
    const hasAppeal = stages.some((s) => isAppealStageName(stageNameOf(s)));
    const hasCassation = stages.some((s) => isCassationStageName(stageNameOf(s)));
    return hasAppeal && !hasCassation;
}

/** شريط المراحل: مراحل فعلية + تمييز قادم + تمييز ما قبل/بعد النقض */
export function buildChromeStageStripItems(
    stages: CaseStage[],
    activeStageIndex: number,
    viewingStageIndex: number,
): ChromeStageStripItem[] {
    const items: ChromeStageStripItem[] = stages.map((stage, idx) => {
        const isPast = stage.status === 'completed' || stage.status === 'locked';
        const postCassationRemand =
            Boolean(stage.wasReopened && idx === activeStageIndex);

        return {
            key: `${String(stage.id ?? 'stage')}-${idx}`,
            displayName: resolveStepperStageDisplayName(stage, idx, stages),
            realIndex: idx,
            isPlaceholder: false,
            isPast,
            isActive: idx === activeStageIndex,
            isViewing: idx === viewingStageIndex,
            postCassationRemand,
        };
    });

    if (shouldShowFutureCassationStage(stages)) {
        items.push({
            key: 'placeholder-cassation',
            displayName: 'التمييز',
            realIndex: null,
            isPlaceholder: true,
            isPast: false,
            isActive: false,
            isViewing: false,
            postCassationRemand: false,
        });
    }

    return items;
}

export function isDirectCassationOnlyPath(stages: CaseStage[]): boolean {
    const hasAppeal = stages.some((s) => isAppealStageName(stageNameOf(s)));
    const hasCassation = stages.some((s) => isCassationStageName(stageNameOf(s)));
    const hasFirst = stages.some((s) => isFirstInstanceStageName(stageNameOf(s)));
    return hasCassation && hasFirst && !hasAppeal;
}
