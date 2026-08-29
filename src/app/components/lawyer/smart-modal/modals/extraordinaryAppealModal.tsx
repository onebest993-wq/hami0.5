import React, { useState } from 'react';
import { X } from '@/app/components/ui/icons/X';
import { getLocalTodayYmd } from '@/app/utils/localYmd';
import type { ExtraordinaryAppealModalProps } from '../smartFile/modalFormTypes';
import { SMART_MODAL_MOTION_ZOOM_ENTER } from '../smartFile/smartModalMotionClasses';
import { GLASS_CLOSE } from '../smartFile/moroccanGlassShell';


export const ExtraordinaryAppealModal = ({ isOpen, onClose, onConfirm, type, currentCourt }: ExtraordinaryAppealModalProps) => {
    const [appealDate, setAppealDate] = useState(getLocalTodayYmd());
    const [targetCourt, setTargetCourt] = useState(currentCourt || '');
    const [reasons, setReasons] = useState('');

    const fieldClass =
        'w-full bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] rounded-xl p-3 text-sm text-white outline-none focus:border-[#E6C673]/30 focus:bg-white/[0.06] transition-all [color-scheme:dark]';

    const handleSubmit = () => {
        onConfirm({
            type,
            date: appealDate,
            court: targetCourt,
            reasons
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-[#05060D]/65 backdrop-blur-[3px] p-4 font-['Tajawal']" dir="rtl">
            <div className={`rounded-2xl border border-white/[0.1] bg-[#0A0F1C]/80 backdrop-blur-sm shadow-[0_8px_22px_rgba(0,0,0,0.22)] w-full max-w-sm overflow-hidden ${SMART_MODAL_MOTION_ZOOM_ENTER}`}>
                <div className="relative px-4 py-4 border-b border-white/[0.08] bg-gradient-to-l from-[#E6C673]/10 via-transparent to-transparent flex justify-between items-center">
                    <h3 className="font-bold text-sm text-white/95">
                        تسجيل طعن استثنائي
                    </h3>
                    <button type="button" onClick={onClose} className={GLASS_CLOSE}>
                        <X size={18} />
                    </button>
                </div>
                
                <div className="p-5 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">نوع الطعن (تلقائي)</label>
                        <input type="text" value={type} disabled className={`${fieldClass} text-white/50 cursor-not-allowed font-bold opacity-80`} />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">تاريخ تقديم الطلب <span className="text-[#E6C673]">*</span></label>
                        <input type="date" value={appealDate} onChange={e => setAppealDate(e.target.value)} className={fieldClass} />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">المحكمة المقدم إليها الطلب <span className="text-[#E6C673]">*</span></label>
                        <input type="text" value={targetCourt} onChange={e => setTargetCourt(e.target.value)} className={fieldClass} />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">أسباب الطعن / ملاحظات</label>
                        <textarea value={reasons} onChange={e => setReasons(e.target.value)} className={`${fieldClass} min-h-[80px]`} />
                    </div>

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!targetCourt}
                        className="w-full bg-[#E6C673]/15 border border-[#E6C673]/30 text-[#E6C673] py-3 rounded-xl font-bold text-sm transition-all hover:bg-[#E6C673]/25 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                        تأكيد تسجيل الطعن
                    </button>
                </div>
            </div>
        </div>
    );
};

