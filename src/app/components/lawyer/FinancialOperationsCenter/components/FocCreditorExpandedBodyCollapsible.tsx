import { motion } from '@/app/motion/overlayMotionRuntime';
import React from 'react';

export function FocCreditorExpandedBodyCollapsible({
    className,
    children,
}: {
    className: string;
    children: React.ReactNode;
}): React.ReactElement {
    return (
        <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={className}
        >
            {children}
        </motion.div>
    );
}
