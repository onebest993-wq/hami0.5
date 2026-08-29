import React from 'react';
import { motion, AnimatePresence } from '@/app/motion/overlayMotionRuntime';
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
    } = props;

    const showWorkspace =
        (fileStatus === 'pending' || editJudge) && !(defenderPhase1ReadOnly && !isFinalized);

    return (
        <div>
            <JudgeDecisionPhaseHeader {...props} />

            <AnimatePresence initial={false}>
                {activeLifecycleStep === 'judge' && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pt-2 space-y-3"
                    >
                        <JudgeDecisionReadOnlySummaries {...props} />
                        {showWorkspace ? <JudgeDecisionEditableWorkspace {...props} /> : null}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
