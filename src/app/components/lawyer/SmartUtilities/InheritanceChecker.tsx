import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Users } from 'lucide-react';

export const InheritanceChecker = () => {
    const [heirs, setHeirs] = useState<string[]>([]);

    const toggleHeir = (h: string) => {
        if (heirs.includes(h)) setHeirs(heirs.filter(x => x !== h));
        else setHeirs([...heirs, h]);
    };

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="bg-[#E6C673]/10 border border-[#E6C673]/30 p-4 rounded-xl flex gap-3 items-start">
                <div className="mt-1 text-[#E6C673]"><Users size={20} /></div>
                <div>
                    <h4 className="text-white text-sm font-bold mb-1">مدقق القسام الشرعي:</h4>
                    <p className="text-white/70 text-xs leading-relaxed">أدخل الورثة (زوجة، بنت، أخ)، وسأعطيك المسألة الإرثية والأسهم فوراً.</p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
                {['زوجة', 'ابن', 'بنت', 'أب', 'أم', 'أخ', 'أخت'].map(h => (
                    <button type="button"
                        key={h}
                        onClick={() => toggleHeir(h)}
                        className={`p-3 rounded-xl border text-sm font-bold transition-all ${heirs.includes(h) ? 'bg-[#E6C673] border-[#E6C673] text-[#0B1021]' : 'bg-[#0B1021] border-white/10 text-white/50 hover:bg-white/5'}`}
                    >
                        {h}
                    </button>
                ))}
            </div>

            {heirs.length > 0 ? (
                <div className="mt-6 bg-[#0B1021] rounded-2xl p-4 border border-white/10">
                    <h4 className="text-white text-sm font-bold mb-4 border-b border-white/5 pb-2">المسألة الإرثية (تقديرية):</h4>
                    <div className="space-y-3">
                        {heirs.includes('زوجة') && (
                            <div className="flex justify-between items-center text-sm text-white/80">
                                <span>الزوجة</span>
                                <span className="font-mono text-[#E6C673]">{heirs.includes('ابن') || heirs.includes('بنت') ? '1/8 (الثمن)' : '1/4 (الربع)'}</span>
                            </div>
                        )}
                        {(heirs.includes('ابن') || heirs.includes('بنت')) && (
                            <div className="flex justify-between items-center text-sm text-white/80">
                                <span>الأولاد</span>
                                <span className="font-mono text-[#E6C673]">الباقي (للذكر مثل حظ الأنثيين)</span>
                            </div>
                        )}
                        {!heirs.includes('ابن') && !heirs.includes('بنت') && heirs.includes('أخ') && (
                            <div className="flex justify-between items-center text-sm text-white/80">
                                <span>الأخوة</span>
                                <span className="font-mono text-[#E6C673]">العصبة (الباقي)</span>
                            </div>
                        )}
                    </div>
                    <div className="mt-3 text-[10px] text-white/40 text-center">هذا تقسيم أولي وفق المذهب الجعفري/القانون العراقي الموحد، قد تختلف التفاصيل بحسب الحجب والرد.</div>
                </div>
            ) : (
                <div className="mt-6 flex flex-col items-center justify-center p-8 border border-dashed border-white/10 rounded-2xl text-white/30">
                    <Users size={32} className="mb-2 opacity-50" />
                    <p className="text-xs">اختر الورثة لبدء الحساب</p>
                </div>
            )}
        </motion.div>
    );
};
