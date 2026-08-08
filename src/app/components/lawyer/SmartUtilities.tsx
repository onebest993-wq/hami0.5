import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Scale, ChevronDown, Clock, Coins, Users } from '@/app/components/ui/lucideIcons';
import { SmartInheritanceCalculator } from './SmartInheritanceCalculator';
import { TabButton } from './SmartUtilities/TabButton';
import { LegalDeadlineEngine } from './SmartUtilities/LegalDeadlineEngine';
import { FeesCalculator } from './SmartUtilities/FeesCalculator';

export const SmartUtilities = ({ onClose }: { onClose: () => void }) => {
    const [activeTab, setActiveTab] = useState<'deadline' | 'fees' | 'inheritance'>('deadline');
    const [showFullInheritance, setShowFullInheritance] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    if (!mounted) return null;

    if (showFullInheritance) {
        return createPortal(
            <SmartInheritanceCalculator onClose={() => setShowFullInheritance(false)} />,
            document.body
        );
    }

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-end justify-center sm:items-center pointer-events-none">
            <AnimatePresence>
                <motion.div
                    key="backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-[2px] pointer-events-auto"
                />

                <motion.div
                    key="sheet"
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="bg-[#1A1E2E] w-full max-w-3xl h-[85vh] rounded-t-3xl border-t border-[#E6C673]/20 shadow-2xl flex flex-col pointer-events-auto overflow-hidden relative z-10"
                >
                    <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-[#131620]">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-[#E6C673]/10 rounded-lg text-[#E6C673]">
                                <Scale size={20} />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg">المحرك القانوني</h3>
                                <p className="text-white/40 text-[10px]">أدوات الحساب والمدد</p>
                            </div>
                        </div>
                        <button type="button" onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/50 hover:text-white transition-colors">
                            <ChevronDown size={24} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
                        <div className="flex p-1 gap-2 border border-white/5 bg-[#131620] rounded-xl mb-6">
                            <TabButton active={activeTab === 'deadline'} onClick={() => setActiveTab('deadline')} icon={Clock} label="محرك المدد" />
                            <TabButton active={activeTab === 'fees'} onClick={() => setActiveTab('fees')} icon={Coins} label="الرسوم القضائية" />
                            <TabButton active={showFullInheritance} onClick={() => setShowFullInheritance(true)} icon={Users} label="الحاسبة الإرثية" />
                        </div>

                        <div className="pb-8">
                            <AnimatePresence mode="wait">
                                {activeTab === 'deadline' && <LegalDeadlineEngine key="deadline" />}
                                {activeTab === 'fees' && <FeesCalculator key="fees" />}
                            </AnimatePresence>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>,
        document.body
    );
};
