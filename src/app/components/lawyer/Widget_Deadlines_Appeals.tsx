import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, AlertTriangle, CheckCircle2, X, Calendar, FileText, Gavel } from '@/app/components/ui/lucideIcons';
import { SmartToast } from '@/app/components/ui/SmartToast';

interface Props {
    executionDate: string | null;
    onGrievanceFiled: (data: { filingDate: string; sessionDate: string }) => void;
    onGrievanceDecision: (data: { decision: 'confirmed' | 'modified' | 'canceled'; decisionDate: string }) => void;
    onCassationFiled: (data: { filedBy: 'client' | 'opponent'; filingDate: string; fileNumber: string }) => void;
}

type Phase = 'inactive' | 'grievance-3days' | 'grievance-hearing' | 'cassation-7days' | 'final';

/**
 * ⏱️ Widget رادار المواعيد القانونية والطعون
 * 
 * نظام متقدم لتتبع المواعيد الحرجة:
 * - المرحلة 1: العد التنازلي 3 أيام للتظلم
 * - المرحلة 2: العد التنازلي 7 أيام للتمييز
 */

export const Widget_Deadlines_Appeals: React.FC<Props> = ({
    executionDate,
    onGrievanceFiled,
    onGrievanceDecision,
    onCassationFiled
}) => {
    const [phase, setPhase] = useState<Phase>('inactive');
    const [daysLeft, setDaysLeft] = useState<number>(0);
    
    // Modal States
    const [isGrievanceModalOpen, setIsGrievanceModalOpen] = useState(false);
    const [isGrievanceDecisionModalOpen, setIsGrievanceDecisionModalOpen] = useState(false);
    const [isCassationModalOpen, setIsCassationModalOpen] = useState(false);
    
    // Form States
    const [grievanceForm, setGrievanceForm] = useState({ filingDate: '', sessionDate: '' });
    const [grievanceDecisionForm, setGrievanceDecisionForm] = useState<{
        decision: 'confirmed' | 'modified' | 'canceled' | null;
        decisionDate: string;
    }>({ decision: null, decisionDate: '' });
    const [cassationForm, setCassationForm] = useState<{
        filedBy: 'client' | 'opponent' | null;
        filingDate: string;
        fileNumber: string;
    }>({ filedBy: null, filingDate: '', fileNumber: '' });

    // 🔥 CRITICAL: Calculate days left based on phase
    useEffect(() => {
        if (!executionDate && phase === 'inactive') {
            return;
        }

        if (phase === 'grievance-3days' && executionDate) {
            const exec = new Date(executionDate);
            const expiry = new Date(exec);
            expiry.setDate(expiry.getDate() + 3);
            
            const today = new Date();
            const diff = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            setDaysLeft(diff);
            
            if (diff <= 0) {
                setPhase('final');
            }
        }
        
        if (phase === 'cassation-7days' && grievanceDecisionForm.decisionDate) {
            const decision = new Date(grievanceDecisionForm.decisionDate);
            const expiry = new Date(decision);
            expiry.setDate(expiry.getDate() + 7);
            
            const today = new Date();
            const diff = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            setDaysLeft(diff);
            
            if (diff <= 0) {
                setPhase('final');
            }
        }
    }, [phase, executionDate, grievanceDecisionForm.decisionDate]);

    // Activate Phase 1 when execution date is provided
    useEffect(() => {
        if (executionDate && phase === 'inactive') {
            setPhase('grievance-3days');
        }
    }, [executionDate, phase]);

    // 🔥 HANDLERS
    const handleGrievanceSubmit = () => {
        if (!grievanceForm.filingDate || !grievanceForm.sessionDate) {
            SmartToast.error('⚠️ يرجى ملء جميع الحقول');
            return;
        }
        
        onGrievanceFiled(grievanceForm);
        setPhase('grievance-hearing');
        setIsGrievanceModalOpen(false);
    };

    const handleGrievanceDecisionSubmit = () => {
        if (!grievanceDecisionForm.decision || !grievanceDecisionForm.decisionDate) {
            SmartToast.error('⚠️ يرجى ملء جميع الحقول');
            return;
        }
        
        onGrievanceDecision({
            decision: grievanceDecisionForm.decision,
            decisionDate: grievanceDecisionForm.decisionDate
        });
        setPhase('cassation-7days');
        setIsGrievanceDecisionModalOpen(false);
    };

    const handleCassationSubmit = () => {
        if (!cassationForm.filedBy || !cassationForm.filingDate || !cassationForm.fileNumber) {
            SmartToast.error('⚠️ يرجى ملء جميع الحقول');
            return;
        }
        
        onCassationFiled({
            filedBy: cassationForm.filedBy,
            filingDate: cassationForm.filingDate,
            fileNumber: cassationForm.fileNumber
        });
        setPhase('final');
        setIsCassationModalOpen(false);
    };

    // 🔥 DYNAMIC COLOR LOGIC
    const getProgressColor = () => {
        if (phase === 'grievance-3days') {
            if (daysLeft >= 3) return { bg: 'from-green-600 to-emerald-600', text: 'text-green-400', border: 'border-green-500' };
            if (daysLeft === 2) return { bg: 'from-amber-600 to-yellow-600', text: 'text-amber-400', border: 'border-amber-500' };
            if (daysLeft <= 1) return { bg: 'from-red-600 to-rose-600', text: 'text-red-400', border: 'border-red-500', pulse: true };
        }
        
        if (phase === 'cassation-7days') {
            if (daysLeft >= 4) return { bg: 'from-blue-600 to-cyan-600', text: 'text-blue-400', border: 'border-blue-500' };
            if (daysLeft >= 1 && daysLeft <= 3) return { bg: 'from-red-600 to-rose-600', text: 'text-red-400', border: 'border-red-500', pulse: true };
        }
        
        return { bg: 'from-gray-600 to-slate-600', text: 'text-gray-400', border: 'border-gray-500' };
    };

    const colorConfig = getProgressColor();

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`
                    border-2 rounded-2xl p-6
                    ${phase === 'inactive' 
                        ? 'bg-slate-900/50 border-gray-600/30' 
                        : phase === 'grievance-hearing'
                        ? 'bg-gradient-to-br from-orange-900/20 to-red-900/20 border-orange-500/50'
                        : phase === 'final'
                        ? 'bg-gradient-to-br from-amber-900/20 to-yellow-900/20 border-amber-500/50'
                        : 'bg-gradient-to-br from-slate-800 to-slate-900 border-white/10'
                    }
                `}
            >
                <div className="flex items-center gap-3 mb-6">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${phase === 'inactive' ? 'bg-gray-700/50' : 'bg-gradient-to-br from-amber-500/20 to-yellow-500/20'}`}>
                        <Clock className={phase === 'inactive' ? 'text-gray-500' : 'text-amber-400'} size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-white font-bold text-xl">⏱️ رادار المواعيد القانونية والطعون</h3>
                        <p className="text-white/60 text-xs">Legal Deadlines & Appeals Tracking System</p>
                    </div>
                </div>

                {/* 🔥 PHASE: INACTIVE (Default) */}
                {phase === 'inactive' && (
                    <div className="text-center py-8">
                        <div className="w-20 h-20 mx-auto rounded-full bg-gray-700/30 flex items-center justify-center mb-4">
                            <span className="text-5xl">💤</span>
                        </div>
                        <p className="text-gray-400 text-base font-bold mb-2">في انتظار تسجيل تنفيذ الأمر الولائي</p>
                        <p className="text-gray-500 text-sm">سيبدأ احتساب المواعيد تلقائياً بمجرد إدخال تاريخ التنفيذ</p>
                    </div>
                )}

                {/* 🔥 PHASE 1: GRIEVANCE 3-DAYS COUNTDOWN */}
                {phase === 'grievance-3days' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-6"
                    >
                        {/* Progress Bar */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-white font-bold text-lg">⏳ فترة التظلم القانونية (3 أيام)</p>
                                <span className={`${colorConfig.text} font-bold text-2xl ${colorConfig.pulse ? 'animate-pulse' : ''}`}>
                                    {daysLeft > 0 ? `${daysLeft} يوم` : 'انتهت'}
                                </span>
                            </div>
                            <div className="h-3 bg-gray-700/50 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full bg-gradient-to-r ${colorConfig.bg} transition-all duration-500 ${colorConfig.pulse ? 'animate-pulse' : ''}`}
                                    style={{ width: `${Math.max(0, Math.min(100, (daysLeft / 3) * 100))}%` }}
                                />
                            </div>
                            <p className="text-white/60 text-xs mt-2">
                                البداية: {executionDate && new Date(executionDate).toLocaleDateString('ar-IQ')} • 
                                النهاية: {executionDate && new Date(new Date(executionDate).setDate(new Date(executionDate).getDate() + 3)).toLocaleDateString('ar-IQ')}
                            </p>
                        </div>

                        {/* Action Button */}
                        {daysLeft > 0 && (
                            <button type="button"
                                onClick={() => setIsGrievanceModalOpen(true)}
                                className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold text-sm transition-all flex items-center justify-center gap-2"
                            >
                                <AlertTriangle size={18} />
                                ⚖️ الخصم قدم تظلماً
                            </button>
                        )}
                    </motion.div>
                )}

                {/* 🔥 PHASE: GRIEVANCE HEARING (Waiting for decision) */}
                {phase === 'grievance-hearing' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-6"
                    >
                        <div className="bg-orange-900/30 border-2 border-orange-500/50 rounded-lg p-4">
                            <div className="flex items-center gap-3 mb-3">
                                <AlertTriangle className="text-orange-400 animate-pulse" size={24} />
                                <h4 className="text-orange-300 font-bold text-lg">⚠️ الإضبارة الآن قيد مرافعة التظلم</h4>
                            </div>
                            <p className="text-orange-100/80 text-sm">
                                تم تقديم تظلم من الخصم. الإجراء تحول من سري إلى وجاهي.
                            </p>
                            {grievanceForm.sessionDate && (
                                <p className="text-orange-200 text-xs mt-2">
                                    📅 موعد الجلسة: {new Date(grievanceForm.sessionDate).toLocaleDateString('ar-IQ')}
                                </p>
                            )}
                        </div>

                        <button type="button"
                            onClick={() => setIsGrievanceDecisionModalOpen(true)}
                            className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold text-sm transition-all flex items-center justify-center gap-2"
                        >
                            <FileText size={18} />
                            📜 إدخال قرار القاضي بنتيجة التظلم
                        </button>
                    </motion.div>
                )}

                {/* 🔥 PHASE 2: CASSATION 7-DAYS COUNTDOWN */}
                {phase === 'cassation-7days' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-6"
                    >
                        {/* Progress Bar */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-white font-bold text-lg">🔴 فترة الطعن التمييزي (7 أيام)</p>
                                <span className={`${colorConfig.text} font-bold text-2xl ${colorConfig.pulse ? 'animate-pulse' : ''}`}>
                                    {daysLeft > 0 ? `${daysLeft} يوم` : 'انتهت'}
                                </span>
                            </div>
                            <div className="h-3 bg-gray-700/50 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full bg-gradient-to-r ${colorConfig.bg} transition-all duration-500 ${colorConfig.pulse ? 'animate-pulse' : ''}`}
                                    style={{ width: `${Math.max(0, Math.min(100, (daysLeft / 7) * 100))}%` }}
                                />
                            </div>
                            <p className="text-white/60 text-xs mt-2">
                                قرار التظلم: {grievanceDecisionForm.decisionDate && new Date(grievanceDecisionForm.decisionDate).toLocaleDateString('ar-IQ')} • 
                                نهاية مدة التمييز: {grievanceDecisionForm.decisionDate && new Date(new Date(grievanceDecisionForm.decisionDate).setDate(new Date(grievanceDecisionForm.decisionDate).getDate() + 7)).toLocaleDateString('ar-IQ')}
                            </p>
                        </div>

                        {/* Grievance Decision Result */}
                        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                            <p className="text-blue-300 text-sm font-bold mb-1">نتيجة التظلم:</p>
                            <p className="text-white">
                                {grievanceDecisionForm.decision === 'confirmed' && '✅ تأييد الأمر الولائي'}
                                {grievanceDecisionForm.decision === 'modified' && '🔄 تعديل الأمر'}
                                {grievanceDecisionForm.decision === 'canceled' && '❌ إلغاء الأمر'}
                            </p>
                        </div>

                        {/* Action Button */}
                        {daysLeft > 0 && (
                            <button type="button"
                                onClick={() => setIsCassationModalOpen(true)}
                                className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-bold text-sm transition-all flex items-center justify-center gap-2"
                            >
                                <Gavel size={18} />
                                🏛️ تسجيل طعن تمييزي
                            </button>
                        )}
                    </motion.div>
                )}

                {/* 🔥 PHASE: FINAL */}
                {phase === 'final' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-8"
                    >
                        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex items-center justify-center mb-4">
                            <CheckCircle2 className="text-amber-400" size={40} />
                        </div>
                        <p className="text-amber-400 text-xl font-bold mb-2">⚖️ اكتسب القرار الدرجة القطعية</p>
                        <p className="text-white/70 text-sm">انتهت جميع المواعيد القانونية للطعون</p>
                    </motion.div>
                )}
            </motion.div>

            {/* 🔥 MODAL: LOG GRIEVANCE */}
            <AnimatePresence>
                {isGrievanceModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-gradient-to-br from-[#0B1021] to-[#0F1428] border-2 border-orange-500/30 rounded-2xl p-6 max-w-xl w-full"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                    <AlertTriangle className="text-orange-400" size={24} />
                                    إدخال تفاصيل التظلم
                                </h2>
                                <button type="button"
                                    onClick={() => setIsGrievanceModalOpen(false)}
                                    className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-white/70 text-sm mb-2">
                                        تاريخ تقديم التظلم <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={grievanceForm.filingDate}
                                        onChange={(e) => setGrievanceForm({ ...grievanceForm, filingDate: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-orange-500/50 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-white/70 text-sm mb-2">
                                        موعد مرافعة التظلم <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={grievanceForm.sessionDate}
                                        onChange={(e) => setGrievanceForm({ ...grievanceForm, sessionDate: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-orange-500/50 focus:outline-none"
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                                    <button type="button"
                                        onClick={() => setIsGrievanceModalOpen(false)}
                                        className="px-6 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-all"
                                    >
                                        إلغاء
                                    </button>
                                    <button type="button"
                                        onClick={handleGrievanceSubmit}
                                        className="px-8 py-2.5 rounded-lg bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold transition-all"
                                    >
                                        حفظ
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 🔥 MODAL: LOG GRIEVANCE DECISION */}
            <AnimatePresence>
                {isGrievanceDecisionModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-gradient-to-br from-[#0B1021] to-[#0F1428] border-2 border-blue-500/30 rounded-2xl p-6 max-w-xl w-full"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                    <FileText className="text-blue-400" size={24} />
                                    قرار القاضي بنتيجة التظلم
                                </h2>
                                <button type="button"
                                    onClick={() => setIsGrievanceDecisionModalOpen(false)}
                                    className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <p className="text-white/70 text-sm">ما هو قرار القاضي بنتيجة مرافعة التظلم؟</p>

                                <div className="space-y-2">
                                    <label className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg cursor-pointer">
                                        <input
                                            type="radio"
                                            name="grievanceDecision"
                                            checked={grievanceDecisionForm.decision === 'confirmed'}
                                            onChange={() => setGrievanceDecisionForm({ ...grievanceDecisionForm, decision: 'confirmed' })}
                                            className="accent-green-500"
                                        />
                                        <span className="text-white">✅ تأييد الأمر الولائي</span>
                                    </label>

                                    <label className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg cursor-pointer">
                                        <input
                                            type="radio"
                                            name="grievanceDecision"
                                            checked={grievanceDecisionForm.decision === 'modified'}
                                            onChange={() => setGrievanceDecisionForm({ ...grievanceDecisionForm, decision: 'modified' })}
                                            className="accent-amber-500"
                                        />
                                        <span className="text-white">🔄 تعديل الأمر</span>
                                    </label>

                                    <label className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg cursor-pointer">
                                        <input
                                            type="radio"
                                            name="grievanceDecision"
                                            checked={grievanceDecisionForm.decision === 'canceled'}
                                            onChange={() => setGrievanceDecisionForm({ ...grievanceDecisionForm, decision: 'canceled' })}
                                            className="accent-red-500"
                                        />
                                        <span className="text-white">❌ إلغاء الأمر</span>
                                    </label>
                                </div>

                                <div>
                                    <label className="block text-white/70 text-sm mb-2">
                                        تاريخ صدور قرار التظلم <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={grievanceDecisionForm.decisionDate}
                                        onChange={(e) => setGrievanceDecisionForm({ ...grievanceDecisionForm, decisionDate: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/50 focus:outline-none"
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                                    <button type="button"
                                        onClick={() => setIsGrievanceDecisionModalOpen(false)}
                                        className="px-6 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-all"
                                    >
                                        إلغاء
                                    </button>
                                    <button type="button"
                                        onClick={handleGrievanceDecisionSubmit}
                                        className="px-8 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold transition-all"
                                    >
                                        حفظ القرار
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 🔥 MODAL: LOG CASSATION */}
            <AnimatePresence>
                {isCassationModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-gradient-to-br from-[#0B1021] to-[#0F1428] border-2 border-purple-500/30 rounded-2xl p-6 max-w-xl w-full"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                    <Gavel className="text-purple-400" size={24} />
                                    تسجيل طعن تمييزي
                                </h2>
                                <button type="button"
                                    onClick={() => setIsCassationModalOpen(false)}
                                    className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <p className="text-white/70 text-sm">من قدم الطعن التمييزي؟</p>

                                <div className="space-y-2">
                                    <label className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg cursor-pointer">
                                        <input
                                            type="radio"
                                            name="cassationFiler"
                                            checked={cassationForm.filedBy === 'client'}
                                            onChange={() => setCassationForm({ ...cassationForm, filedBy: 'client' })}
                                            className="accent-green-500"
                                        />
                                        <span className="text-white">👤 موكلي (My Client)</span>
                                    </label>

                                    <label className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg cursor-pointer">
                                        <input
                                            type="radio"
                                            name="cassationFiler"
                                            checked={cassationForm.filedBy === 'opponent'}
                                            onChange={() => setCassationForm({ ...cassationForm, filedBy: 'opponent' })}
                                            className="accent-red-500"
                                        />
                                        <span className="text-white">⚔️ الخصم (The Opponent)</span>
                                    </label>
                                </div>

                                <div>
                                    <label className="block text-white/70 text-sm mb-2">
                                        تاريخ الطعن <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={cassationForm.filingDate}
                                        onChange={(e) => setCassationForm({ ...cassationForm, filingDate: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-purple-500/50 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-white/70 text-sm mb-2">
                                        رقم إضبارة التمييز <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={cassationForm.fileNumber}
                                        onChange={(e) => setCassationForm({ ...cassationForm, fileNumber: e.target.value })}
                                        placeholder="مثال: 2026/تمييز/456"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 focus:border-purple-500/50 focus:outline-none"
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                                    <button type="button"
                                        onClick={() => setIsCassationModalOpen(false)}
                                        className="px-6 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-all"
                                    >
                                        إلغاء
                                    </button>
                                    <button type="button"
                                        onClick={handleCassationSubmit}
                                        className="px-8 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-bold transition-all"
                                    >
                                        تسجيل الطعن
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};
