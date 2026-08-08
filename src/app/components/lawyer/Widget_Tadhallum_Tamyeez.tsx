import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Scale, AlertCircle, CheckCircle2, FileText, ChevronRight } from '@/app/components/ui/lucideIcons';

interface Props {
    onPhaseComplete?: (phase: 'grievance' | 'cassation', data: any) => void;
}

type Phase = 'initial' | 'grievance_countdown' | 'grievance_result' | 'cassation_countdown' | 'completed';
type GrievanceResult = 'affirmed' | 'modified' | 'cancelled' | '';

export const Widget_Tadhallum_Tamyeez: React.FC<Props> = ({ onPhaseComplete }) => {
    // Phase Management
    const [currentPhase, setCurrentPhase] = useState<Phase>('initial');
    
    // Phase 1: Grievance (التظلم) - 3 Days
    const [orderDate, setOrderDate] = useState<string>('');
    const [grievanceDeadline, setGrievanceDeadline] = useState<Date | null>(null);
    const [grievanceTimeRemaining, setGrievanceTimeRemaining] = useState<number | null>(null);
    
    // Grievance Result
    const [grievanceResultDate, setGrievanceResultDate] = useState<string>('');
    const [grievanceResult, setGrievanceResult] = useState<GrievanceResult>('');
    const [isGrievanceResultModalOpen, setIsGrievanceResultModalOpen] = useState(false);
    
    // Phase 2: Cassation (التمييز) - 7 Days
    const [cassationDeadline, setCassationDeadline] = useState<Date | null>(null);
    const [cassationTimeRemaining, setCassationTimeRemaining] = useState<number | null>(null);

    // Calculate Grievance Deadline (3 days from order date)
    useEffect(() => {
        if (!orderDate) return;
        
        const deadline = new Date(orderDate);
        deadline.setDate(deadline.getDate() + 3);
        setGrievanceDeadline(deadline);
        setCurrentPhase('grievance_countdown');
    }, [orderDate]);

    // Grievance Countdown Timer
    useEffect(() => {
        if (!grievanceDeadline || currentPhase !== 'grievance_countdown') return;

        const interval = setInterval(() => {
            const now = Date.now();
            const diff = grievanceDeadline.getTime() - now;
            setGrievanceTimeRemaining(diff);
        }, 1000);

        return () => clearInterval(interval);
    }, [grievanceDeadline, currentPhase]);

    // Calculate Cassation Deadline (7 days from grievance result)
    useEffect(() => {
        if (!grievanceResultDate || currentPhase !== 'grievance_result') return;
        
        const deadline = new Date(grievanceResultDate);
        deadline.setDate(deadline.getDate() + 7);
        setCassationDeadline(deadline);
        setCurrentPhase('cassation_countdown');
    }, [grievanceResultDate, currentPhase]);

    // Cassation Countdown Timer
    useEffect(() => {
        if (!cassationDeadline || currentPhase !== 'cassation_countdown') return;

        const interval = setInterval(() => {
            const now = Date.now();
            const diff = cassationDeadline.getTime() - now;
            setCassationTimeRemaining(diff);
        }, 1000);

        return () => clearInterval(interval);
    }, [cassationDeadline, currentPhase]);

    const handleGrievanceResultSubmit = () => {
        if (!grievanceResultDate || !grievanceResult) return;
        
        onPhaseComplete?.('grievance', {
            resultDate: grievanceResultDate,
            result: grievanceResult
        });
        
        setIsGrievanceResultModalOpen(false);
        setCurrentPhase('grievance_result');
    };

    const formatTimeRemaining = (ms: number | null): string => {
        if (!ms || ms < 0) return 'انتهى الموعد';
        
        const days = Math.floor(ms / (1000 * 60 * 60 * 24));
        const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        
        if (days > 0) return `${days} يوم و ${hours} ساعة`;
        if (hours > 0) return `${hours} ساعة و ${minutes} دقيقة`;
        return `${minutes} دقيقة`;
    };

    const getProgressPercentage = (timeRemaining: number | null, totalDays: number): number => {
        if (!timeRemaining) return 0;
        const totalMs = totalDays * 24 * 60 * 60 * 1000;
        const remaining = Math.max(0, timeRemaining);
        return Math.min(100, (remaining / totalMs) * 100);
    };

    const getResultLabel = (result: GrievanceResult): string => {
        switch (result) {
            case 'affirmed': return 'تأييد الأمر';
            case 'modified': return 'تعديل الأمر';
            case 'cancelled': return 'إلغاء الأمر';
            default: return '';
        }
    };

    return (
        <div className="font-['Tajawal']">
            {/* PHASE 1: INITIAL - Order Date Input */}
            {currentPhase === 'initial' && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-purple-900/40 to-indigo-800/20 border-2 border-purple-500/40 rounded-2xl p-6 mb-6"
                >
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <Scale className="text-purple-400" size={24} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-white font-bold text-sm uppercase tracking-wide">
                                الخوارزمية المزدوجة: التظلم → التمييز
                            </h3>
                            <p className="text-white/50 text-xs mt-1">
                                نظام الطعن في الأوامر الولائية (3 أيام + 7 أيام)
                            </p>
                        </div>
                    </div>

                    <div>
                        <label className="text-white/80 text-xs font-bold mb-2 block flex items-center gap-2">
                            <Calendar size={12} />
                            تاريخ صدور الأمر / التبلغ به
                        </label>
                        <input
                            type="date"
                            value={orderDate}
                            onChange={(e) => setOrderDate(e.target.value)}
                            className="w-full bg-black/40 border border-white/20 rounded-lg px-4 py-3 text-white focus:border-[#E6C673] outline-none text-sm"
                            dir="ltr"
                        />
                    </div>
                </motion.div>
            )}

            {/* PHASE 2: GRIEVANCE COUNTDOWN (3 Days) */}
            {currentPhase === 'grievance_countdown' && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gradient-to-br from-orange-900/50 to-amber-800/30 border-2 border-amber-500 rounded-2xl p-6 mb-6"
                >
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center text-2xl">
                            ⏳
                        </div>
                        <div className="flex-1">
                            <h3 className="text-amber-200 font-bold text-sm uppercase tracking-wide">
                                المرحلة الأولى: التظلم (3 أيام)
                            </h3>
                            <p className="text-amber-300/60 text-xs mt-1">
                                أمام نفس القاضي مصدر الأمر
                            </p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-5">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-white/60 text-xs">الوقت المتبقي</span>
                            <span className="text-amber-200 text-sm font-bold font-mono">
                                {formatTimeRemaining(grievanceTimeRemaining)}
                            </span>
                        </div>
                        <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: '100%' }}
                                animate={{ width: `${getProgressPercentage(grievanceTimeRemaining, 3)}%` }}
                                transition={{ duration: 0.5 }}
                                className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
                            />
                        </div>
                    </div>

                    {/* Alert Message */}
                    <div className="bg-black/30 border border-amber-500/30 rounded-xl p-4 mb-5">
                        <p className="text-amber-200 text-sm font-bold text-center leading-relaxed">
                            ⏳ متبقي <span className="text-white">{formatTimeRemaining(grievanceTimeRemaining)}</span> لتقديم (التظلم) أمام نفس القاضي.
                        </p>
                    </div>

                    {/* Action Button */}
                    <button type="button"
                        onClick={() => setIsGrievanceResultModalOpen(true)}
                        className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-amber-500/30"
                    >
                        <Scale size={18} />
                        <span>إدخال نتيجة التظلم</span>
                    </button>
                </motion.div>
            )}

            {/* PHASE 3: CASSATION COUNTDOWN (7 Days) */}
            {currentPhase === 'cassation_countdown' && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-gradient-to-br from-red-900/60 to-rose-800/40 border-2 border-red-500 rounded-2xl p-6 mb-6"
                >
                    {/* Previous Phase Summary */}
                    <div className="bg-black/30 rounded-xl p-3 mb-5 border border-white/10">
                        <div className="flex items-center gap-2 text-xs">
                            <CheckCircle2 className="text-green-400" size={14} />
                            <span className="text-white/60">تم تسجيل نتيجة التظلم:</span>
                            <span className="text-white font-bold">{getResultLabel(grievanceResult)}</span>
                        </div>
                    </div>

                    {/* Header */}
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-2xl">
                            🔴
                        </div>
                        <div className="flex-1">
                            <h3 className="text-red-200 font-bold text-sm uppercase tracking-wide">
                                المرحلة الثانية: الطعن التمييزي (7 أيام)
                            </h3>
                            <p className="text-red-300/60 text-xs mt-1">
                                أمام محكمة التمييز الاتحادية
                            </p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-5">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-white/60 text-xs">الوقت المتبقي</span>
                            <span className="text-red-200 text-sm font-bold font-mono">
                                {formatTimeRemaining(cassationTimeRemaining)}
                            </span>
                        </div>
                        <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: '100%' }}
                                animate={{ width: `${getProgressPercentage(cassationTimeRemaining, 7)}%` }}
                                transition={{ duration: 0.5 }}
                                className="h-full bg-gradient-to-r from-red-500 to-rose-500"
                            />
                        </div>
                    </div>

                    {/* Alert Message */}
                    <div className="bg-black/30 border border-red-500/30 rounded-xl p-4">
                        <p className="text-red-200 text-sm font-bold text-center leading-relaxed">
                            🔴 متبقي <span className="text-white">{formatTimeRemaining(cassationTimeRemaining)}</span> للطعن التمييزي في قرار التظلم.
                        </p>
                    </div>
                </motion.div>
            )}

            {/* MODAL: Grievance Result Input */}
            <AnimatePresence>
                {isGrievanceResultModalOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="w-full max-w-md bg-[#1A1E2E] rounded-2xl shadow-2xl overflow-hidden border border-white/10"
                        >
                            {/* Modal Header */}
                            <div className="bg-gradient-to-r from-amber-900/50 to-orange-800/30 p-5 border-b border-white/10">
                                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                    <FileText size={20} className="text-amber-400" />
                                    تسجيل نتيجة التظلم
                                </h3>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 space-y-5">
                                <div>
                                    <label className="text-white/80 text-sm font-bold mb-2 block">
                                        تاريخ قرار التظلم
                                    </label>
                                    <input
                                        type="date"
                                        value={grievanceResultDate}
                                        onChange={(e) => setGrievanceResultDate(e.target.value)}
                                        className="w-full bg-[#2A3241] border border-white/15 rounded-lg px-4 py-3 text-white focus:border-[#E6C673] outline-none text-sm"
                                        dir="ltr"
                                    />
                                </div>

                                <div>
                                    <label className="text-white/80 text-sm font-bold mb-2 block">
                                        النتيجة
                                    </label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { value: 'affirmed', label: 'تأييد', color: 'red' },
                                            { value: 'modified', label: 'تعديل', color: 'amber' },
                                            { value: 'cancelled', label: 'إلغاء', color: 'green' }
                                        ].map((option) => (
                                            <button type="button"
                                                key={option.value}
                                                onClick={() => setGrievanceResult(option.value as GrievanceResult)}
                                                className={`py-3 px-4 rounded-lg border-2 transition-all text-sm font-bold ${
                                                    grievanceResult === option.value
                                                        ? `border-${option.color}-500 bg-${option.color}-500/20 text-${option.color}-300`
                                                        : 'border-white/10 bg-white/5 text-white/50 hover:border-white/30'
                                                }`}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 bg-black/30 border-t border-white/10 flex gap-3">
                                <button type="button"
                                    onClick={() => setIsGrievanceResultModalOpen(false)}
                                    className="flex-1 py-2.5 rounded-lg border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-all"
                                >
                                    إلغاء
                                </button>
                                <button type="button"
                                    onClick={handleGrievanceResultSubmit}
                                    disabled={!grievanceResultDate || !grievanceResult}
                                    className="flex-1 py-2.5 rounded-lg bg-[#E6C673] text-[#0B1021] font-bold hover:bg-[#F0D689] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <CheckCircle2 size={16} />
                                    تأكيد
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
