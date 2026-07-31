import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ValidationBanner } from '../../components/ValidationBanner';
import type { GrievanceLifecyclePanelProps } from '../GrievanceLifecyclePanelProps';
import { GrievancePhaseHeader } from './GrievancePhaseHeader';
import { GrievanceReadOnlySummaries } from './GrievanceReadOnlySummaries';
import { GrievanceTimingSection } from './GrievanceTimingSection';
import { GrievanceDigestSummary } from './GrievanceDigestSummary';
import { GrievanceOutcomeAndExpired } from './GrievanceOutcomeAndExpired';
import { GrievanceFiledWorkflow } from './GrievanceFiledWorkflow';
import { GrievanceFinalizeBar } from './GrievanceFinalizeBar';

export function GrievanceLifecyclePanel(props: GrievanceLifecyclePanelProps) {
    const {
        activeLifecycleStep,
        defenderPhase2ReadOnly,
        grievanceError,
        grievanceDecisionError,
        grievanceOutcomeGateRef,
        grievanceRef,
        hearingsError,
        isFinalized,
        showGrievanceDetailsSummary,
        showGrievanceOutcomeSummary,
        showGrievanceTimingSummary,
    } = props;

    const [grievanceDigestOpen, setGrievanceDigestOpen] = useState(true);
    const hasGrievanceDigest =
        showGrievanceTimingSummary || showGrievanceOutcomeSummary || showGrievanceDetailsSummary;

    return (
        <div ref={grievanceRef}>
            <GrievancePhaseHeader {...props} />

            <AnimatePresence initial={false}>
                {activeLifecycleStep === 'grievance' && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -8, height: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="pt-2 space-y-3"
                    >
                                                <div className="space-y-6">
                                                    {!!grievanceError && <ValidationBanner text={grievanceError} />}
                                                    {!!grievanceDecisionError && <ValidationBanner text={grievanceDecisionError} />}
                                                    {!!hearingsError && <ValidationBanner text={hearingsError} />}

                                                    <GrievanceReadOnlySummaries {...props} />

                                                    {!isFinalized && !defenderPhase2ReadOnly && (
                                                    <motion.div ref={grievanceOutcomeGateRef} className="space-y-4">
                                                    <GrievanceTimingSection {...props} />
                                                    <GrievanceDigestSummary
                                                        {...props}
                                                        grievanceDigestOpen={grievanceDigestOpen}
                                                        setGrievanceDigestOpen={setGrievanceDigestOpen}
                                                        hasGrievanceDigest={hasGrievanceDigest}
                                                    />
                                                    <GrievanceOutcomeAndExpired {...props} />
                                                    <GrievanceFiledWorkflow {...props} />
                                                    </motion.div>
                                                    )}

                                                    <GrievanceFinalizeBar {...props} />
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
    );
}
