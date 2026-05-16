import React from 'react';
import { motion } from 'motion/react';
import { Scale, X, ChevronRight, FileText, Clock } from 'lucide-react';

interface Props {
    onClose: () => void;
    onSelectType: (type: 'civil' | 'sharia' | 'urgent') => void;
}

/**
 * 🏛️ قائمة فرعية للدعاوى
 * تحتوي على: القضاء المدني (مع قوائم فرعية) والقضاء الشرعي
 */

export const LawsuitSubMenu: React.FC<Props> = ({ onClose, onSelectType }) => {
    const [selectedCategory, setSelectedCategory] = React.useState<'civil' | 'sharia' | null>(null);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-md flex items-center justify-center p-6"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-2xl bg-gradient-to-b from-[#0B1021] to-[#151925] rounded-3xl border border-[#E6C673]/30 overflow-hidden shadow-2xl"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-[#1A1E2E] to-[#0F1428] border-b border-[#E6C673]/20 p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-[#E6C673]/20 flex items-center justify-center">
                                <Scale size={24} className="text-[#E6C673]" />
                            </div>
                            <div>
                                <h2 className="text-white text-xl font-bold">إدارة الدعاوى القضائية</h2>
                                <p className="text-white/40 text-sm">اختر نوع القضاء</p>
                            </div>
                        </div>
                        <button type="button"
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {selectedCategory === null && (
                        <>
                            {/* القضاء المدني */}
                            <button type="button"
                                onClick={() => setSelectedCategory('civil')}
                                className="w-full group relative bg-gradient-to-br from-[#1A1E2E] to-[#151925] rounded-2xl p-6 border-2 border-white/10 hover:border-[#3B82F6]/50 transition-all overflow-hidden"
                            >
                                {/* Glow effect */}
                                <div className="absolute inset-0 bg-gradient-to-br from-[#3B82F6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                
                                <div className="relative flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-full bg-[#3B82F6]/20 flex items-center justify-center">
                                            <Scale size={28} className="text-[#3B82F6]" />
                                        </div>
                                        <div className="text-right">
                                            <h3 className="text-white font-bold text-lg mb-1">القضاء المدني</h3>
                                            <p className="text-white/50 text-sm">الدعاوى العادية والطلبات المستعجلة</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={24} className="text-white/30 group-hover:text-[#3B82F6] transition-colors" />
                                </div>
                            </button>

                            {/* القضاء الشرعي */}
                            <button type="button"
                                onClick={() => onSelectType('sharia')}
                                className="w-full group relative bg-gradient-to-br from-[#1A1E2E] to-[#151925] rounded-2xl p-6 border-2 border-white/10 hover:border-[#10B981]/50 transition-all overflow-hidden"
                            >
                                {/* Glow effect */}
                                <div className="absolute inset-0 bg-gradient-to-br from-[#10B981]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                
                                <div className="relative flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-full bg-[#10B981]/20 flex items-center justify-center">
                                            <FileText size={28} className="text-[#10B981]" />
                                        </div>
                                        <div className="text-right">
                                            <h3 className="text-white font-bold text-lg mb-1">القضاء الشرعي</h3>
                                            <p className="text-white/50 text-sm">الأحوال الشخصية، الطلاق، النفقة، الإرث</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={24} className="text-white/30 group-hover:text-[#10B981] transition-colors" />
                                </div>
                            </button>
                        </>
                    )}

                    {/* Civil Sub-Categories */}
                    {selectedCategory === 'civil' && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-3"
                        >
                            {/* Back Button */}
                            <button type="button"
                                onClick={() => setSelectedCategory(null)}
                                className="flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-4"
                            >
                                <ChevronRight size={20} className="rotate-180" />
                                <span className="text-sm">رجوع</span>
                            </button>

                            {/* الدعاوى العادية */}
                            <button type="button"
                                onClick={() => onSelectType('civil')}
                                className="w-full group relative bg-gradient-to-br from-[#1E40AF] to-[#1E3A8A] rounded-xl p-5 border border-[#3B82F6]/30 hover:border-[#3B82F6] transition-all overflow-hidden"
                            >
                                <div className="relative flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                                        <Scale size={22} className="text-white" />
                                    </div>
                                    <div className="text-right flex-1">
                                        <h4 className="text-white font-bold text-base mb-0.5">الدعاوى المدنية العادية</h4>
                                        <p className="text-white/60 text-xs">بداءة، استئناف، تمييز</p>
                                    </div>
                                    <ChevronRight size={20} className="text-white/40" />
                                </div>
                            </button>

                            {/* الطلبات المستعجلة والأوامر */}
                            <button type="button"
                                onClick={() => onSelectType('urgent')}
                                className="w-full group relative bg-gradient-to-br from-[#DC2626] to-[#B91C1C] rounded-xl p-5 border border-[#EF4444]/30 hover:border-[#EF4444] transition-all overflow-hidden"
                            >
                                <div className="relative flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                                        <Clock size={22} className="text-white" />
                                    </div>
                                    <div className="text-right flex-1">
                                        <h4 className="text-white font-bold text-base mb-0.5">الطلبات المستعجلة والأوامر</h4>
                                        <p className="text-white/60 text-xs">أوامر الأداء، الحجز التحفظي، المنع من السفر</p>
                                    </div>
                                    <ChevronRight size={20} className="text-white/40" />
                                </div>
                            </button>
                        </motion.div>
                    )}
                </div>

                {/* Footer Hint */}
                <div className="border-t border-white/5 bg-white/[0.02] p-4">
                    <p className="text-white/30 text-xs text-center">
                        💡 ملاحظة: التنفيذ له قسم منفصل في القائمة الرئيسية
                    </p>
                </div>
            </motion.div>
        </motion.div>
    );
};
