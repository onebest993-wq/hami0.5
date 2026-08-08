import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Banknote, Search } from '@/app/components/ui/lucideIcons';

interface EstateCardProps {
    estateUnit: 'cash' | 'area' | 'shares';
    estateValue: string;
    isSpotlightEnabled: boolean;
    spotlightData: { name: string; role: string };
    onEstateUnitChange: (u: 'cash' | 'area' | 'shares') => void;
    onEstateValueChange: (v: string) => void;
    onSpotlightToggle: () => void;
    onSpotlightDataChange: (d: { name: string; role: string }) => void;
    formatInput: (val: string, unit: 'cash' | 'area' | 'shares') => string;
    getUnitLabel: (unit: 'cash' | 'area' | 'shares') => string;
}

export const EstateCard: React.FC<EstateCardProps> = ({
    estateUnit, estateValue, isSpotlightEnabled, spotlightData,
    onEstateUnitChange, onEstateValueChange, onSpotlightToggle, onSpotlightDataChange,
    formatInput, getUnitLabel,
}) => {
    return (
        <div className="bg-[#25293C] rounded-2xl p-5 border border-white/5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <Banknote className="text-[#E6C673]" size={20} />
                <h2 className="text-white font-bold">الذمة المالية للتركة</h2>
            </div>

            <div>
                <label className="text-xs text-white/50 block mb-2">ماذا تريد أن تقسم؟</label>
                <div className="flex bg-[#1A1E2E] p-1 rounded-xl">
                    {[
                        { id: 'cash' as const, label: 'نقد / مال' },
                        { id: 'area' as const, label: 'مساحة عقار' },
                        { id: 'shares' as const, label: 'أسهم طابو' }
                    ].map((u) => (
                        <button type="button"
                            key={u.id}
                            onClick={() => {
                                onEstateUnitChange(u.id);
                                if (u.id === 'shares') onEstateValueChange('2,400');
                                else onEstateValueChange('');
                            }}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${estateUnit === u.id ? 'bg-[#E6C673] text-black shadow-lg' : 'text-white/50 hover:text-white'}`}
                        >
                            {u.label}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="text-xs text-white/50 block mb-2">
                    {estateUnit === 'cash' ? 'المبلغ الإجمالي' :
                     estateUnit === 'area' ? 'مساحة العقار الكلية' : 'مجموع الأسهم السند'}
                </label>
                <div className="relative">
                    <input
                        type="text"
                        value={estateValue}
                        onChange={(e) => onEstateValueChange(formatInput(e.target.value, estateUnit))}
                        placeholder={estateUnit === 'cash' ? 'مثال: 100,000,000' : estateUnit === 'area' ? 'مثال: 200' : '2400'}
                        className="w-full bg-[#1A1E2E] border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-lg text-left ltr focus:border-[#E6C673] focus:outline-none transition-colors placeholder-white/20"
                        dir="ltr"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-xs">
                        {getUnitLabel(estateUnit)}
                    </span>
                </div>
            </div>

            <div className="flex items-center justify-between pt-2">
                <label className="text-sm text-white font-bold flex items-center gap-2">
                    <Search size={16} className={isSpotlightEnabled ? 'text-[#E6C673]' : 'text-white/50'} />
                    حساب نصيب وارث محدد؟
                </label>
                <button type="button"
                    onClick={onSpotlightToggle}
                    className={`w-12 h-6 rounded-full relative transition-colors ${isSpotlightEnabled ? 'bg-[#E6C673]' : 'bg-white/10'}`}
                >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isSpotlightEnabled ? 'left-1' : 'left-7'}`} />
                </button>
            </div>

            <AnimatePresence>
                {isSpotlightEnabled && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-3 overflow-hidden"
                    >
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <div className="col-span-1">
                                <label className="text-[10px] text-white/50 block mb-1">الصفة (إجباري)</label>
                                <select
                                    value={spotlightData.role}
                                    onChange={(e) => onSpotlightDataChange({ ...spotlightData, role: e.target.value })}
                                    className="w-full bg-[#1A1E2E] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-[#E6C673] outline-none appearance-none"
                                >
                                    <option value="wife">الزوجة</option>
                                    <option value="husband">الزوج</option>
                                    <option value="son">الابن</option>
                                    <option value="daughter">البنت</option>
                                    <option value="father">الأب</option>
                                    <option value="mother">الأم</option>
                                </select>
                            </div>
                            <div className="col-span-1">
                                <label className="text-[10px] text-white/50 block mb-1">الاسم (اختياري)</label>
                                <input
                                    type="text"
                                    value={spotlightData.name}
                                    onChange={(e) => onSpotlightDataChange({ ...spotlightData, name: e.target.value })}
                                    placeholder="مثال: أحمد"
                                    className="w-full bg-[#1A1E2E] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-[#E6C673] outline-none placeholder-white/20"
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
