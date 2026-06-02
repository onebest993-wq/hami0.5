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
        <div className="border border-blue-500/25 bg-blue-500/10 rounded-xl px-4 py-3">
            <div className="flex items-center justify-between gap-4">
                <div className="text-white text-sm font-bold">
                    💡 بصفتك وكيل المطلوب ضده، هل القرار صادر مسبقاً وتريد الانتقال لمرحلة {showGrievanceStep ? 'التظلم' : 'الطعن التمييزي'} مباشرة؟
                </div>
                <button
                    type="button"
                    onClick={fastForwardToGrievance}
                    className="shrink-0 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all"
                >
                    ⏩ تخطي إلى {showGrievanceStep ? 'التظلم' : 'التمييز'}
                </button>
            </div>
        </div>
    );
}
