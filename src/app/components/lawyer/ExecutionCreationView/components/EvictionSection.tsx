import React from 'react';
import { ecg } from './executionCreationGlassUi';

interface EvictionSectionProps {
    evictionPropertyNumber: string;
    evictionDistrict: string;
    evictionPropertyType: string;
    evictionFullAddress: string;
    onPropertyNumberChange: (v: string) => void;
    onDistrictChange: (v: string) => void;
    onPropertyTypeChange: (v: string) => void;
    onFullAddressChange: (v: string) => void;
}

export const EvictionSection: React.FC<EvictionSectionProps> = ({
    evictionPropertyNumber,
    evictionDistrict,
    evictionPropertyType,
    evictionFullAddress,
    onPropertyNumberChange,
    onDistrictChange,
    onPropertyTypeChange,
    onFullAddressChange,
}) => (
    <div className={`${ecg.subCard} animate-fade-in`}>
        <h4 className={`${ecg.subCardTitle} text-[#E6C673] border-b border-white/8 pb-2 mb-3`}>
            بيانات العين — تخلية مأجور / تسليم عقار
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
                <label className={ecg.labelGold}>
                    رقم العقار / الدار <span className="text-rose-400">*</span>
                </label>
                <input
                    type="text"
                    value={evictionPropertyNumber}
                    onChange={(e) => onPropertyNumberChange(e.target.value)}
                    className={`${ecg.field} text-sm`}
                    placeholder="مثال: ١٢ / قطعة ٣"
                    dir="rtl"
                />
            </div>
            <div>
                <label className={ecg.labelGold}>
                    المقاطعة <span className="text-rose-400">*</span>
                </label>
                <input
                    type="text"
                    value={evictionDistrict}
                    onChange={(e) => onDistrictChange(e.target.value)}
                    className={`${ecg.field} text-sm`}
                    placeholder="المقاطعة"
                    dir="rtl"
                />
            </div>
            <div className="sm:col-span-2">
                <label className={ecg.labelGold}>
                    نوع وجنس العقار <span className="text-rose-400">*</span>
                </label>
                <input
                    type="text"
                    value={evictionPropertyType}
                    onChange={(e) => onPropertyTypeChange(e.target.value)}
                    className={`${ecg.field} text-sm`}
                    placeholder="مثال: دار سكنية، محل تجاري، طابق أرضي..."
                    dir="rtl"
                />
            </div>
            <div className="sm:col-span-2">
                <label className={ecg.labelGold}>
                    العنوان الكامل للعين <span className="text-rose-400">*</span>
                </label>
                <textarea
                    value={evictionFullAddress}
                    onChange={(e) => onFullAddressChange(e.target.value)}
                    className={`${ecg.textarea} text-sm min-h-[72px]`}
                    placeholder="المنطقة، الشارع، أقرب نقطة دالة، أية تفاصيل للتنفيذ الميداني"
                    dir="rtl"
                />
            </div>
        </div>
    </div>
);
