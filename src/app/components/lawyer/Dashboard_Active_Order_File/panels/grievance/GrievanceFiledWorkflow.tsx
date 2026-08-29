import React from 'react';
import { motion, AnimatePresence } from '@/app/motion/overlayMotionRuntime';
import type { GrievanceLifecyclePanelProps } from '../GrievanceLifecyclePanelProps';
import { GrievanceFiledDecisionSection } from './GrievanceFiledDecisionSection';
import { GrievanceFiledDetailsSection } from './GrievanceFiledDetailsSection';
import { GrievanceFiledHearingsSection } from './GrievanceFiledHearingsSection';

export function GrievanceFiledWorkflow(props: GrievanceLifecyclePanelProps) {
    const { grievanceData, grievanceTimingConfirmed } = props;

    return (
        <AnimatePresence initial={false}>
            {grievanceData.outcome === 'filed' && grievanceTimingConfirmed ? (
                <motion.div
                    key="grievance-filed"
                    initial={{ opacity: 0, y: -8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -8, height: 0 }}
                    transition={{ duration: 0.22, ease: 'easeInOut' }}
                    className="overflow-hidden space-y-5"
                >
                    <GrievanceFiledDetailsSection {...props} />
                    <GrievanceFiledHearingsSection {...props} />
                    <GrievanceFiledDecisionSection {...props} />
                </motion.div>
            ) : null}
        </AnimatePresence>
    );
}
