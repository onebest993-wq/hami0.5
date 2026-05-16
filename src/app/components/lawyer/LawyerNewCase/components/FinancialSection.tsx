import React from 'react';
import { Coins } from 'lucide-react';

export interface FinancialSectionProps {
    totalAgreedFees: string;
    onFeesChange: (value: string) => void;
}

export const FinancialSection = ({ totalAgreedFees, onFeesChange }: FinancialSectionProps) => {
    return (
        <div className="bg-[#151925] p-5 pt-6 pb-24 border-t border-white/5">
            <h4 className="text-xs font-bold text-[#E6C673] uppercase tracking-wider mb-4 flex items-center gap-2">
                <Coins size={14} /> البيانات المالية والأتعاب
            </h4>
            <div>
                <label className="text-[10px] text-white/30 mb-2 block">مبلغ الأتعاب الكلي المتفق عليه</label>
                <div className="relative">
                    <input
                        type="text"
                        inputMode="numeric"
                        value={totalAgreedFees}
                        onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9.,]/g, '');
                            onFeesChange(val);
                        }}
                        className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-4 py-3 pl-12 text-white focus:border-[#E6C673] outline-none text-lg font-bold placeholder-white/10"
                        placeholder="أدخل المبلغ الكلي هنا..."
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-white/30 font-bold">د.ع</span>
                </div>
            </div>
        </div>
    );
};
