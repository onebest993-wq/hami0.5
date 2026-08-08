import { useState } from 'react';
import { DollarSign, X } from '@/app/components/ui/lucideIcons';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { SMART_FILE_NESTED_MODAL_OVERLAY_DARK_CLASS } from '../../smartFile/smartFileOverlayZ';
import type { AddPaymentModalProps } from '../../smartFile/modalFormTypes';

export const AddPaymentModal = ({ isOpen, onClose, onAdd }: AddPaymentModalProps) => {
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(getLocalTodayYmd());

    const handleSubmit = () => {
        if (!amount) return;
        onAdd(Number(amount), date);
        onClose();
        setAmount('');
    };

    if (!isOpen) return null;

    return (
        <div className={SMART_FILE_NESTED_MODAL_OVERLAY_DARK_CLASS}>
            <div className="bg-[#1A1E2E] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                 <div className="bg-[#E6C673] p-4 text-[#0F172A] flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2"><DollarSign size={18}/> تسجيل دفعة جديدة</h3>
                    <button type="button" onClick={onClose} className="hover:bg-black/10 rounded-full p-1"><X size={18} /></button>
                 </div>
                <div className="p-5 space-y-4">
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="المبلغ" className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-[#E6C673]" autoFocus />
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-[#E6C673] [color-scheme:dark]" />
                    <button type="button" onClick={handleSubmit} className="w-full bg-[#E6C673] text-[#0F172A] py-3 rounded-lg font-bold text-sm hover:bg-[#F4D03F] transition-all shadow-lg shadow-[#E6C673]/20">تسجيل</button>
                </div>
            </div>
        </div>
    );
};
