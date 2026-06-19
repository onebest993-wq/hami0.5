import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import type { ModalProps } from './proceduralModalShell';

export const JudgeRecusalModal = ({ isOpen, onClose, onConfirm }: ModalProps) => {
    const [reason, setReason] = useState('');
    const [requestDate, setRequestDate] = useState(getLocalTodayYmd());

    const handleSubmit = () => {
        if (!reason) return;
        onConfirm({ reason, requestDate });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-['Tajawal']" dir="rtl">
            <div className="bg-[#1A1E2E] border border-rose-500/40 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl shadow-rose-900/40">
                <div className="bg-gradient-to-r from-rose-600 to-red-700 p-4 text-white flex justify-between items-center">
                    <h3 className="font-bold text-sm flex items-center gap-2">
                        <span className="text-lg">🛑</span>
                        طلب رد القاضي
                    </h3>
                    <button type="button" onClick={onClose} className="hover:bg-black/10 rounded-full p-1">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-rose-200 text-xs">
                        <AlertTriangle size={14} className="inline ml-2" />
                        تنبيه: تقديم طلب الرد يؤدي لتجميد الدعوى مؤقتاً حتى البت في الطلب
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            سبب طلب الرد <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="مثال: وجود صلة قرابة، مصلحة شخصية..."
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-rose-500 min-h-[100px]"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            تاريخ تقديم الطلب
                        </label>
                        <input
                            type="date"
                            value={requestDate}
                            onChange={(e) => setRequestDate(e.target.value)}
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-rose-500 [color-scheme:dark]"
                        />
                    </div>

                    <button type="button"
                        onClick={handleSubmit}
                        disabled={!reason}
                        className="w-full bg-gradient-to-r from-rose-600 to-red-700 text-white py-3 rounded-lg font-bold text-sm hover:from-rose-500 hover:to-red-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        تقديم طلب الرد وتجميد الدعوى
                    </button>
                </div>
            </div>
        </div>
    );
};

// Transfer Jurisdiction Modal
