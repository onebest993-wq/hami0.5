import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { CassationLifecyclePanelProps } from '../CassationLifecyclePanelProps';
import { CassationPhaseHeader } from './CassationPhaseHeader';
import { CassationPhaseBody } from './CassationPhaseBody';

export function CassationLifecyclePanel(props: CassationLifecyclePanelProps) {
    const { activeLifecycleStep, cassationRef } = props;

    return (
        <div ref={cassationRef}>
            <CassationPhaseHeader {...props} />

            <AnimatePresence initial={false}>
                {activeLifecycleStep === 'cassation' && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -8, height: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="pt-2"
                    >
                                                <CassationPhaseBody {...props} />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
    );
}
