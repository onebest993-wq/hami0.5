import React from 'react';
import { motion } from 'motion/react';
import { Wallet, Plus, Check } from 'lucide-react';

interface FinancialCardProps {
    total: number | string;
    paid: number | string;
    onAddPayment: () => void;
    isEditing: boolean;
    onUpdateTotal?: (val: number) => void;
}

export const FinancialCard = ({ total, paid, onAddPayment, isEditing, onUpdateTotal }: FinancialCardProps) => {
    // Helper to safely parse numbers from potential strings with commas
    const parseNum = (val: number | string | null | undefined) => {
        if (!val) return 0;
        if (typeof val === 'number') return val;
        return Number(String(val).replace(/[^0-9.]/g, '')) || 0;
    };

    const totalNum = parseNum(total);
    const paidNum = parseNum(paid);
    const remaining = Math.max(0, totalNum - paidNum);
    const percent = totalNum > 0 ? Math.min(100, Math.round((paidNum / totalNum) * 100)) : 0;
    const isPaidOff = totalNum > 0 && remaining === 0;

    return (
        <div className="bg-[#1A1E2E]/80 backdrop-blur-md rounded-2xl border border-[#E6C673]/30 p-4 mb-4 relative overflow-hidden group">
            <div className="flex items-center justify-between mb-3" dir="rtl">
                <h3 className="text-[#E6C673] text-xs font-bold flex items-center gap-2">
                    الموقف المالي والأتعاب
                    <Wallet size={16} />
                </h3>
                <button type="button" onClick={onAddPayment} className="w-6 h-6 rounded-full bg-[#E6C673]/10 text-[#E6C673] flex items-center justify-center hover:bg-[#E6C673] hover:text-[#0F172A] transition-all print:hidden" title="تسجيل دفعة جديدة">
                    <Plus size={14} />
                </button>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center relative z-10">
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-[#E6C673] font-bold">المبلغ الكلي</span>
                    {isEditing ? (
                        <input 
                            type="number" 
                            value={totalNum} 
                            onChange={(e) => onUpdateTotal(Number(e.target.value))} 
                            className="bg-[#2A3241] text-white placeholder:text-white/50 text-sm font-bold w-full text-center border border-white/15 rounded p-1 outline-none focus:border-[#E6C673]"
                        />
                    ) : (
                        <span className="text-sm font-bold text-[#E6C673]">{totalNum.toLocaleString()}</span>
                    )}
                </div>
                <div className="flex flex-col gap-1 border-r border-l border-white/5">
                    <span className="text-[10px] text-white/90">الواصل</span>
                    <span className="text-sm font-bold text-green-400">{paidNum.toLocaleString()}</span>
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-white/90">المتبقي</span>
                    {isPaidOff ? (
                        <div className="flex items-center justify-center gap-1 text-green-500 font-bold text-sm">
                            <Check size={14} strokeWidth={3} />
                            <span>خالصة</span>
                        </div>
                    ) : (
                        <span className="text-sm font-bold text-red-400">{remaining.toLocaleString()}</span>
                    )}
                </div>
            </div>

            <div className="mt-4 relative h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    className={`absolute top-0 left-0 h-full rounded-full ${isPaidOff ? 'bg-green-500' : 'bg-gradient-to-r from-green-500 to-[#E6C673]'}`}
                />
            </div>
            <div className="flex justify-between text-[9px] text-white/20 mt-1 font-mono">
                <span>0%</span>
                <span className={isPaidOff ? "text-green-500 font-bold" : ""}>{percent}% {isPaidOff ? 'مدفوع بالكامل' : 'مسدد'}</span>
                <span>100%</span>
            </div>
        </div>
    );
};
