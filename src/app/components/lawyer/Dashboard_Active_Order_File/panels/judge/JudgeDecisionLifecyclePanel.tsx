import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { JudgeDecisionLifecyclePanelProps } from '../JudgeDecisionLifecyclePanelProps';
import { JudgeDecisionPhaseHeader } from './JudgeDecisionPhaseHeader';
import { JudgeDecisionReadOnlySummaries } from './JudgeDecisionReadOnlySummaries';
import { JudgeDecisionEditableWorkspace } from './JudgeDecisionEditableWorkspace';

export function JudgeDecisionLifecyclePanel(props: JudgeDecisionLifecyclePanelProps) {
    const {
        activeLifecycleStep,
        defenderPhase1ReadOnly,
        editJudge,
        fileStatus,
        isFinalized,
        judgeDecision,
    } = props;

    return (
                                <div
                                    className={`border rounded-xl overflow-hidden ${
                                        fileStatus === 'pending'
                                            ? 'border-blue-500/30'
                                            : judgeDecision.decision === 'accepted' || judgeDecision.decision === 'partially_accepted'
                                              ? 'border-green-500/30'
                                              : 'border-red-500/30'
                                    }`}
                                >
                                <JudgeDecisionPhaseHeader {...props} />

                                <AnimatePresence initial={false}>
                                    {activeLifecycleStep === 'judge' && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="px-4 py-5 bg-[#0B1021] border-t border-white/10"
                                        >
                                            <JudgeDecisionReadOnlySummaries {...props} />
                                            {(fileStatus === 'pending' || editJudge) && !(defenderPhase1ReadOnly && !isFinalized) && (
                                            <JudgeDecisionEditableWorkspace {...props} />
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                        </div>
    );
}
