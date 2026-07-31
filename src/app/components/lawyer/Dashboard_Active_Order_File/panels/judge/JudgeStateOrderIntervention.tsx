import React from 'react';
import type { JudgeDecisionLifecyclePanelProps } from '../JudgeDecisionLifecyclePanelProps';

export function JudgeStateOrderIntervention(props: JudgeDecisionLifecyclePanelProps) {
    const {
        defenderPhase1ReadOnly,
        hasIntervention,
        isCaseTerminated,
        isFinalized,
        isStateOrder,
        registerOpponentIntervention,
    } = props;

    return (
        <>
                                            {isStateOrder && !isCaseTerminated && !hasIntervention && !defenderPhase1ReadOnly ? (
                                                <button
                                                    type="button"
                                                    onClick={() => void registerOpponentIntervention()}
                                                    disabled={isFinalized}
                                                    className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-white/80 hover:text-white text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                                                >
                                                    تسجيل تدخل الخصم والتحويل لمسار وجاهي
                                                </button>
                                            ) : null}
                                            {isStateOrder && !isCaseTerminated && hasIntervention && !defenderPhase1ReadOnly ? (
                                                <div className="text-center px-3 py-2 rounded-lg border border-amber-500/25 bg-amber-500/10 text-amber-100 text-xs font-bold">
                                                    تم تسجيل تدخل الخصم — المسار وجاهي
                                                </div>
                                            ) : null}
        </>
    );
}
