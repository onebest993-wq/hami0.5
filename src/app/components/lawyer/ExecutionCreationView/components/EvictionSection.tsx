import React from 'react';

interface EvictionSectionProps {
    evictionPropertyNumber: string;
    evictionDistrict: string;
    evictionPropertyType: string;
    evictionFullAddress: string;
    evictionPremisesUse: 'commercial' | 'residential';
    onPropertyNumberChange: (v: string) => void;
    onDistrictChange: (v: string) => void;
    onPropertyTypeChange: (v: string) => void;
    onFullAddressChange: (v: string) => void;
    onPremisesUseChange: (v: 'commercial' | 'residential') => void;
}

export const EvictionSection: React.FC<EvictionSectionProps> = ({
    evictionPropertyNumber,
    evictionDistrict,
    evictionPropertyType,
    evictionFullAddress,
    evictionPremisesUse,
    onPropertyNumberChange,
    onDistrictChange,
    onPropertyTypeChange,
    onFullAddressChange,
    onPremisesUseChange,
}) => {
    return (
        <div className="backdrop-blur-xl bg-[#0A1122]/70 border border-white/10 rounded-xl p-3 space-y-3 animate-fade-in">
            <div className="border-b border-[#E6C673]/20 pb-2 mb-1">
                <h4 className="text-[#E6C673] font-bold text-sm text-right">
                    بيانات العين — تخلية مأجور / تسليم عقار
                </h4>
                <p className="text-slate-500 text-[10px] text-right mt-1">
                    إلزامية؛ تُستخدم في مسار التنفيذ الميداني ولا تُخلط بحساب الدين المالي.
                </p>
            </div>
            <div className="rounded-xl border border-[#E6C673]/20 bg-[#0B1120]/80 p-3 space-y-2">
                <p className="text-[#E6C673] text-xs font-bold text-right">نوع استعمال العين</p>
                <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-3 cursor-pointer flex-row-reverse justify-end">
                        <input
                            type="radio"
                            name="evictionPremisesUse"
                            checked={evictionPremisesUse === 'residential'}
                            onChange={() => onPremisesUseChange('residential')}
                            className="accent-[#E6C673] w-4 h-4"
                        />
                        <span className="text-slate-200 text-sm">سكني (منزل / مسكن)</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer flex-row-reverse justify-end">
                        <input
                            type="radio"
                            name="evictionPremisesUse"
                            checked={evictionPremisesUse === 'commercial'}
                            onChange={() => onPremisesUseChange('commercial')}
                            className="accent-[#E6C673] w-4 h-4"
                        />
                        <span className="text-slate-200 text-sm">تجاري (محل / غير سكني)</span>
                    </label>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 text-right">
                        رقم العقار / الدار <span className="text-rose-400">*</span>
                    </label>
                    <input
                        type="text"
                        value={evictionPropertyNumber}
                        onChange={(e) => onPropertyNumberChange(e.target.value)}
                        className="w-full bg-[#0B1120] border border-white/10 text-white p-3 rounded-lg focus:border-[#E6C673]/50 outline-none text-sm"
                        placeholder="مثال: ١٢ / قطعة ٣"
                        dir="rtl"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 text-right">
                        المقاطعة <span className="text-rose-400">*</span>
                    </label>
                    <input
                        type="text"
                        value={evictionDistrict}
                        onChange={(e) => onDistrictChange(e.target.value)}
                        className="w-full bg-[#0B1120] border border-white/10 text-white p-3 rounded-lg focus:border-[#E6C673]/50 outline-none text-sm"
                        placeholder="المقاطعة"
                        dir="rtl"
                    />
                </div>
                <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 text-right">
                        نوع وجنس العقار <span className="text-rose-400">*</span>
                    </label>
                    <input
                        type="text"
                        value={evictionPropertyType}
                        onChange={(e) => onPropertyTypeChange(e.target.value)}
                        className="w-full bg-[#0B1120] border border-white/10 text-white p-3 rounded-lg focus:border-[#E6C673]/50 outline-none text-sm"
                        placeholder="مثال: دار سكنية، محل تجاري، طابق أرضي..."
                        dir="rtl"
                    />
                </div>
                <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 text-right">
                        العنوان الكامل للعين <span className="text-rose-400">*</span>
                    </label>
                    <textarea
                        value={evictionFullAddress}
                        onChange={(e) => onFullAddressChange(e.target.value)}
                        className="w-full bg-[#0B1120] border border-white/10 text-white p-3 rounded-lg focus:border-[#E6C673]/50 outline-none text-sm min-h-[72px] resize-y"
                        placeholder="المنطقة، الشارع، أقرب نقطة دالة، أية تفاصيل للتنفيذ الميداني"
                        dir="rtl"
                    />
                </div>
            </div>
        </div>
    );
};
