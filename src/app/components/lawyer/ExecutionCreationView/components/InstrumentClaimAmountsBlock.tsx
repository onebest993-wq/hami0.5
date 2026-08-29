import React from 'react';
import { Scale } from '@/app/components/ui/icons/Scale';
import { ecg } from './executionCreationGlassUi';
import { SmartAlimonyCalculator } from './SmartAlimonyCalculator';
import { PastAlimonyFieldsSection, PastAlimonyResultPreview } from './PastAlimonySection';
import type { AlimonyCalculationResult } from '../hooks/useAlimonyCalculator';

interface SelectOption {
    value: string;
    label: string;
}

export interface InstrumentClaimAmountsBlockProps {
    claimTypeOptionsList: SelectOption[];
    effectiveClaimTypes: string[];
    claimType: string;
    claimSectionCardClass: string;
    showMultiClaimAggregatePanel: boolean;
    aggregatedClaimTotalDisplay: number;
    docType: string;

    formatCurrency: (raw: string) => string;
    handleAmountChange: (
        e: React.ChangeEvent<HTMLInputElement>,
        setter: (val: string) => void,
    ) => void;
    totalAmount: string;
    onTotalAmountChange: (v: string) => void;
    claimAmountsByType: Record<string, string>;
    onClaimAmountsByTypeChange: (updater: (prev: Record<string, string>) => Record<string, string>) => void;

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
    alimonyPastLawSystem: 'قانون الأحوال الشخصية 1959' | 'الفقه الجعفري';
    onAlimonyPastLawSystemChange: (v: 'قانون الأحوال الشخصية 1959' | 'الفقه الجعفري') => void;
    alimonyPastStartDate: string;
    onAlimonyPastStartDateChange: (v: string) => void;
    pastWifeAlimonyAmount: string;
    onPastWifeAlimonyAmountChange: (v: string) => void;

    claimUsesMonetaryAmountField: (ct: string) => boolean;
    isShariaLinkedFinancialClaim: (ct: string) => boolean;
}

/**
 * كتل المبالغ والمجمّع + حاسبات النفقة / النفقة الماضية.
 */
export const InstrumentClaimAmountsBlock: React.FC<InstrumentClaimAmountsBlockProps> = ({
    claimTypeOptionsList,
    effectiveClaimTypes,
    claimType,
    claimSectionCardClass,
    showMultiClaimAggregatePanel,
    aggregatedClaimTotalDisplay,
    docType,
    formatCurrency,
    handleAmountChange,
    totalAmount,
    onTotalAmountChange,
    claimAmountsByType,
    onClaimAmountsByTypeChange,
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
    alimonyPastLawSystem,
    onAlimonyPastLawSystemChange,
    alimonyPastStartDate,
    onAlimonyPastStartDateChange,
    pastWifeAlimonyAmount,
    onPastWifeAlimonyAmountChange,
    claimUsesMonetaryAmountField,
    isShariaLinkedFinancialClaim,
}) => {
    const claimTypeInputSections = effectiveClaimTypes.map((ct) => {
        const ctLabel = claimTypeOptionsList.find((o) => o.value === ct)?.label ?? ct;
        if (ct === 'نفقة') {
            return (
                <SmartAlimonyCalculator
                    key={ct}
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
            );
        }
        if (ct === 'نفقة ماضية') {
            const pastCalc = calculatedAlimonyNew;
            return (
                <div key={ct} className={`${claimSectionCardClass} space-y-4`}>
                    <div className={ecg.cardHeader}>
                        <h4 className={ecg.cardTitle}>
                            {ctLabel}
                        </h4>
                        <p className={ecg.cardSubtitle}>
                            احتساب النفقة الماضية من تاريخ الاستحقاق حتى إقامة الدعوى
                        </p>
                    </div>
                    <PastAlimonyFieldsSection
                        alimonyPastLawSystem={alimonyPastLawSystem}
                        alimonyPastStartDate={alimonyPastStartDate}
                        alimonyLawsuitDate={alimonyLawsuitDate}
                        alimonyPastWifeMonthly={pastWifeAlimonyAmount}
                        onPastLawSystemChange={onAlimonyPastLawSystemChange}
                        onPastStartDateChange={onAlimonyPastStartDateChange}
                        onLawsuitDateChange={onAlimonyLawsuitDateChange}
                        onPastWifeMonthlyChange={onPastWifeAlimonyAmountChange}
                        calculated={pastCalc}
                    />
                    <PastAlimonyResultPreview
                        calculated={pastCalc}
                        pastLawSystem={alimonyPastLawSystem}
                        variant="standalone"
                    />
                </div>
            );
        }
        if (claimUsesMonetaryAmountField(ct)) {
            return (
                <div key={ct}>
                    <label className={ecg.labelGold}>
                        {ctLabel} — المبلغ المطلوب (دينار) *
                    </label>
                    <div className={ecg.moneyWrap}>
                        <input
                            type="text"
                            required
                            aria-required="true"
                            value={formatCurrency(
                                claimAmountsByType[ct] ??
                                    (effectiveClaimTypes.length === 1 ? totalAmount : '')
                            )}
                            onChange={(e) =>
                                handleAmountChange(e, (v) => {
                                    onClaimAmountsByTypeChange((prev) => ({
                                        ...prev,
                                        [ct]: v,
                                    }));
                                    if (effectiveClaimTypes.length === 1) {
                                        onTotalAmountChange(v);
                                    }
                                })
                            }
                            className={ecg.moneyInput}
                            aria-label={`${ctLabel} — المبلغ المطلوب (دينار)`}
                        />
                        <span className="text-slate-500 text-[10px] font-bold shrink-0">د.ع</span>
                    </div>
                </div>
            );
        }
        return null;
    });

    const claimAmountSectionsNode = showMultiClaimAggregatePanel ? (
        <div className={ecg.aggregatePanel}>
            <div className={ecg.cardHeader}>
                <h4 className={ecg.cardTitle}>
                    <Scale size={18} className="text-[#E6C673]" />
                    تفاصيل المطالبات المالية المجمّعة
                </h4>
                <p className={ecg.cardSubtitle}>
                    أدخل مبلغ كل مطالبة على حدة؛ يُحسب الإجمالي تلقائياً أدناه.
                </p>
            </div>
            <div className="space-y-3">{claimTypeInputSections}</div>
            <div className={ecg.aggregateTotalRow}>
                <span className={ecg.aggregateTotalLabel}>
                    إجمالي المطالبات (دينار)
                </span>
                <span className={ecg.aggregateTotalValue}>
                    {formatCurrency(String(aggregatedClaimTotalDisplay))}
                </span>
            </div>
        </div>
    ) : (
        <>{claimTypeInputSections}</>
    );

    return (
        <>
            {/* === PHASE 28: CONDITIONAL DYNAMIC INPUTS === */}
            {claimAmountSectionsNode}

            {/* مطالبات مالية لمسارات غير المجمّع (مدني / سندات) */}
            {effectiveClaimTypes.length === 0 &&
            claimType &&
            claimUsesMonetaryAmountField(claimType) &&
            !isShariaLinkedFinancialClaim(claimType) ? (
                <div>
                    <label className={ecg.labelGold}>المبلغ المطلوب (دينار)</label>
                    <div className={ecg.moneyWrap}>
                        <input
                            type="text"
                            value={formatCurrency(totalAmount)}
                            onChange={(e) => handleAmountChange(e, onTotalAmountChange)}
                            className={ecg.moneyInput}
                            aria-label="المبلغ المطلوب (دينار)"
                        />
                        <span className="text-slate-500 text-[10px] font-bold shrink-0">د.ع</span>
                    </div>
                </div>
            ) : null}
        </>
    );
};
