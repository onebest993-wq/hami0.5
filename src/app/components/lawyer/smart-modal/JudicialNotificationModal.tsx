import React, { useState } from 'react';
import { X } from 'lucide-react';

export const JudicialNotificationModal = ({ isOpen, onClose, onSave }: any) => {
    const [targetPerson, setTargetPerson] = useState('');
    const [reason, setReason] = useState('');
    const [isCompleted, setIsCompleted] = useState(false);

    const handleSubmit = () => {
        if (!targetPerson || !reason) return;
        onSave({ targetPerson, reason, isCompleted });
        onClose();
        setTargetPerson('');
        setReason('');
        setIsCompleted(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-['Tajawal']">
            <div className="bg-[#1A1E2E] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                <div className="bg-amber-600 p-4 text-white flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2">📢 تبليغ قضائي</h3>
                    <button type="button" onClick={onClose} className="hover:bg-black/10 rounded-full p-1"><X size={18} /></button>
                </div>
                <div className="p-5 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">الشخص المراد تبليغه <span className="text-red-500">*</span></label>
                        <input type="text" value={targetPerson} onChange={e => setTargetPerson(e.target.value)} className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-amber-600" autoFocus placeholder="الاسم الكامل" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">سبب التبليغ <span className="text-red-500">*</span></label>
                        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-amber-600" placeholder="مثال: موعد مرافعة، قرار حكم..." />
                    </div>
                    
                    <label className="flex items-center gap-2 cursor-pointer bg-white/5 p-3 rounded-lg border border-white/10">
                        <input type="checkbox" checked={isCompleted} onChange={e => setIsCompleted(e.target.checked)} className="w-4 h-4 accent-green-500" />
                        <span className="text-sm text-white/80">تم التبليغ فعلياً (إضافة للسجل)</span>
                    </label>

                    <button type="button" onClick={handleSubmit} disabled={!targetPerson || !reason} className="w-full bg-amber-600 text-white py-3 rounded-lg font-bold text-sm hover:bg-amber-700 transition-all shadow-lg shadow-amber-600/20 disabled:opacity-50">
                        حفظ التبليغ
                    </button>
                </div>
            </div>
        </div>
    );
};
