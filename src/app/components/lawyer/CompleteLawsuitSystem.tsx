import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Scale, X } from 'lucide-react';
import { LawyerNewCase } from './LawyerNewCase';

interface Props {
    onClose: () => void;
    onSave: (data: any) => void;
}

type View = 'selector' | 'standard';

/**
 * 🏛️ Complete Lawsuit System
 * النظام الشامل لإدارة الدعاوى القضائية
 * 
 * 🔥 ملاحظة: الطلبات المستعجلة الآن مدمجة داخل الدعوى المدنية كتبويب منفصل
 */

const CompleteLawsuitSystemComponent: React.FC<Props> = ({ onClose, onSave }) => {
    const [currentView, setCurrentView] = useState<View>('standard');

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm font-['Tajawal']">
            <AnimatePresence mode="wait">
                {/* Top Selector View */}
                {currentView === 'selector' && (
                    <motion.div
                        key="selector"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="h-full flex flex-col"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-b from-[#0B1021] via-[#0F1428] to-[#0B1021] border-b border-[#E6C673]/20 p-6">
                            <div className="max-w-4xl mx-auto flex items-center justify-between">
                                <div>
                                    <h1 className="text-2xl font-bold text-white mb-1">
                                        إدارة الدعاوى القضائية (الشاملة)
                                    </h1>
                                    <p className="text-white/40 text-sm">
                                        ملف - مركز القيادة الذكي 11
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    aria-label="إغلاق"
                                    onClick={onClose}
                                    className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Tab Selector */}
                        <div className="bg-[#0B1021] border-b border-[#E6C673]/10 p-6">
                            <div className="max-w-4xl mx-auto">
                                <div className="flex flex-row w-full gap-3 px-4">
                                    {/* Tab 1: Standard Lawsuits */}
                                    <button type="button"
                                        onClick={() => setCurrentView('standard')}
                                        className="flex-1 h-full group relative bg-gradient-to-br from-[#1A1E2E] to-[#151925] rounded-2xl p-6 border-2 border-white/10 hover:border-[#E6C673]/50 transition-all overflow-hidden flex flex-col items-center justify-center text-center"
                                    >
                                        {/* Glow effect */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-[#E6C673]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        
                                        <div className="relative flex flex-col items-center justify-center text-center">
                                            <div className="w-16 h-16 rounded-full bg-[#E6C673]/20 flex items-center justify-center mb-3">
                                                <Scale size={32} className="text-[#E6C673]" />
                                            </div>
                                            <div className="text-center w-full">
                                                <h3 className="text-white font-bold text-lg mb-1 text-center break-words whitespace-normal w-full">
                                                    إدارة الدعاوى
                                                </h3>
                                                <p className="text-white/50 text-xs leading-relaxed text-center mt-2 line-clamp-2">
                                                    الدعاوى المدنية، الجزائية، الشرعية، الإدارية
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Content Placeholder */}
                        <div className="flex-1 flex items-center justify-center p-12">
                            <div className="text-center">
                                <div className="text-6xl mb-4">⚖️</div>
                                <p className="text-white/40 text-sm">
                                    انقر على "إدارة الدعاوى" للبدء
                                </p>
                                <p className="text-white/20 text-xs mt-2">
                                    💡 الطلبات المستعجلة متاحة داخل الدعاوى المدنية
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Standard Lawsuit Form */}
                {currentView === 'standard' && (
                    <motion.div
                        key="standard"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="h-full"
                    >
                        <LawyerNewCase
                            isOpen={true}
                            onClose={onClose}
                            onSave={onSave}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ✅ Memoize component to prevent unnecessary re-renders
export const CompleteLawsuitSystem = React.memo(CompleteLawsuitSystemComponent);
