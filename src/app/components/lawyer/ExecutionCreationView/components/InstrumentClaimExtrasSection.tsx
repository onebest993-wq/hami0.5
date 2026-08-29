import React from 'react';
import { ecg } from './executionCreationGlassUi';
import { SmartAlimonyCalculator } from './SmartAlimonyCalculator';
import { EvictionSection } from './EvictionSection';
import { SpecificDeliveryItemsSetupSection } from './SpecificDeliveryItemsSetupSection';
import { MaritalFurnitureSetupSection } from './MaritalFurnitureSetupSection';
import { isEvictionClaim } from '@/app/utils/executionModuleStrategies';
import { parseMoneyInput } from '../hooks/executionFormUtils';
import type { SpecificDeliveryItem } from '@/app/utils/specificDeliveryItemsUtils';
import type { MaritalFurnitureItem } from '@/app/types/maritalFurniture';
import type { AlimonyCalculationResult } from '../hooks/useAlimonyCalculator';

export interface InstrumentClaimExtrasSectionProps {
    docType: string;
    claimType: string;
    effectiveClaimTypes: string[];
    hasActiveClaim: (ct: string) => boolean;

    alimonyBeneficiary: 'زوجة فقط' | 'أولاد فقط' | 'زوجة وأولاد';
    onAlimonyBeneficiaryChange: (v: 'زوجة فقط' | 'أولاد فقط' | 'زوجة وأولاد') => void;
    alimonyLawsuitDate: string;
    onAlimonyLawsuitDateChange: (v: string) => void;
    alimonyExecutionDate: string;
    onAlimonyExecutionDateChange: (v: string) => void;
    alimonyWifeMonthly: string;
    onAlimonyWifeMonthlyChange: (v: string) => void;
    alimonyChildrenMonthly: string;
    onAlimonyChildrenMonthlyChange: (v: string) => void;
    alimonyChildrenCount: string;
    onAlimonyChildrenCountChange: (v: string) => void;
    calculatedAlimonyNew: AlimonyCalculationResult | null | undefined;
    judgmentDate?: string;
    alimonyIncludesPastCalc?: boolean;
    alimonyPastStartDate: string;

    dowryReason: 'طلاق' | 'وفاة';
    onDowryReasonChange: (v: 'طلاق' | 'وفاة') => void;
    shariaDeedDetails: string;
    onShariaDeedDetailsChange: (v: string) => void;

    evictionPropertyNumber: string;
    onEvictionPropertyNumberChange: (v: string) => void;
    evictionDistrict: string;
    onEvictionDistrictChange: (v: string) => void;
    evictionPropertyType: string;
    onEvictionPropertyTypeChange: (v: string) => void;
    evictionFullAddress: string;
    onEvictionFullAddressChange: (v: string) => void;
    evictionPremisesUse: 'commercial' | 'residential';
    onEvictionPremisesUseChange: (v: 'commercial' | 'residential') => void;

    specificDeliveryItems: SpecificDeliveryItem[];
    onSpecificDeliveryItemsChange: (items: SpecificDeliveryItem[]) => void;

    maritalFurnitureItems: MaritalFurnitureItem[];
    onMaritalFurnitureItemsChange: (items: MaritalFurnitureItem[]) => void;
    formatCurrency: (raw: string) => string;
}

/**
 * حقول المطالبات غير النقدية: نفقة اتفاقية، مهر مؤجل، تخلية، تسليم، أثاث.
 */
export const InstrumentClaimExtrasSection: React.FC<InstrumentClaimExtrasSectionProps> = ({
    docType,
    claimType,
    effectiveClaimTypes,
    hasActiveClaim,
    alimonyBeneficiary,
    onAlimonyBeneficiaryChange,
    alimonyLawsuitDate,
    onAlimonyLawsuitDateChange,
    alimonyExecutionDate,
    onAlimonyExecutionDateChange,
    alimonyWifeMonthly,
    onAlimonyWifeMonthlyChange,
    alimonyChildrenMonthly,
    onAlimonyChildrenMonthlyChange,
    alimonyChildrenCount,
    onAlimonyChildrenCountChange,
    calculatedAlimonyNew,
    judgmentDate = '',
    alimonyIncludesPastCalc = false,
    alimonyPastStartDate,
    dowryReason,
    onDowryReasonChange,
    shariaDeedDetails,
    onShariaDeedDetailsChange,
    evictionPropertyNumber,
    onEvictionPropertyNumberChange,
    evictionDistrict,
    onEvictionDistrictChange,
    evictionPropertyType,
    onEvictionPropertyTypeChange,
    evictionFullAddress,
    onEvictionFullAddressChange,
    evictionPremisesUse,
    onEvictionPremisesUseChange,
    specificDeliveryItems,
    onSpecificDeliveryItemsChange,
    maritalFurnitureItems,
    onMaritalFurnitureItemsChange,
    formatCurrency,
}) => {
    return (
        <>
            {claimType === 'حجة نفقة اتفاقية' && (
                <SmartAlimonyCalculator
                    alimonyBeneficiary={alimonyBeneficiary}
                    alimonyLawsuitDate={alimonyLawsuitDate}
                    alimonyExecutionDate={alimonyExecutionDate}
                    alimonyWifeMonthly={alimonyWifeMonthly}
                    alimonyChildrenMonthly={alimonyChildrenMonthly}
                    alimonyChildrenCount={alimonyChildrenCount}
                    calculatedAlimonyNew={calculatedAlimonyNew ?? null}
                    onBeneficiaryChange={onAlimonyBeneficiaryChange}
                    onLawsuitDateChange={onAlimonyLawsuitDateChange}
                    onExecutionDateChange={onAlimonyExecutionDateChange}
                    onWifeMonthlyChange={onAlimonyWifeMonthlyChange}
                    onChildrenMonthlyChange={onAlimonyChildrenMonthlyChange}
                    onChildrenCountChange={onAlimonyChildrenCountChange}
                    judgmentDate={judgmentDate}
                    docType={docType}
                    claimType={claimType}
                    activeClaimTypes={effectiveClaimTypes}
                    includesPastCalc={alimonyIncludesPastCalc}
                    alimonyPastStartDate={alimonyPastStartDate}
                />
            )}

            {/* ✅ IRAQI LAW: Deferred Dowry Reason — مخفي لمسار أحكام المحاكم + مهر مؤجل (الطلب حصراً من مسار الحجج الشرعية) */}
            {hasActiveClaim('مهر مؤجل') &&
            ['مهر مؤجل', 'حجة زواج - مهر مؤجل'].includes(claimType) &&
            !(docType === 'قرارات وأحكام المحاكم' && claimType === 'مهر مؤجل') && (
                <div className={ecg.callout}>
                    <label className={ecg.labelGold}>
                        سبب استحقاق المهر المؤجل
                        <span className="text-slate-500 text-xs font-normal mr-2">
                            (أقرب الأجلين: الطلاق أو الوفاة)
                        </span>
                    </label>
                    <div className={ecg.choiceRow}>
                        <button
                            type="button"
                            onClick={() => onDowryReasonChange('طلاق')}
                            className={`${ecg.choiceBtn} ${
                                dowryReason === 'طلاق' ? ecg.choiceBtnActive : ecg.choiceBtnIdle
                            }`}
                        >
                            طلاق
                        </button>
                        <button
                            type="button"
                            onClick={() => onDowryReasonChange('وفاة')}
                            className={`${ecg.choiceBtn} ${
                                dowryReason === 'وفاة' ? ecg.choiceBtnActive : ecg.choiceBtnIdle
                            }`}
                        >
                            وفاة
                        </button>
                    </div>
                    <div className={ecg.hintDangerInline}>
                        {dowryReason === 'طلاق'
                            ? '⚠️ يجب إرفاق قرار حكم الطلاق القطعي (المكتسب الدرجة القطعية)'
                            : '⚠️ يجب إرفاق شهادة وفاة الزوج + قسام شرعي لتحديد الورثة'
                        }
                    </div>
                </div>
            )}

            {/* MASTER PHASE: SHARIA DEED DETAILS (Will & Takharuj only) */}
            {['حجة وصية', 'حجة تخارج'].includes(claimType) && (
                <div className={ecg.subCard}>
                    <label className={ecg.labelGold}>
                        تفاصيل الحجة
                        <span className="text-slate-500 text-xs font-normal mr-2">
                            (مثال: لمن الوصية، أو من تخارج لمن)
                        </span>
                    </label>
                    <textarea
                        value={shariaDeedDetails}
                        onChange={(e) => onShariaDeedDetailsChange(e.target.value)}
                        rows={3}
                        placeholder="اكتب تفاصيل الحجة هنا..."
                        className={ecg.textarea}
                    />
                </div>
            )}

            {isEvictionClaim(claimType) && (
                <EvictionSection
                    evictionPropertyNumber={evictionPropertyNumber}
                    evictionDistrict={evictionDistrict}
                    evictionPropertyType={evictionPropertyType}
                    evictionFullAddress={evictionFullAddress}
                    evictionPremisesUse={evictionPremisesUse}
                    onPropertyNumberChange={onEvictionPropertyNumberChange}
                    onDistrictChange={onEvictionDistrictChange}
                    onPropertyTypeChange={onEvictionPropertyTypeChange}
                    onFullAddressChange={onEvictionFullAddressChange}
                    onPremisesUseChange={onEvictionPremisesUseChange}
                />
            )}

            {hasActiveClaim('تسليم شيء معين') && (
                <SpecificDeliveryItemsSetupSection
                    items={specificDeliveryItems}
                    onChange={onSpecificDeliveryItemsChange}
                />
            )}

            {claimType === 'أثاث زوجية' && (
                <MaritalFurnitureSetupSection
                    items={maritalFurnitureItems}
                    onChange={onMaritalFurnitureItemsChange}
                    formatCurrency={formatCurrency}
                    onPriceInput={(e, onParsed) => {
                        const raw = e.target.value.replace(/[^\d]/g, '');
                        onParsed(parseMoneyInput(raw));
                    }}
                />
            )}
        </>
    );
};
