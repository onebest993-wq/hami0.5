import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Scale } from 'lucide-react';

interface LegalActionsMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onNotification?: () => void;
    onAddProvisionalOrder?: () => void;
    onAbandon?: () => void;
    onInterrupt?: () => void;
    onPause?: () => void;
    onResume?: () => void;
    isPaused?: boolean;
    isInterrupted?: boolean;
    onAction: (action: string) => void;
    onAddSessionRecord?: () => void;
    currentStageName?: string;
}

export const LegalActionsMenu = ({ isOpen, onClose, onNotification, onAddProvisionalOrder, onAbandon, onInterrupt, onPause, onResume, isPaused, isInterrupted, onAction, onAddSessionRecord, currentStageName = '' }: LegalActionsMenuProps) => {
    const isAppeal = currentStageName.includes('استئناف') || currentStageName.includes('Appeal');
    const incidentalLabel = isAppeal ? 'شخص ثالث 👥' : 'دعوى حادثة ⚖️';

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" />
                    <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="fixed bottom-0 left-0 right-0 bg-[#1A1E2E] border-t border-[#E6C673]/30 rounded-t-3xl p-6 z-[101] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] max-h-[80vh] overflow-y-auto scrollbar-hide">
                        <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-6" />
                        <h3 className="text-[#E6C673] font-bold text-lg mb-6 text-center flex items-center justify-center gap-2"> <Scale size={20} /> إجراءات الدعوى القانونية </h3>
                        <div className="flex flex-col gap-3">
                            {onAddSessionRecord && (
                                <button type="button" onClick={() => { onAddSessionRecord(); onClose(); }} className="w-full p-4 rounded-xl bg-indigo-600/20 border border-indigo-500/40 hover:bg-indigo-600/30 hover:border-indigo-500/60 flex items-center gap-3 transition-all group shadow-[0_0_15px_rgba(79,70,229,0.15)]">
                                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center group-hover:scale-110 transition-transform"> <span className="text-xl">📝</span> </div>
                                    <div className="flex flex-col items-start">
                                        <span className="font-bold text-indigo-300 text-sm">تسجيل إجراء / محضر جلسة</span>
                                        <span className="text-[10px] text-white/40">تدوين وقائع الجلسة أو الإجراءات</span>
                                    </div>
                                </button>
                            )}

                            {onNotification && <button type="button" onClick={() => { onNotification(); onClose(); }} className="w-full p-4 rounded-xl bg-sky-900/10 border border-sky-500/20 hover:bg-sky-900/20 hover:border-sky-500/40 flex items-center gap-3 transition-all group"> <div className="w-10 h-10 rounded-full bg-sky-500/10 flex items-center justify-center group-hover:scale-110 transition-transform"> <span className="text-xl">📢</span> </div> <div className="flex flex-col items-start"> <span className="font-bold text-sky-400 text-sm">حالة التبليغ القضائي</span> <span className="text-[10px] text-white/40">تحديث حالة التبليغ</span> </div> </button>}
                            {onAddProvisionalOrder && <button type="button" onClick={() => { onAddProvisionalOrder(); onClose(); }} className="w-full p-4 rounded-xl bg-rose-900/10 border border-rose-500/20 hover:bg-rose-900/20 hover:border-rose-500/40 flex items-center gap-3 transition-all group"> <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center group-hover:scale-110 transition-transform"> <span className="text-xl">🔒</span> </div> <div className="flex flex-col items-start"> <span className="font-bold text-rose-400 text-sm">إصدار قرار ولائي / حجز</span> <span className="text-[10px] text-white/40">طلب حجز احتياطي</span> </div> </button>}
                            {onAbandon && !isInterrupted && <button type="button" onClick={() => { onAbandon(); onClose(); }} className="w-full p-4 rounded-xl bg-orange-900/10 border border-orange-500/20 hover:bg-orange-900/20 hover:border-orange-500/40 flex items-center gap-3 transition-all group"> <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center group-hover:scale-110 transition-transform"> <span className="text-xl">⏸️</span> </div> <div className="flex flex-col items-start"> <span className="font-bold text-orange-400 text-sm">ترك الدعوى للمراجعة</span> <span className="text-[10px] text-white/40">إبطال عريضة الدعوى</span> </div> </button>}
                            {onInterrupt && <button type="button" onClick={() => { onInterrupt(); onClose(); }} className="w-full p-4 rounded-xl bg-red-900/10 border border-red-500/20 hover:bg-red-900/20 hover:border-red-500/40 flex items-center gap-3 transition-all group"> <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center group-hover:scale-110 transition-transform"> <span className="text-xl">🛑</span> </div> <div className="flex flex-col items-start"> <span className="font-bold text-red-400 text-sm">{isInterrupted ? 'استئناف السير' : 'انقطاع السير في الدعوى'}</span> <span className="text-[10px] text-white/40">وفاة أو فقدان أهلية</span> </div> </button>}
                            {(onPause || onResume) && <button type="button" onClick={() => { isPaused ? onResume() : onPause(); onClose(); }} className="w-full p-4 rounded-xl bg-amber-900/10 border border-amber-500/20 hover:bg-amber-900/20 hover:border-amber-500/40 flex items-center gap-3 transition-all group"> <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform"> <span className="text-xl">⏱️</span> </div> <div className="flex flex-col items-start"> <span className="font-bold text-amber-400 text-sm">{isPaused ? 'استئناف السير' : 'استئخار الدعوى'}</span> <span className="text-[10px] text-white/40">لوجود دعوى مرتبطة</span> </div> </button>}
                            <button type="button" onClick={() => { onAction('incidental'); onClose(); }} className="w-full p-4 rounded-xl bg-purple-900/10 border border-purple-500/20 hover:bg-purple-900/20 hover:border-purple-500/40 flex items-center gap-3 transition-all group"> <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform"> <span className="text-xl">⚖️</span> </div> <div className="flex flex-col items-start"> <span className="font-bold text-purple-400 text-sm">{incidentalLabel}</span> <span className="text-[10px] text-white/40">إدخال شخص ثالث</span> </div> </button>
                            <button type="button" onClick={() => { onAction('interlocutory_appeal'); onClose(); }} className="w-full p-4 rounded-xl bg-indigo-900/10 border border-indigo-500/20 hover:bg-indigo-900/20 hover:border-indigo-500/40 flex items-center gap-3 transition-all group"> <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center group-hover:scale-110 transition-transform"> <span className="text-xl">📜</span> </div> <div className="flex flex-col items-start"> <span className="font-bold text-indigo-400 text-sm">تمييز القرارات</span> <span className="text-[10px] text-white/40">الطعن في القرارات الإعدادية</span> </div> </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
