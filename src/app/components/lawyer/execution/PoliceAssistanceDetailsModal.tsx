import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { X, Shield } from '@/app/components/ui/lucideIcons';
import { EXEC_MODAL_Z } from '@/app/components/lawyer/execution/executionModalStack';
import { PoliceAssistanceInlineForm } from '@/app/components/lawyer/execution/PoliceAssistanceInlineForm';

export interface PoliceAssistanceDetailsModalProps {
    open: boolean;
    requestTitle: string;
    initialAgencyName?: string;
    onClose: () => void;
    onConfirm: (payload: { agencyName: string; linkToTasks: boolean }) => void;
}

export const PoliceAssistanceDetailsModal: React.FC<PoliceAssistanceDetailsModalProps> = ({
    open,
    requestTitle,
    initialAgencyName,
    onClose,
    onConfirm,
}) => {
    const wasOpenRef = useRef(false);

    useEffect(() => {
        wasOpenRef.current = open;
    }, [open]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-center justify-center p-4"
            style={{ zIndex: EXEC_MODAL_Z.nestedOverFollowUpPortal }}
            role="presentation"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="backdrop-blur-3xl bg-slate-900/40 border border-amber-500/20 rounded-3xl p-6 max-w-lg w-full shadow-2xl shadow-amber-500/10"
                onClick={(e) => e.stopPropagation()}
                dir="rtl"
            >
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent flex items-center gap-2">
                        <Shield size={18} className="text-amber-300" />
                        القوة الجبرية
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
                        aria-label="إغلاق"
                    >
                        <X size={24} />
                    </button>
                </div>
                <PoliceAssistanceInlineForm
                    embedded
                    requestTitle={requestTitle}
                    initialAgencyName={initialAgencyName}
                    onSave={({ agencyName, linkToTasks }) => {
                        onConfirm({ agencyName, linkToTasks });
                    }}
                />
            </motion.div>
        </div>
    );
};

export default PoliceAssistanceDetailsModal;
