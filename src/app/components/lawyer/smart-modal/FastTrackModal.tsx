import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Zap, AlertTriangle, Shield, Scale, Clock } from 'lucide-react';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';

interface FastTrackModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: FastTrackData) => void;
    editMode?: boolean;
    editData?: FastTrackData | null;
}

interface FastTrackData {
    id?: string;
    type: string;
    reason: string;
    requestDate: string;
    status: string;
    notes: string;
}

export const FastTrackModal = ({ isOpen, onClose, onSave, editMode = false, editData }: FastTrackModalProps) => {
    // Form State
    const [requestType, setRequestType] = useState('أمر ولائي على عريضة');
    const [subject, setSubject] = useState('');
    const [submissionDate, setSubmissionDate] = useState(getLocalTodayYmd());
    const [status, setStatus] = useState('⏳ قيد الانتظار (7 أيام)');
    
    // Grievance (التظلم) State - Conditionally Shown
    const [grievanceDate, setGrievanceDate] = useState('');
    const [grievanceTime, setGrievanceTime] = useState('');
    const [grievanceOutcome, setGrievanceOutcome] = useState('');

    // Pre-fill in edit mode
    useEffect(() => {
        if (editMode && editData) {
            const ed = editData as any;
            setRequestType(ed.type || 'أمر ولائي على عريضة');
            setSubject(ed.reason || '');
            setSubmissionDate(ed.requestDate || getLocalTodayYmd());
            setStatus(ed.status || '⏳ قيد الانتظار (7 أيام)');
            setGrievanceDate(ed.grievanceDate || '');
            setGrievanceTime(ed.grievanceTime || '');
            setGrievanceOutcome(ed.grievanceOutcome || '');
        } else {
            // Reset on create
            setRequestType('أمر ولائي على عريضة');
            setSubject('');
            setSubmissionDate(getLocalTodayYmd());
            setStatus('⏳ قيد الانتظار (7 أيام)');
            setGrievanceDate('');
            setGrievanceTime('');
            setGrievanceOutcome('');
        }
    }, [editMode, editData, isOpen]);

    const handleSubmit = () => {
        if (!subject) return;

        const fastTrackData = {
            type: requestType,
            reason: subject,
            requestDate: submissionDate,
            status,
            notes: editData?.notes || '',
            ...(status === '⚖️ قيد نظر التظلم' && {
                grievanceDate,
                grievanceTime,
                grievanceOutcome
            }),
            ...(editMode && editData ? { id: editData.id } : {})
        };

        onSave(fastTrackData as any);
        onClose();
    };

    if (!isOpen) return null;

    const showGrievanceSection = status === '⚖️ قيد نظر التظلم';

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-['Tajawal']" dir="rtl">
            <div className="bg-[#1A1E2E] border border-amber-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl shadow-amber-900/30 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-600 to-amber-700 p-4 text-white flex justify-between items-center shadow-lg">
                    <h3 className="font-bold flex items-center gap-2 text-sm">
                        <Zap size={20} className="text-white animate-pulse" />
                        {editMode ? 'تحديث الطلب المستعجل' : 'تسجيل طلب مستعجل / ولائي'}
                    </h3>
                    <button type="button" onClick={onClose} className="hover:bg-black/10 rounded-full p-1 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto scrollbar-hide">
                    {/* Legal Warning Banner */}
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-amber-200 text-[11px] font-bold flex items-start gap-2">
                        <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <div className="mb-1">📋 القضاء المستعجل (المواد 141-153)</div>
                            <div className="text-[10px] font-normal text-amber-300/80 leading-relaxed">
                                • المحكمة ملزمة بالبت خلال 7 أيام من تقديم الطلب.<br />
                                • يحق التظلم من القرار خلال 3 أيام فقط من التبليغ.<br />
                                • هذا الطلب لا يؤثر على سير الدعوى الأصلية.
                            </div>
                        </div>
                    </div>

                    {/* Request Type */}
                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            نوع الطلب <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={requestType}
                            onChange={(e) => setRequestType(e.target.value)}
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-amber-500 transition-colors"
                        >
                            <option value="أمر ولائي على عريضة">أمر ولائي على عريضة</option>
                            <option value="منع سفر">منع سفر</option>
                            <option value="إعادة مرافق">إعادة مرافق</option>
                            <option value="كشف مستعجل وتثبيت حالة">كشف مستعجل وتثبيت حالة</option>
                            <option value="حراسة قضائية">حراسة قضائية</option>
                        </select>
                    </div>

                    {/* Subject */}
                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            موضوع الطلب <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="اشرح باختصار موضوع الطلب المستعجل..."
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-amber-500 min-h-[80px] transition-colors"
                        />
                    </div>

                    {/* Submission Date */}
                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            تاريخ التقديم <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            value={submissionDate}
                            onChange={(e) => setSubmissionDate(e.target.value)}
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-amber-500 [color-scheme:dark] transition-colors"
                        />
                    </div>

                    {/* Status Dropdown - THE SMART STATE MACHINE */}
                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            حالة الطلب <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-amber-500 font-bold transition-colors"
                        >
                            <option value="⏳ قيد الانتظار (7 أيام)">⏳ قيد الانتظار (7 أيام)</option>
                            <option value="✅ صدر قرار بالقبول">✅ صدر قرار بالقبول</option>
                            <option value="❌ صدر قرار بالرفض">❌ صدر قرار بالرفض</option>
                            <option value="⚖️ قيد نظر التظلم">⚖️ قيد نظر التظلم</option>
                        </select>
                    </div>

                    {/* Dynamic Status Info */}
                    {status === '⏳ قيد الانتظار (7 أيام)' && (
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-blue-200 text-[10px] font-bold flex items-start gap-2">
                            <Clock size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
                            <span>سيتم إنشاء مهمة تلقائية لمتابعة المحكمة خلال 7 أيام.</span>
                        </div>
                    )}

                    {(status === '✅ صدر قرار بالقبول' || status === '❌ صدر قرار بالرفض') && (
                        <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-rose-200 text-[10px] font-bold flex items-start gap-2">
                            <AlertTriangle size={14} className="text-rose-400 flex-shrink-0 mt-0.5" />
                            <span>سيتم إنشاء مهمة تحذيرية: يحق التظلم خلال 3 أيام فقط!</span>
                        </div>
                    )}

                    {/* 🔥 GRIEVANCE SUB-LOOP - Conditionally Expanded */}
                    {showGrievanceSection && (
                        <div className="border-2 border-amber-500/30 rounded-xl p-4 space-y-4 bg-amber-500/5 animate-in slide-in-from-top duration-300">
                            <div className="flex items-center gap-2 mb-2">
                                <Scale size={16} className="text-amber-400" />
                                <h4 className="text-amber-400 font-bold text-xs">تفاصيل جلسة التظلم</h4>
                            </div>

                            {/* Grievance Hearing Date */}
                            <div>
                                <label className="block text-xs font-bold text-white/60 mb-1.5">
                                    موعد جلسة التظلم <span className="text-amber-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={grievanceDate}
                                    onChange={(e) => setGrievanceDate(e.target.value)}
                                    className="w-full bg-[#0F172A] border border-amber-500/30 rounded-lg p-3 text-sm text-white outline-none focus:border-amber-500 [color-scheme:dark]"
                                />
                            </div>

                            {/* Grievance Time */}
                            <div>
                                <label className="block text-xs font-bold text-white/60 mb-1.5">
                                    وقت الجلسة <span className="text-amber-500">*</span>
                                </label>
                                <input
                                    type="time"
                                    value={grievanceTime}
                                    onChange={(e) => setGrievanceTime(e.target.value)}
                                    className="w-full bg-[#0F172A] border border-amber-500/30 rounded-lg p-3 text-sm text-white outline-none focus:border-amber-500 [color-scheme:dark]"
                                />
                            </div>

                            {/* Grievance Outcome */}
                            <div>
                                <label className="block text-xs font-bold text-white/60 mb-1.5">
                                    نتيجة التظلم
                                </label>
                                <select
                                    value={grievanceOutcome}
                                    onChange={(e) => setGrievanceOutcome(e.target.value)}
                                    className="w-full bg-[#0F172A] border border-amber-500/30 rounded-lg p-3 text-sm text-white outline-none focus:border-amber-500"
                                >
                                    <option value="">لم يُحسم بعد</option>
                                    <option value="تأييد الأمر">تأييد الأمر</option>
                                    <option value="تعديل الأمر">تعديل الأمر</option>
                                    <option value="إلغاء الأمر">إلغاء الأمر</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button type="button"
                        onClick={handleSubmit}
                        disabled={!subject || (showGrievanceSection && (!grievanceDate || !grievanceTime))}
                        className="w-full bg-gradient-to-r from-amber-600 to-amber-700 text-white py-3.5 rounded-lg font-bold text-sm hover:from-amber-500 hover:to-amber-600 transition-all shadow-lg shadow-amber-900/30 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                        <Shield size={16} />
                        {editMode ? 'تحديث البيانات' : 'حفظ الطلب المستعجل'}
                    </button>
                </div>
            </div>
        </div>
    );
};
