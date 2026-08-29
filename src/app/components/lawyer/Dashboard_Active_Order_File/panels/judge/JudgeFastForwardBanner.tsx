import React from 'react';
import type { JudgeDecisionLifecyclePanelProps } from '../JudgeDecisionLifecyclePanelProps';

export function JudgeFastForwardBanner(props: JudgeDecisionLifecyclePanelProps) {
    const {
        defenderPhase1ReadOnly,
        fastForwardToGrievance,
        fileStatus,
        isDefendantClient,
        isFinalized,
        isIqrarContext,
        judgeDecision,
        showGrievanceStep,
    } = props;

    if (
        !(
            isDefendantClient &&
            !isIqrarContext &&
            fileStatus === 'pending' &&
            judgeDecision.decision === null &&
            !isFinalized &&
            !defenderPhase1ReadOnly
        )
    ) {
        return null;
    }

    return (
        <div className="border border-white/10 rounded-lg px-3 py-2">
            <div className="flex items-center justify-between gap-3">
                <div className="text-white text-sm">
                    بصفتك وكيل المطلوب ضده، هل القرار صادر مسبقاً وتريد الانتقال لمرحلة {showGrievanceStep ? 'التظلم' : 'الطعن التمييزي'} مباشرة؟
                </div>
                <button
                    type="button"
                    onClick={fastForwardToGrievance}
                    className="shrink-0 min-h-[44px] px-3 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-bold touch-manipulation"
                >
                    تخطي إلى {showGrievanceStep ? 'التظلم' : 'التمييز'}
                </button>
            </div>
        </div>
    );
}
