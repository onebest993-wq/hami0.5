import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Wallet } from 'lucide-react';
import type { FeeResult } from './types';

export const FeesCalculator = () => {
    const [amount, setAmount] = useState('');
    const [fee, setFee] = useState<FeeResult | null>(null);

    const calculate = () => {
        const val = parseFloat(amount);
        if (isNaN(val)) return;
        const baseFee = val * 0.02;
        const stamps = 2500;
        setFee({ base: baseFee, stamps, total: baseFee + stamps });
    };

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="bg-[#E6C673]/10 border border-[#E6C673]/30 p-4 rounded-xl flex gap-3 items-start">
                <div className="mt-1 text-[#E6C673]"><Wallet size={20} /></div>
                <div>
                    <h4 className="text-white text-sm font-bold mb-1">حاسبة الرسوم:</h4>
                    <p className="text-white/70 text-xs leading-relaxed">تحسب (رسم الطابع + رسم الدعوى) بناءً على قيمة الدعوى المقدرة.</p>
                </div>
            </div>

            <div>
                <label className="text-white/50 text-xs block mb-2">قيمة الدعوى (دينار عراقي)</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="مثلاً: 10000000" className="w-full bg-[#0B1021] border border-white/10 rounded-xl p-3 text-white focus:border-[#E6C673]" />
            </div>

            <button type="button" onClick={calculate} className="w-full py-3 bg-[#E6C673] text-[#0B1021] font-bold rounded-xl hover:scale-[1.02] transition-transform">احسب الرسوم</button>

            {fee && (
                <div className="space-y-2 mt-4">
                    <div className="flex justify-between p-3 bg-[#0B1021] rounded-lg border border-white/5">
                        <span className="text-white/50 text-sm">رسم الدعوى (النسبة)</span>
                        <span className="text-white font-mono">{fee.base.toLocaleString()} د.ع</span>
                    </div>
                    <div className="flex justify-between p-3 bg-[#0B1021] rounded-lg border border-white/5">
                        <span className="text-white/50 text-sm">رسم الطابع المالي</span>
                        <span className="text-white font-mono">{fee.stamps.toLocaleString()} د.ع</span>
                    </div>
                    <div className="flex justify-between p-4 bg-indigo-600 rounded-xl border border-indigo-500 mt-2">
                        <span className="text-white font-bold">الإجمالي التقريبي</span>
                        <span className="text-white font-bold font-mono text-lg">{fee.total.toLocaleString()} د.ع</span>
                    </div>
                </div>
            )}
        </motion.div>
    );
};
