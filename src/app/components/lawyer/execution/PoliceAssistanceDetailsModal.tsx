import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { X, Shield } from 'lucide-react';
import { EXEC_MODAL_Z } from '@/app/components/lawyer/execution/executionModalStack';

export interface PoliceAssistanceDetailsModalProps {
    open: boolean;
    requestTitle: string;
    initialAgencyName?: string;
    onClose: () => void;
    onConfirm: (payload: { agencyName: string }) => void;
}

export const PoliceAssistanceDetailsModal: React.FC<PoliceAssistanceDetailsModalProps> = ({
    open,
    requestTitle,
    initialAgencyName,
    onClose,
    onConfirm,
}) => {
    const [agencyName, setAgencyName] = useState('');

    useEffect(() => {
        if (open) {
            setAgencyName(String(initialAgencyName || '').trim());
        }
    }, [open, initialAgencyName]);

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
                <p className="text-gray-400 text-xs text-right mb-4 leading-relaxed">{requestTitle}</p>

                <div className="space-y-4">
                    <div>
                        <label className="text-gray-400 text-sm mb-2 block">الجهة المرافقة</label>
                        <input
                            type="text"
                            value={agencyName}
                            onChange={(e) => setAgencyName(e.target.value)}
                            className="w-full backdrop-blur-xl bg-slate-800/30 border border-amber-500/20 rounded-2xl p-3 text-white focus:outline-none focus:border-amber-500/50 transition-all"
                            placeholder="مثال: مركز شرطة ... / قوات ..."
                        />
                    </div>
                </div>

                <button
                    type="button"
                    disabled={!agencyName.trim()}
                    onClick={() => {
                        const v = agencyName.trim();
                        if (!v) return;
                        onConfirm({ agencyName: v });
                        onClose();
                    }}
                    className="w-full bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-2xl transition-all shadow-lg shadow-amber-500/20 hover:shadow-amber-500/35 mt-4"
                >
                    حفظ وربطه بالمواعيد والسجل
                </button>
            </motion.div>
        </div>
    );
};

export default PoliceAssistanceDetailsModal;
