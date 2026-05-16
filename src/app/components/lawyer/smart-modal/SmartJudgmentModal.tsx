import React, { useState, useRef, useEffect } from 'react';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertTriangle, Archive, Clock, Gavel, Check } from 'lucide-react';

interface SmartJudgmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: any) => void;
    currentParties: any[];
    currentStage: string;
    representedParty?: string;
}

export const SmartJudgmentModal: React.FC<SmartJudgmentModalProps> = ({ 
    isOpen, 
    onClose, 
    onConfirm,
    currentParties,
    currentStage,
    representedParty
}) => {
    const [judgmentType, setJudgmentType] = useState<string>('');
    const [judgmentForm, setJudgmentForm] = useState<string>('حضوري'); // Default: Presence
    const [nextStage, setNextStage] = useState<string>('');
    const [judgmentDate, setJudgmentDate] = useState<string>(getLocalTodayYmd());
    const [notes, setNotes] = useState<string>('');
    
    // Determine Role (Strict Asymmetric Logic)
    const isPlaintiffLawyer = representedParty === 'المدعي';
    const isDefendantLawyer = representedParty === 'المدعى عليه';
    
    // 🔥 NEW: Appellate Roles (for Appeal Stage)
    const myClientRole = currentParties?.find(p => p.role?.includes(representedParty || ''))?.role || '';
    const isAppellantLawyer = myClientRole.includes('مستأنف') && !myClientRole.includes('مستأنف عليه'); // Attacking the judgment
    const isAppelleeLawyer = myClientRole.includes('مستأنف عليه'); // Defending the judgment

    // Handle judgment type change
    const handleJudgmentChange = (value: string) => {
        setJudgmentType(value);
        setNextStage(''); 
    };

    const handleSaveJudgment = (actionType: string) => {
        let finalAction = 'waiting_for_appeal';
        let calculatedNextStage = nextStage;
        let openObjectionModal = false;
        let openAppealTransitionModal = false; // 🔥 NEW FLAG

        // Map UI Actions to System Actions
        if (actionType === 'appeal') {
             // 🔥 NEW: Instead of checking nextStage, we open AppealTransitionModal
             openAppealTransitionModal = true;
             finalAction = 'waiting_for_appeal'; // Temporary state until user completes transition modal
        } else if (actionType === 'objection') {
             // For objection: Save default judgment -> Open Objection Modal
             finalAction = 'waiting_for_appeal';
             openObjectionModal = true;
        } else if (actionType === 'wait' || actionType === 'wait_objection') {
             finalAction = 'waiting_for_appeal';
        } else if (actionType === 'wait_cassation') {
             // 🔥 NEW: Appellate stage - won the appeal, waiting for opponent's cassation
             finalAction = 'waiting_for_cassation';
        } else if (actionType === 'transition_to_cassation') {
             // 🔥 NEW: Appellate stage - lost the appeal, transitioning to cassation
             openAppealTransitionModal = true;
             finalAction = 'waiting_for_cassation';
        } else if (actionType === 'final_ratification' || actionType === 'remand_to_lower' || actionType === 'correction_request') {
             // 🔥 NEW: Cassation final outcomes
             finalAction = actionType;
        }

        onConfirm({
            action: finalAction,
            judgmentType,
            judgmentForm,
            judgmentDate,
            notes,
            nextStage: calculatedNextStage,
            openObjectionModal,
            openAppealTransitionModal, // 🔥 NEW FIELD
            isPleadingsClosed: true, 
            lastJudgmentType: judgmentForm
        });
        onClose();
    };

    const handleArchiveAnnulled = () => {
        onConfirm({
            action: 'archive_annulled',
            judgmentType,
            judgmentForm: currentStage?.includes('بداءة') ? judgmentForm : undefined,
            judgmentDate,
            notes
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-['Tajawal']">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="w-full max-w-2xl bg-gradient-to-br from-[#1A1E2E] to-[#0F121E] rounded-2xl border border-[#E6C673]/30 shadow-2xl shadow-[#E6C673]/10 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-[#E6C673] to-[#B45309] p-6 relative">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                        <Gavel size={24} className="text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-white text-2xl font-bold">ختم المرافعة وقرار الحكم</h2>
                                    </div>
                                </div>
                                <button type="button"
                                    onClick={onClose}
                                    className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center text-white transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Form */}
                        <div className="p-6 space-y-6">
                            {/* Field 0: Judgment Form (Conditional - ONLY for First Instance "Bada'a") */}
                            {currentStage?.includes('بداءة') && (
                                <div>
                                    <label className="text-sm font-bold text-slate-300 mb-2 block">شكل الحكم</label>
                                    <div className="flex gap-3 w-full mb-4">
                                        <button type="button"
                                            onClick={() => setJudgmentForm('حضوري')}
                                            className={`flex-1 py-2 px-4 rounded-lg text-sm transition-all ${
                                                judgmentForm === 'حضوري'
                                                    ? 'bg-amber-500/10 border border-amber-500/50 text-amber-400 font-bold shadow-[0_0_10px_rgba(245,158,11,0.1)]'
                                                    : 'bg-slate-900/50 border border-slate-700 text-slate-400 hover:bg-slate-800'
                                            }`}
                                        >
                                            حكم حضوري
                                        </button>
                                        <button type="button"
                                            onClick={() => setJudgmentForm('غيابي')}
                                            className={`flex-1 py-2 px-4 rounded-lg text-sm transition-all ${
                                                judgmentForm === 'غيابي'
                                                    ? 'bg-amber-500/10 border border-amber-500/50 text-amber-400 font-bold shadow-[0_0_10px_rgba(245,158,11,0.1)]'
                                                    : 'bg-slate-900/50 border border-slate-700 text-slate-400 hover:bg-slate-800'
                                            }`}
                                        >
                                            حكم غيابي
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Field 1: Judgment Type (Dropdown) - STRICT VALUES */}
                            <div>
                                <label className="block text-white/80 font-bold mb-2 flex items-center gap-2">
                                    <span className="text-[#E6C673]">⚖️</span>
                                    قرار الحكم (نتيجة الدعوى)
                                </label>
                                <select
                                    value={judgmentType}
                                    onChange={(e) => handleJudgmentChange(e.target.value)}
                                    className="w-full bg-[#0A1128] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#E6C673] focus:outline-none transition-all"
                                >
                                    <option value="">اختر النتيجة...</option>
                                    
                                    {/* 🔥 DYNAMIC OPTIONS: First Instance vs Appellate Court vs Cassation */}
                                    {currentStage === 'التمييز' ? (
                                        /* Cassation Court Options (Iraqi Law) */
                                        <>
                                            <option value="تصديق الحكم">تصديق الحكم (Ratification)</option>
                                            <option value="نقض الحكم وإعادة الإضبارة">نقض الحكم وإعادة الإضبارة (Quash & Remand)</option>
                                            <option value="رد الطعن التمييزي شكلاً">رد الطعن التمييزي شكلاً</option>
                                        </>
                                    ) : currentStage === 'الاستئناف' ? (
                                        /* Appellate Court Options (Iraqi Law) */
                                        <>
                                            <option value="تأييد الحكم المستأنف ورد الاستئناف">تأييد الحكم المستأنف ورد الاستئناف</option>
                                            <option value="فسخ الحكم المستأنف كلياً">فسخ الحكم المستأنف كلياً</option>
                                            <option value="فسخ الحكم المستأنف جزئياً">فسخ الحكم المستأنف جزئياً</option>
                                            <option value="رد الاستئناف شكلاً">رد الاستئناف شكلاً</option>
                                            <option value="إبطال عريضة الاستئناف">إبطال عريضة الاستئناف</option>
                                        </>
                                    ) : (
                                        /* First Instance Options */
                                        <>
                                            <option value="إجابة الدعوى بالكامل">إجابة الدعوى بالكامل (كسب الدعوى)</option>
                                            <option value="رد الدعوى كلياً">رد الدعوى كلياً (خسارة الدعوى)</option>
                                            <option value="رد الدعوى جزئياً">رد الدعوى جزئياً (كسب/خسارة جزئية)</option>
                                            <option value="إبطال">إبطال (الدعوى ملغاة)</option>
                                            
                                            {/* 🔥 NEW: Non-Merit Terminations (النهايات الرضائية) */}
                                            <option value="تصديق الصلح والتسوية">تصديق الصلح والتسوية</option>
                                            <option value="التنازل عن الدعوى">التنازل عن الدعوى</option>
                                            <option value="إبطال عريضة الدعوى">إبطال عريضة الدعوى</option>
                                        </>
                                    )}
                                </select>
                            </div>

                            {/* Field 2: Next Stage (Conditional) - REMOVED AS REDUNDANT */}
                            
                            {/* Field 3: Judgment Date */}
                            <div>
                                <label className="block text-white/80 font-bold mb-2 flex items-center gap-2">
                                    <span className="text-[#E6C673]">📅</span>
                                    تاريخ الحكم
                                </label>
                                <input
                                    type="date"
                                    value={judgmentDate}
                                    onChange={(e) => setJudgmentDate(e.target.value)}
                                    className="w-full bg-[#0A1128] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#E6C673] focus:outline-none transition-all"
                                />
                            </div>

                            {/* Field 4: Notes */}
                            <div>
                                <label className="block text-white/80 font-bold mb-2 flex items-center gap-2">
                                    <span className="text-[#E6C673]">📝</span>
                                    ملاحظات
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={3}
                                    className="w-full bg-[#0A1128] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#E6C673] focus:outline-none transition-all resize-none"
                                    placeholder="أضف ملاحظات إضافية عن الحكم..."
                                />
                            </div>

                            {/* 🔥 NEW: Helper text for تصديق الصلح */}
                            {judgmentType === 'تصديق الصلح والتسوية' && (
                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                                    <p className="text-emerald-400 text-xs font-bold leading-relaxed flex items-center gap-2">
                                        <span>💡</span>
                                        يعتبر تصديق الصلح بمثابة حكم مكتسب الدرجة القطعية.
                                    </p>
                                </div>
                            )}

                            {/* DYNAMIC SUBMIT ACTIONS (INJECTED) */}
                            {judgmentType ? (
                                <div className="flex flex-col gap-3 w-full mt-6 border-t border-slate-700/50 pt-4">
                                    
                                    {/* 🔥 NEW: NON-MERIT TERMINATIONS (النهايات الرضائية) */}
                                    {(['تصديق الصلح والتسوية', 'التنازل عن الدعوى', 'إبطال عريضة الدعوى'].includes(judgmentType)) && (
                                        <button type="button"
                                            onClick={() => {
                                                onConfirm({
                                                    action: 'finalize_non_merit',
                                                    judgmentType,
                                                    judgmentForm: currentStage?.includes('بداءة') ? judgmentForm : undefined,
                                                    judgmentDate,
                                                    notes,
                                                    isPleadingsClosed: true
                                                });
                                                onClose();
                                            }}
                                            className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2"
                                        >
                                            📜 ختم الإضبارة (إنهاء الدعوى)
                                        </button>
                                    )}
                                    
                                    {/* --- SCENARIO 0: VOID (إبطال) --- */}
                                    {judgmentType === 'إبطال' && (
                                        <button type="button"
                                            onClick={handleArchiveAnnulled}
                                            className="w-full py-4 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white rounded-xl font-bold text-lg shadow-lg shadow-gray-500/30 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Archive size={20} />
                                            أرشفة وحفظ (دعوى مبطلة) 📁
                                        </button>
                                    )}
                                    
                                    {/* --- 🔥 SCENARIO 0b: VOID APPEAL (إبطال عريضة الاستئناف) --- */}
                                    {judgmentType === 'إبطال عريضة الاستئناف' && (
                                        <button type="button"
                                            onClick={handleArchiveAnnulled}
                                            className="w-full py-4 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white rounded-xl font-bold text-lg shadow-lg shadow-gray-500/30 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Archive size={20} />
                                            أرشفة وحفظ (عريضة استئناف مبطلة) 📁
                                        </button>
                                    )}

                                    {/* --- SCENARIO 1: IN-PERSON (حضوري) --- */}
                                    {judgmentForm === 'حضوري' && judgmentType !== 'إبطال' && currentStage !== 'الاستئناف' && 
                                     !['تصديق الصلح والتسوية', 'التنازل عن الدعوى', 'إبطال عريضة الدعوى'].includes(judgmentType) && (
                                    <>
                                        {((isPlaintiffLawyer && judgmentType === 'إجابة الدعوى بالكامل') || (isDefendantLawyer && judgmentType === 'رد الدعوى كلياً')) ? (
                                        <div className="flex flex-col gap-2">
                                            <span className="text-emerald-400 text-xs text-center font-bold">🎉 لا توجد مصلحة قانونية للطعن (تم كسب الدعوى)</span>
                                            <button type="button" onClick={() => handleSaveJudgment('wait')} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg w-full transition-colors shadow-lg shadow-indigo-500/20">حفظ الحكم وانتظار طعن الخصم</button>
                                        </div>
                                        ) : (
                                        <div className="flex flex-col gap-2">
                                            <span className="text-rose-400 text-xs text-center font-bold">⚠️ يحق لموكلك الطعن في هذا القرار</span>
                                            <button type="button" onClick={() => handleSaveJudgment('appeal')} className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-lg w-full transition-colors shadow-lg shadow-amber-500/20">حفظ والانتقال لمرحلة الطعن (استئناف/تمييز)</button>
                                        </div>
                                        )}
                                    </>
                                    )}

                                    {/* --- SCENARIO 2: DEFAULT (غيابي) --- */}
                                    {judgmentForm === 'غيابي' && judgmentType !== 'إبطال' && currentStage !== 'الاستئناف' && 
                                     !['تصديق الصلح والتسوية', 'التنازل عن الدعوى', 'إبطال عريضة الدعوى'].includes(judgmentType) && (
                                    <>
                                        {/* Plaintiff Logic */}
                                        {isPlaintiffLawyer && (
                                        judgmentType === 'إجابة الدعوى بالكامل' ? (
                                            <button type="button" onClick={() => handleSaveJudgment('wait_objection')} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg w-full transition-colors shadow-lg shadow-indigo-500/20">حفظ الحكم وانتظار اعتراض الخصم</button>
                                        ) : (
                                            <button type="button" onClick={() => handleSaveJudgment('appeal')} className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-lg w-full transition-colors shadow-lg shadow-amber-500/20">حفظ والانتقال لمرحلة الطعن (استئناف/تمييز)</button>
                                        )
                                        )}
                                        {/* Defendant Logic */}
                                        {isDefendantLawyer && (
                                        judgmentType === 'رد الدعوى كلياً' ? (
                                            <button type="button" onClick={() => handleSaveJudgment('wait')} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg w-full transition-colors shadow-lg shadow-indigo-500/20">حفظ الحكم وانتظار طعن الخصم</button>
                                        ) : (
                                            <div className="flex flex-col gap-2 w-full">
                                            <span className="text-rose-400 text-xs text-center font-bold">⚠️ صدر حكم غيابي ضد موكلك</span>
                                            <button type="button" onClick={() => handleSaveJudgment('objection')} className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-lg w-full transition-colors shadow-lg shadow-rose-500/20">حفظ وتقديم اعتراض غيابي 🛡️</button>
                                            <button type="button" onClick={() => handleSaveJudgment('appeal')} className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-lg w-full transition-colors">حفظ وترك الحكم غيابياً (انتقال للطعن) ⏭️</button>
                                            </div>
                                        )
                                        )}
                                        {/* Fallback if no role matched (though user should be one of them) */}
                                        {!isPlaintiffLawyer && !isDefendantLawyer && (
                                            <div className="text-center text-xs text-gray-500">الرجاء تحديد صفة الموكل في إعدادات الملف لتفعيل الخيارات الذكية</div>
                                        )}
                                    </>
                                    )}
                                    
                                    {/* --- 🔥 SCENARIO 3: APPELLATE STAGE (الاستئناف) --- */}
                                    {currentStage === 'الاستئناف' && judgmentType && (
                                        <div className="flex flex-col gap-3 w-full">
                                            {/* If Lawyer WON the Appeal (No legal interest to file Cassation) */}
                                            {((isAppellantLawyer && judgmentType === 'فسخ الحكم المستأنف كلياً') || 
                                              (isAppelleeLawyer && ['تأييد الحكم المستأنف ورد الاستئناف', 'رد الاستئناف شكلاً', 'إبطال عريضة الاستئناف'].includes(judgmentType))) ? (
                                                <div className="flex flex-col gap-2">
                                                    <span className="text-emerald-400 text-xs text-center font-bold">🎉 تم كسب مرحلة الاستئناف بنجاح</span>
                                                    <button type="button" 
                                                        onClick={() => handleSaveJudgment('wait_cassation')} 
                                                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg w-full transition-colors shadow-lg shadow-indigo-500/20"
                                                    >
                                                        حفظ القرار وانتظار طعن الخصم (تمييزاً)
                                                    </button>
                                                </div>
                                            ) : (
                                                /* If Lawyer LOST (Fully or Partially) -> Must go to Cassation */
                                                <div className="flex flex-col gap-2">
                                                    <span className="text-rose-400 text-xs text-center font-bold">⚠️ يحق لموكلك الطعن تمييزاً في هذا القرار</span>
                                                    <button type="button" 
                                                        onClick={() => handleSaveJudgment('transition_to_cassation')} 
                                                        className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-lg w-full transition-colors shadow-lg shadow-amber-500/20"
                                                    >
                                                        حفظ والانتقال لمحكمة التمييز ⚖️
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* --- 🔥 SCENARIO 4: CASSATION STAGE (التمييز) --- */}
                                    {currentStage === 'التمييز' && judgmentType && (
                                        <div className="flex flex-col gap-3 w-full mt-6 border-t border-slate-700/50 pt-4">
                                            
                                            {/* SCENARIO A: RATIFIED (تصديق أو رد شكلاً) -> Case is Final */}
                                            {(judgmentType === 'تصديق الحكم' || judgmentType === 'رد الطعن التمييزي شكلاً') ? (
                                                <div className="flex flex-col gap-2">
                                                    <span className="text-emerald-400 text-xs text-center font-bold">🏛️ اكتسب الحكم الدرجة القطعية (نهاية المطاف)</span>
                                                    <button type="button" 
                                                        onClick={() => handleSaveJudgment('final_ratification')} 
                                                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg w-full transition-colors shadow-lg shadow-emerald-500/20"
                                                    >
                                                        📜 ختم الإضبارة (مكتسبة الدرجة القطعية)
                                                    </button>
                                                    {/* The rare exceptional remedy */}
                                                    <button type="button" 
                                                        onClick={() => handleSaveJudgment('correction_request')} 
                                                        className="bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-2 rounded-lg w-full transition-colors text-xs border border-slate-600"
                                                    >
                                                        تقديم طلب تصحيح قرار تمييزي ⚠️
                                                    </button>
                                                </div>
                                            ) : (
                                                /* SCENARIO B: QUASHED & REMANDED (نقض وإعادة) -> Goes back to lower court */
                                                <div className="flex flex-col gap-2">
                                                    <span className="text-amber-400 text-xs text-center font-bold">⚠️ تم نقض الحكم! يجب إعادة الدعوى للمحكمة السابقة</span>
                                                    <button type="button" 
                                                        onClick={() => handleSaveJudgment('remand_to_lower')} 
                                                        className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-lg w-full transition-colors shadow-lg shadow-amber-500/20"
                                                    >
                                                        ↩️ إعادة الإضبارة (لاتباع القرار التمييزي)
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    
                                    {/* Cancel Button */}
                                    <button type="button"
                                        onClick={onClose}
                                        className="w-full py-3 bg-transparent hover:bg-white/5 text-white/60 hover:text-white rounded-lg font-bold transition-all mt-2"
                                    >
                                        إلغاء
                                    </button>

                                </div>
                            ) : (
                                <div className="mt-8 flex flex-col items-center opacity-50">
                                    <Gavel className="w-8 h-8 text-slate-500 mb-2" />
                                    <p className="text-slate-400 text-sm">اختر قرار الحكم أولاً لإظهار الخيارات المتاحة</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};