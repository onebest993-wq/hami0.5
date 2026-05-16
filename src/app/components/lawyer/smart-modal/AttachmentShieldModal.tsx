import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Shield, AlertCircle, Lock } from 'lucide-react';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';

interface AttachmentShieldModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: AttachmentData) => void;
    editMode?: boolean;
    editData?: AttachmentData | null;
}

interface AttachmentData {
    id?: string;
    type: string;
    target: string;
    location: string;
    estimatedValue: string;
    registrationDate: string;
    status: string;
    notes: string;
}

export const AttachmentShieldModal = ({ isOpen, onClose, onSave, editMode = false, editData }: AttachmentShieldModalProps) => {
    // Form State
    const [type, setType] = useState('عقار');
    const [target, setTarget] = useState('');
    const [location, setLocation] = useState('');
    const [estimatedValue, setEstimatedValue] = useState('');
    const [registrationDate, setRegistrationDate] = useState(getLocalTodayYmd());
    const [status, setStatus] = useState('مُقدم - بانتظار القرار (24 ساعة)');
    const [notes, setNotes] = useState('');
    
    // Pre-fill in edit mode
    useEffect(() => {
        if (editMode && editData) {
            setType(editData.type || 'عقار');
            setTarget(editData.target || '');
            setLocation(editData.location || '');
            setEstimatedValue(editData.estimatedValue || '');
            setRegistrationDate(editData.registrationDate || getLocalTodayYmd());
            setStatus(editData.status || 'مُقدم - بانتظار القرار (24 ساعة)');
            setNotes(editData.notes || '');
        } else {
            // Reset on create
            setType('عقار');
            setTarget('');
            setLocation('');
            setEstimatedValue('');
            setRegistrationDate(getLocalTodayYmd());
            setStatus('مُقدم - بانتظار القرار (24 ساعة)');
            setNotes('');
        }
    }, [editMode, editData, isOpen]);

    const handleSubmit = () => {
        if (!target || !estimatedValue) return;

        const attachmentData = {
            type,
            target,
            location,
            estimatedValue,
            registrationDate,
            status,
            notes,
            isActive: status === 'صدر قرار بالحجز ✅',
            ...(editMode && editData ? { id: editData.id } : {})
        };

        onSave(attachmentData);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-['Tajawal']" dir="rtl">
            <div className="bg-[#1A1E2E] border border-red-500/40 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl shadow-red-900/40 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-red-600 to-rose-700 p-4 text-white flex justify-between items-center shadow-lg">
                    <h3 className="font-bold flex items-center gap-2 text-sm">
                        <Lock size={20} className="text-white" />
                        درع الحجز الاحتياطي (المواد 231-250)
                    </h3>
                    <button type="button" onClick={onClose} className="hover:bg-black/10 rounded-full p-1 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto scrollbar-hide">
                    {/* Critical Legal Warning */}
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-200 text-[11px] font-bold flex items-start gap-2">
                        <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <div className="mb-1">⚠️ نظام الحجز الاحتياطي - مواعيد حرجة</div>
                            <div className="text-[10px] font-normal text-red-300/80 leading-relaxed">
                                • المحكمة تقرر خلال 24 ساعة (اليوم التالي) - المادة 233<br />
                                • إذا رُفع قبل الدعوى: يجب إقامة الدعوى خلال 8 أيام - المادة 237<br />
                                • يبطل الحجز بعد 3 أشهر إن لم يتم التبليغ - المادة 237<br />
                                • التظلم: 3 أيام فقط من التبليغ - المادة 240
                            </div>
                        </div>
                    </div>

                    {/* Type Field */}
                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            نوع المال المحجوز <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-red-500 transition-colors"
                        >
                            <option value="عقار">عقار</option>
                            <option value="حساب بنكي">حساب بنكي</option>
                            <option value="سيارة">سيارة</option>
                            <option value="آلة صناعية">آلة صناعية</option>
                            <option value="أثاث">أثاث</option>
                            <option value="مواد أخرى">مواد أخرى</option>
                        </select>
                    </div>

                    {/* Target Field */}
                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            المال المحجوز (وصف دقيق) <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={target}
                            onChange={(e) => setTarget(e.target.value)}
                            placeholder="مثال: عقار رقم 123/456 في منطقة الكرادة، أو حساب بنكي رقم..."
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-red-500 min-h-[70px] transition-colors"
                        />
                    </div>

                    {/* Location Field */}
                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            موقع المال المحجوز
                        </label>
                        <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="مثال: منطقة الكرادة، أو مدينة بغداد"
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-red-500 transition-colors"
                        />
                    </div>

                    {/* Estimated Value */}
                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            القيمة التقديرية للحجز (IQD) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            value={estimatedValue}
                            onChange={(e) => setEstimatedValue(e.target.value)}
                            placeholder="0"
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-red-500 transition-colors"
                        />
                    </div>

                    {/* Registration Date */}
                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            تاريخ تقديم الطلب <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            value={registrationDate}
                            onChange={(e) => setRegistrationDate(e.target.value)}
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-red-500 [color-scheme:dark] transition-colors"
                        />
                    </div>

                    {/* Status Dropdown */}
                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            حالة الطلب <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-red-500 font-bold transition-colors"
                        >
                            <option value="مُقدم - بانتظار القرار (24 ساعة)">مُقدم - بانتظار القرار (24 ساعة)</option>
                            <option value="صدر قرار بالحجز ✅">صدر قرار بالحجز ✅</option>
                            <option value="رُفض الطلب ❌">رُفض الطلب ❌</option>
                        </select>
                    </div>

                    {/* Notes Field */}
                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            ملاحظات إضافية
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="ملاحظات إضافية حول الحجز..."
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-red-500 min-h-[70px] transition-colors"
                        />
                    </div>

                    {/* Submit Button */}
                    <button type="button"
                        onClick={handleSubmit}
                        disabled={!target || !estimatedValue}
                        className="w-full bg-gradient-to-r from-red-600 to-rose-700 text-white py-3.5 rounded-lg font-bold text-sm hover:from-red-500 hover:to-rose-600 transition-all shadow-lg shadow-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                        <Lock size={16} />
                        {editMode ? 'تحديث بيانات الحجز' : 'حفظ طلب الحجز الاحتياطي'}
                    </button>
                </div>
            </div>
        </div>
    );
};
