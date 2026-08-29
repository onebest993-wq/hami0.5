import React from 'react';
import { motion, AnimatePresence } from '@/app/motion/overlayMotionRuntime';

type UrgentOverlayDialogProps = {
    open: boolean;
    onClose: () => void;
    overlayClassName: string;
    panelClassName: string;
    children: React.ReactNode;
};

export function UrgentOverlayDialog({
    open,
    onClose,
    overlayClassName,
    panelClassName,
    children,
}: UrgentOverlayDialogProps) {
    return (
        <AnimatePresence>
            {open ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={overlayClassName}
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={panelClassName}
                        onClick={(event: React.MouseEvent<HTMLDivElement>) => event.stopPropagation()}
                    >
                        {children}
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    );
}
