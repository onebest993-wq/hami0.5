import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { SmartToast } from '@/app/components/ui/SmartToast';

interface AddClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientName: string;
    clientPhone: string;
    onNameChange: (name: string) => void;
    onPhoneChange: (phone: string) => void;
    onSave: (name: string, phone: string) => void;
}

function AddClientModal({
    isOpen,
    onClose,
    clientName,
    clientPhone,
    onNameChange,
    onPhoneChange,
    onSave,
}: AddClientModalProps) {
    return (
        <AnimatePresence>
            {isOpen ? (
                <motion.div
                    key="add-client-modal"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex justify-center items-center p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ y: 16, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 16, opacity: 0 }}
                        className="w-full max-w-sm rounded-3xl border border-[#DAA520]/25 bg-[#0D0D1A]/95 shadow-2xl p-5"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="text-white font-bold">إضافة موكل جديد</div>
                            <button
                                type="button"
                                className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/5"
                                onClick={onClose}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <input
                                value={clientName}
                                onChange={(e) => onNameChange(e.target.value)}
                                placeholder="اسم الموكل"
                                className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-white/40 outline-none focus:border-[#DAA520]/50"
                            />
                            <input
                                value={clientPhone}
                                onChange={(e) => onPhoneChange(e.target.value)}
                                placeholder="رقم الهاتف (اختياري)"
                                className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-white/40 outline-none focus:border-[#DAA520]/50"
                            />
                            <button
                                type="button"
                                className="w-full h-12 rounded-2xl bg-[#DAA520]/20 border border-[#DAA520]/40 text-[#FFD700] font-bold hover:bg-[#DAA520]/30 transition-colors"
                                onClick={() => {
                                    const name = clientName.trim();
                                    if (!name) {
                                        SmartToast.warning('يرجى إدخال اسم الموكل');
                                        return;
                                    }
                                    onSave(name, clientPhone.trim());
                                }}
                            >
                                حفظ
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    );
}

export default AddClientModal;
