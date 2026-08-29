import { getLocalTodayYmd } from '@/app/utils/localYmd';
import React, { useState, useEffect } from 'react';
import { X } from '@/app/components/ui/icons/X';
import { Lock } from '@/app/components/ui/icons/Lock';
import { SMART_MODAL_MOTION_ZOOM_ENTER } from './smartFile/smartModalMotionClasses';

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

const fieldClass =
    'w-full bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] rounded-xl p-3 text-sm text-white outline-none focus:border-[#E6C673]/30 focus:bg-white/[0.06] transition-all [color-scheme:dark]';

const selectClass =
    'w-full bg-[#0A0F1C] border border-white/[0.08] rounded-xl p-3 text-sm text-white outline-none focus:border-[#E6C673]/30 focus:bg-[#0F121E] transition-all cursor-pointer appearance-none [color-scheme:dark]';

const optionClass = 'bg-[#0A0F1C] text-white';

export const AttachmentShieldModal = ({
    isOpen,
    onClose,
    onSave,
    editMode = false,
    editData,
}: AttachmentShieldModalProps) => {
    const [type, setType] = useState('عقار');
    const [target, setTarget] = useState('');
    const [location, setLocation] = useState('');
    const [estimatedValue, setEstimatedValue] = useState('');
    const [registrationDate, setRegistrationDate] = useState(getLocalTodayYmd());
    const [status, setStatus] = useState('مُقدم - بانتظار القرار (24 ساعة)');
    const [notes, setNotes] = useState('');

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
            ...(editMode && editData ? { id: editData.id } : {}),
        };

        onSave(attachmentData);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[250] flex items-center justify-center bg-[#05060D]/65 backdrop-blur-[3px] p-4 font-['Tajawal']"
            dir="rtl"
            onClick={onClose}
        >
            <div
                className={`w-full max-w-lg overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0A0F1C]/80 backdrop-blur-sm shadow-[0_8px_22px_rgba(0,0,0,0.22)] ${SMART_MODAL_MOTION_ZOOM_ENTER}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="relative px-4 py-4 border-b border-white/[0.08] bg-gradient-to-l from-[#E6C673]/10 via-transparent to-transparent flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2 text-[14px] text-white/95 pr-1">
                        <Lock size={17} className="text-[#E6C673] shrink-0" strokeWidth={1.75} />
                        درع الحجز الاحتياطي
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                        aria-label="إغلاق"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    <div>
                        <label className="block text-[11px] font-bold text-white/50 mb-1.5">
                            نوع المال المحجوز <span className="text-red-400">*</span>
                        </label>
                        <select value={type} onChange={(e) => setType(e.target.value)} className={selectClass}>
                            <option value="عقار" className={optionClass}>عقار</option>
                            <option value="حساب بنكي" className={optionClass}>حساب بنكي</option>
                            <option value="سيارة" className={optionClass}>سيارة</option>
                            <option value="آلة صناعية" className={optionClass}>آلة صناعية</option>
                            <option value="أثاث" className={optionClass}>أثاث</option>
                            <option value="مواد أخرى" className={optionClass}>مواد أخرى</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-white/50 mb-1.5">
                            المال المحجوز (وصف دقيق) <span className="text-red-400">*</span>
                        </label>
                        <textarea
                            value={target}
                            onChange={(e) => setTarget(e.target.value)}
                            placeholder="مثال: عقار رقم 123/456 في منطقة الكرادة، أو حساب بنكي رقم..."
                            className={`${fieldClass} min-h-[70px] resize-none`}
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-white/50 mb-1.5">موقع المال المحجوز</label>
                        <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="مثال: منطقة الكرادة، أو مدينة بغداد"
                            className={fieldClass}
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-white/50 mb-1.5">
                            القيمة التقديرية للحجز (IQD) <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="number"
                            value={estimatedValue}
                            onChange={(e) => setEstimatedValue(e.target.value)}
                            placeholder="0"
                            className={fieldClass}
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-white/50 mb-1.5">
                            تاريخ تقديم الطلب <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="date"
                            value={registrationDate}
                            onChange={(e) => setRegistrationDate(e.target.value)}
                            className={fieldClass}
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-white/50 mb-1.5">
                            حالة الطلب <span className="text-red-400">*</span>
                        </label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className={`${selectClass} font-semibold`}
                        >
                            <option value="مُقدم - بانتظار القرار (24 ساعة)" className={optionClass}>مُقدم - بانتظار القرار (24 ساعة)</option>
                            <option value="صدر قرار بالحجز ✅" className={optionClass}>صدر قرار بالحجز ✅</option>
                            <option value="رُفض الطلب ❌" className={optionClass}>رُفض الطلب ❌</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-white/50 mb-1.5">ملاحظات إضافية</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="ملاحظات إضافية حول الحجز..."
                            className={`${fieldClass} min-h-[70px] resize-none`}
                        />
                    </div>

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!target || !estimatedValue}
                        className="w-full py-3.5 rounded-xl font-bold text-sm transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed flex justify-center items-center gap-2 bg-[#E6C673]/15 border border-[#E6C673]/30 text-[#E6C673] hover:bg-[#E6C673]/25 hover:border-[#E6C673]/45"
                    >
                        <Lock size={16} strokeWidth={1.75} />
                        {editMode ? 'تحديث بيانات الحجز' : 'حفظ طلب الحجز الاحتياطي'}
                    </button>
                </div>
            </div>
        </div>
    );
};
