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
                                                <div className="flex items-center justify-end">
                                                    <button
                                                        type="button"
                                                        onClick={() => void registerOpponentIntervention()}
                                                        disabled={isFinalized}
                                                        className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        تسجيل تدخل الخصم والتحويل لمسار وجاهي
                                                    </button>
                                                </div>
                                            ) : null}
                                            {isStateOrder && !isCaseTerminated && hasIntervention && !defenderPhase1ReadOnly ? (
                                                <div className="flex items-center justify-end">
                                                    <div className="px-4 py-2 rounded-lg border border-amber-500/25 bg-amber-500/10 text-amber-100 text-xs font-bold">
                                                        ✓ تم تسجيل تدخل الخصم — المسار وجاهي
                                                    </div>
                                                </div>
                                            ) : null}
        </>
    );
}
