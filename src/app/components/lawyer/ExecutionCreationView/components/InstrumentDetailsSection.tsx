import React from 'react';
import { AlertTriangle, Calendar, Zap, ChevronDown, FileText, Scale } from '@/app/components/ui/lucideIcons';
import { ecg } from './executionCreationGlassUi';
import { ExecutionCreationSection } from './ExecutionCreationSection';
import { SmartAlimonyCalculator } from './SmartAlimonyCalculator';
import { PastAlimonyFieldsSection, PastAlimonyResultPreview } from './PastAlimonySection';
import { EvictionSection } from './EvictionSection';
import { SpecificDeliveryItemsSetupSection } from './SpecificDeliveryItemsSetupSection';
import { MaritalFurnitureSetupSection } from './MaritalFurnitureSetupSection';
import { ForeignJudgmentSection, type ForeignJudgmentData } from './ForeignJudgmentSection';
import { isEvictionClaim } from '@/app/utils/executionModuleStrategies';
import { parseMoneyInput } from '../hooks/executionFormUtils';
import type { SpecificDeliveryItem } from '@/app/utils/specificDeliveryItemsUtils';
import type { MaritalFurnitureItem } from '@/app/types/maritalFurniture';
import type { AlimonyCalculationResult } from '../hooks/useAlimonyCalculator';
import type { ExecutionTargetOption } from '../types';

interface SelectOption {
    value: string;
    label: string;
}

interface InstrumentDetailsSectionProps {
    docType: string;
    docNumber: string;
    onDocNumberChange: (v: string) => void;
    currentDocTypeLabel: string;
    onOpenDocTypeSheet: () => void;

    visibleClassificationOptions: SelectOption[];
    classification: string;
    onClassificationChange: (v: string) => void;

    claimTypeOptionsList: SelectOption[];
    currentClaimTypeLabel: string;
    onOpenClaimTypeSheet: () => void;
    effectiveClaimTypes: string[];
    onRemoveActiveClaimType: (value: string) => void;
    claimType: string;
    claimSectionCardClass: string;
    showMultiClaimAggregatePanel: boolean;
    aggregatedClaimTotalDisplay: number;
    hasActiveClaim: (ct: string) => boolean;

    chequeNumber: string;
    onChequeNumberChange: (v: string) => void;

    shariaDeedNumber: string;
    onShariaDeedNumberChange: (v: string) => void;
    shariaRegisterNumber: string;
    onShariaRegisterNumberChange: (v: string) => void;
    shariaIssueDate: string;
    onShariaIssueDateChange: (v: string) => void;
    shariaIssuingCourt: string;
    onShariaIssuingCourtChange: (v: string) => void;
    shariaDeedDetails: string;
    onShariaDeedDetailsChange: (v: string) => void;

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

    dowryReason: 'طلاق' | 'وفاة';
    onDowryReasonChange: (v: 'طلاق' | 'وفاة') => void;
    guardianshipDetails: string;
    onGuardianshipDetailsChange: (v: string) => void;

    evictionPropertyNumber: string;
    onEvictionPropertyNumberChange: (v: string) => void;
    evictionDistrict: string;
    onEvictionDistrictChange: (v: string) => void;
    evictionPropertyType: string;
    onEvictionPropertyTypeChange: (v: string) => void;
    evictionFullAddress: string;
    onEvictionFullAddressChange: (v: string) => void;

    specificDeliveryItems: SpecificDeliveryItem[];
    onSpecificDeliveryItemsChange: (items: SpecificDeliveryItem[]) => void;

    maritalFurnitureItems: MaritalFurnitureItem[];
    onMaritalFurnitureItemsChange: (items: MaritalFurnitureItem[]) => void;

    dueDate: string;
    onDueDateChange: (v: string) => void;

    executionTarget: ExecutionTargetOption;
    onExecutionTargetChange: (v: ExecutionTargetOption) => void;

    isDocumentBlocked: boolean;

    foreignData: ForeignJudgmentData;
    onForeignDataChange: (data: ForeignJudgmentData) => void;

    claimUsesMonetaryAmountField: (ct: string) => boolean;
    isShariaLinkedFinancialClaim: (ct: string) => boolean;
}

/**
 * قسم «السند المنفذ» — هوية السند + نوع المطالبة + كل الحقول الديناميكية
 * الخاصة بأنواع المطالبات — مستخرج من ExecutionCreationView (Phase-1 split).
 */
export const InstrumentDetailsSection: React.FC<InstrumentDetailsSectionProps> = ({
    docType,
    docNumber,
    onDocNumberChange,
    currentDocTypeLabel,
    onOpenDocTypeSheet,
    visibleClassificationOptions,
    classification,
    onClassificationChange,
    claimTypeOptionsList,
    currentClaimTypeLabel,
    onOpenClaimTypeSheet,
    effectiveClaimTypes,
    onRemoveActiveClaimType,
    claimType,
    claimSectionCardClass,
    showMultiClaimAggregatePanel,
    aggregatedClaimTotalDisplay,
    hasActiveClaim,
    chequeNumber,
    onChequeNumberChange,
    shariaDeedNumber,
    onShariaDeedNumberChange,
    shariaRegisterNumber,
    onShariaRegisterNumberChange,
    shariaIssueDate,
    onShariaIssueDateChange,
    shariaIssuingCourt,
    onShariaIssuingCourtChange,
    shariaDeedDetails,
    onShariaDeedDetailsChange,
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
    dowryReason,
    onDowryReasonChange,
    guardianshipDetails,
    onGuardianshipDetailsChange,
    evictionPropertyNumber,
    onEvictionPropertyNumberChange,
    evictionDistrict,
    onEvictionDistrictChange,
    evictionPropertyType,
    onEvictionPropertyTypeChange,
    evictionFullAddress,
    onEvictionFullAddressChange,
    specificDeliveryItems,
    onSpecificDeliveryItemsChange,
    maritalFurnitureItems,
    onMaritalFurnitureItemsChange,
    dueDate,
    onDueDateChange,
    executionTarget,
    onExecutionTargetChange,
    isDocumentBlocked,
    foreignData,
    onForeignDataChange,
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
                    calculatedAlimonyNew={calculatedAlimonyNew}
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

    const claimPickerLocked = (!docType && !classification) || docType === 'الأوراق التجارية';
    const claimPickerEmpty = !claimPickerLocked && claimTypeOptionsList.length === 0;
    const claimButtonLabel = claimPickerLocked
        ? ((!docType && !classification) ? '-- اختر نوع السند أولاً --' : currentClaimTypeLabel || '-- اختر نوع المطالبة والتنفيذ --')
        : claimPickerEmpty
            ? '-- اختر التصنيف أولاً (إن وُجد) --'
            : (currentClaimTypeLabel || '-- اختر نوع المطالبة والتنفيذ --');

    return (
        <ExecutionCreationSection title="السند المنفذ">
            <div className="flex flex-col gap-3">
                {/* ✅ تصحيح 1: تغيير الاسم من "نوع السند" إلى "قرارات المحاكم" عند اختيار أحكام المحاكم */}
                <div>
                    <label className={ecg.labelGold}>نوع السند المنفذ</label>
                    <button
                        type="button"
                        onClick={onOpenDocTypeSheet}
                        className={ecg.pickerBtn}
                    >
                        <ChevronDown size={18} className="text-gray-400 shrink-0" />
                        <span className="flex-1 truncate font-medium">
                            {currentDocTypeLabel || '-- اختر نوع السند المنفذ --'}
                        </span>
                    </button>
                </div>

                {docType === 'قرارات وأحكام المحاكم' && (
                    <div>
                        <label className={ecg.labelGold}>رقم الحكم</label>
                        <input
                            type="text"
                            aria-label="رقم الحكم"
                            value={docNumber}
                            onChange={(e) => onDocNumberChange(e.target.value)}
                            className={ecg.field}
                        />
                    </div>
                )}

                {/* 2. CLASSIFICATION DROPDOWN (التصنيف) - PHASE 31: HIDE for Sharia Deeds */}
                {docType !== 'الحجج الشرعية' && visibleClassificationOptions.length > 0 && (
                    <div>
                        <label className={ecg.labelGold}>التصنيف</label>
                        {!docType ? (
                            <div className="rounded-[1.2rem] border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm font-medium text-slate-500">
                                -- اختر نوع السند أولاً --
                            </div>
                        ) : (
                            <div className={ecg.choiceRow} role="group" aria-label="التصنيف">
                                {visibleClassificationOptions.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => onClassificationChange(opt.value)}
                                        className={`${ecg.choiceBtn} ${
                                            classification === opt.value
                                                ? ecg.choiceBtnActive
                                                : ecg.choiceBtnIdle
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* 3. CLAIM TYPE DROPDOWN (نوع المطالبة والتنفيذ) - PHASE 28: Unified */}
                <div>
                    <label className={`${ecg.labelGold} flex items-center gap-2 flex-wrap`}>
                        نوع المطالبة والتنفيذ
                        {/* ✅ CRITICAL LOGIC: Auto-filled & Locked for Commercial Papers */}
                        {docType === 'الأوراق التجارية' && (
                            <span className="text-xs text-[#E6C673]/80 font-normal">(تلقائي - الصكوك دائماً مطالبات مالية)</span>
                        )}
                    </label>
                    <button
                        type="button"
                        disabled={claimPickerLocked || claimPickerEmpty}
                        onClick={() => {
                            if (!claimPickerLocked && !claimPickerEmpty) {
                                onOpenClaimTypeSheet();
                            }
                        }}
                        className={`${ecg.pickerBtn} ${
                            claimPickerLocked || claimPickerEmpty ? ecg.pickerBtnDisabled : ''
                        }`}
                    >
                        <ChevronDown size={18} className="text-gray-400 shrink-0" />
                        <span className="flex-1 truncate font-medium">{claimButtonLabel}</span>
                    </button>
                    {effectiveClaimTypes.length > 1 ? (
                        <div className="mt-2.5 flex flex-wrap gap-2 justify-end">
                            {effectiveClaimTypes.map((ct) => (
                                <button
                                    key={ct}
                                    type="button"
                                    onClick={() => onRemoveActiveClaimType(ct)}
                                    className={ecg.chip}
                                    title="إزالة من المطالبة المجمّعة"
                                >
                                    {claimTypeOptionsList.find((o) => o.value === ct)?.label ?? ct} ×
                                </button>
                            ))}
                        </div>
                    ) : null}
                </div>

                {/* ✅ حقل رقم السند تم نقله للأعلى في قسم "رقم الحكم" للأحكام القضائية */}
                {/* يظهر فقط لغير الأحكام القضائية والحجج الشرعية */}
                {/* ✅ CRITICAL LOGIC: Dynamic Labels for Commercial Papers */}
                {docType !== 'الحجج الشرعية' && docType !== 'قرارات وأحكام المحاكم' && docType && (
                    <div>
                        {docType === 'الأوراق التجارية' && (
                            <label className={ecg.labelGold}>رقم الصك / الكمبيالة</label>
                        )}
                        <input
                            type="text"
                            aria-label={docType === 'الأوراق التجارية' ? 'رقم الصك / الكمبيالة' : 'رقم السند'}
                            value={docType === 'الأوراق التجارية' ? chequeNumber : docNumber}
                            onChange={(e) => {
                                if (docType === 'الأوراق التجارية') {
                                    onChequeNumberChange(e.target.value);
                                } else {
                                    onDocNumberChange(e.target.value);
                                }
                            }}
                            className={ecg.field}
                            disabled={docType === 'الأوراق التجارية'}
                            title={docType === 'الأوراق التجارية' ? 'تم إدخال هذا الرقم في مدقق الصك' : ''}
                        />
                        {docType === 'الأوراق التجارية' && chequeNumber && (
                            <p className="text-xs text-gray-500 mt-1">✓ تم التحقق من البيانات</p>
                        )}
                    </div>
                )}

                {/* PHASE 49: SHARIA DEED IDENTIFICATION FIELDS */}
                {docType === 'الحجج الشرعية' && (
                    <div className={`${ecg.subCard} animate-fade-in`}>
                        <h4 className={`${ecg.subCardTitle} text-[#E6C673] border-b border-white/8 pb-2 mb-3 flex items-center gap-2`}>
                            <FileText size={16} />
                            بيانات الحجة الشرعية
                        </h4>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            <div>
                                <label className={ecg.labelGold}>العدد / رقم الحجة</label>
                                <input
                                    type="text"
                                    aria-label="العدد / رقم الحجة"
                                    value={shariaDeedNumber}
                                    onChange={(e) => onShariaDeedNumberChange(e.target.value)}
                                    className={`${ecg.field} text-sm`}
                                />
                            </div>
                            <div>
                                <label className={ecg.labelGold}>رقم السجل</label>
                                <input
                                    type="text"
                                    aria-label="رقم السجل"
                                    value={shariaRegisterNumber}
                                    onChange={(e) => onShariaRegisterNumberChange(e.target.value)}
                                    className={`${ecg.field} text-sm`}
                                />
                            </div>
                            <div>
                                <label className={ecg.labelGold}>تاريخ الإصدار</label>
                                <input
                                    type="date"
                                    value={shariaIssueDate}
                                    onChange={(e) => onShariaIssueDateChange(e.target.value)}
                                    style={{ direction: 'ltr', textAlign: 'right' }}
                                    className={`${ecg.field} text-sm`}
                                />
                            </div>
                        </div>
                        {!['مهر مؤجل', 'حجة زواج - مهر معجل', 'حجة زواج - مهر مؤجل'].includes(claimType) && (
                            <div className="mt-3">
                                <label className={ecg.labelGold}>المحكمة الشرعية المصدرة</label>
                                <input
                                    type="text"
                                    aria-label="المحكمة الشرعية المصدرة"
                                    value={shariaIssuingCourt}
                                    onChange={(e) => onShariaIssuingCourtChange(e.target.value)}
                                    className={`${ecg.field} text-sm`}
                                />
                            </div>
                        )}
                    </div>
                )}

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

                {claimType === 'حجة نفقة اتفاقية' && (
                    <SmartAlimonyCalculator
                        alimonyBeneficiary={alimonyBeneficiary}
                        alimonyLawsuitDate={alimonyLawsuitDate}
                        alimonyExecutionDate={alimonyExecutionDate}
                        alimonyWifeMonthly={alimonyWifeMonthly}
                        alimonyChildrenMonthly={alimonyChildrenMonthly}
                        alimonyChildrenCount={alimonyChildrenCount}
                        calculatedAlimonyNew={calculatedAlimonyNew}
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
                        onPropertyNumberChange={onEvictionPropertyNumberChange}
                        onDistrictChange={onEvictionDistrictChange}
                        onPropertyTypeChange={onEvictionPropertyTypeChange}
                        onFullAddressChange={onEvictionFullAddressChange}
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

                {/* STATE C: COMMERCIAL PAPERS - Due Date */}
                {docType === 'الأوراق التجارية' && (
                    <div className={ecg.subCard}>
                        <label className={`${ecg.labelGold} flex items-center gap-2`}>
                            <Calendar size={16} />
                            تاريخ الاستحقاق (إلزامي)
                        </label>
                        <input
                            type="date"
                            value={dueDate}
                            onChange={(e) => onDueDateChange(e.target.value)}
                            style={{ direction: 'ltr', textAlign: 'right' }}
                            className={ecg.field}
                        />
                        {dueDate && new Date(dueDate) > new Date() && (
                            <p className="text-[#E6C673] text-xs mt-2 flex items-center gap-1">
                                <AlertTriangle size={14} />
                                التاريخ في المستقبل - لن يتم قبول التقديم حتى تاريخ الاستحقاق
                            </p>
                        )}
                    </div>
                )}

                {/* 🔍 EXECUTION TARGET FILTER - Commercial Papers & Debt Acknowledgments */}
                {(docType === 'الأوراق التجارية' || docType === 'السندات المتضمنة إقراراً بدين') && (
                    <div className={ecg.subCard}>
                        <label className={ecg.labelGold}>
                            المنفذ ضده (الطرف المستهدف بالتنفيذ)
                        </label>
                        <select
                            value={executionTarget}
                            onChange={(e) => onExecutionTargetChange(e.target.value as ExecutionTargetOption)}
                            className={ecg.select}
                        >
                            <option value="">-- اختر المنفذ ضده --</option>
                            <option value="المدين الأصلي">المدين الأصلي (الساحب)</option>
                            {docType === 'الأوراق التجارية' && (
                                <>
                                    <option value="المُظَهِّر">المُظَهِّر (ممنوع قانوناً)</option>
                                    <option value="كفيل متضامن">كفيل</option>
                                </>
                            )}
                            {docType === 'السندات المتضمنة إقراراً بدين' && (
                                <>
                                    <option value="كفيل متضامن">كفيل متضامن</option>
                                    <option value="كفيل غير متضامن">كفيل غير متضامن (ممنوع)</option>
                                </>
                            )}
                        </select>

                        {/* Dynamic Warnings */}
                        {docType === 'الأوراق التجارية' && executionTarget === 'كفيل متضامن' && (
                            <div className={ecg.hintWarn}>
                                <p className="text-amber-200 text-xs flex items-center gap-1">
                                    <AlertTriangle size={14} />
                                    مسموح، لكن المنفذ العدل مُلزم بتبليغ المدين الأصلي أولاً للوقوف على اعتراضاته
                                </p>
                            </div>
                        )}

                        {docType === 'السندات المتضمنة إقراراً بدين' && executionTarget === 'كفيل متضامن' && (
                            <div className={ecg.hintSuccess}>
                                <p className="text-emerald-300 text-xs flex items-center gap-1">
                                    <Zap size={14} />
                                    سيتم إمهال المدين الأصلي 7 أيام من تاريخ التبليغ قبل الحجز على الكفيل
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* 🛑 DOCUMENT BLOCKED BANNER */}
                {isDocumentBlocked && (
                    <div className={ecg.calloutDanger}>
                        <h4 className={ecg.calloutDangerTitle}>
                            <AlertTriangle size={20} />
                            🛑 توقف - السند فقد قوته التنفيذية
                        </h4>
                        <p className="text-rose-200/90 text-sm leading-relaxed">
                            استناداً للفقرة رابعاً من المادة 14، فقدَ هذا السند قوته التنفيذية المباشرة. لا تراجع مديرية التنفيذ.
                        </p>
                        <div className={ecg.hintDangerInline}>
                            <p className="text-white text-sm font-bold mb-1">الحل القانوني:</p>
                            <p className="text-slate-300 text-xs">
                                أقم (دعوى إثبات دين) في محكمة البداءة، وبعد اكتساب الحكم الدرجة القطعية قم بتنفيذه.
                            </p>
                        </div>
                    </div>
                )}

                {/* === PHASE 31: SHARIA DEED DYNAMIC INPUTS === */}

                {/* VARIANT A: DEFERRED DOWRY (مهر مؤجل) */}
                {docType === 'الحجج الشرعية' && claimType === 'مهر مؤجل' && (
                    <div className="space-y-3">
                        {/* Amount already shown above in STATE A */}

                        {/* Dowry Reason Radio */}
                        <div className={ecg.subCard}>
                            <label className={ecg.labelGold}>سبب الاستحقاق:</label>
                            <div className={`${ecg.choiceRow} !gap-3`}>
                                <label className={`${ecg.radioRow} ${dowryReason === 'طلاق' ? ecg.radioRowActive : ecg.radioRowIdle} flex-1`}>
                                    <input
                                        type="radio"
                                        name="dowryReason"
                                        value="طلاق"
                                        checked={dowryReason === 'طلاق'}
                                        onChange={(e) => onDowryReasonChange(e.target.value as 'طلاق' | 'وفاة')}
                                        className="accent-[#E6C673]"
                                    />
                                    <span className="text-white text-sm">الطلاق</span>
                                </label>
                                <label className={`${ecg.radioRow} ${dowryReason === 'وفاة' ? ecg.radioRowActive : ecg.radioRowIdle} flex-1`}>
                                    <input
                                        type="radio"
                                        name="dowryReason"
                                        value="وفاة"
                                        checked={dowryReason === 'وفاة'}
                                        onChange={(e) => onDowryReasonChange(e.target.value as 'طلاق' | 'وفاة')}
                                        className="accent-[#E6C673]"
                                    />
                                    <span className="text-white text-sm">الوفاة</span>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* VARIANT C: WILL & TAKHARUJ DEEDS - PHASE 42 */}
                {docType === 'الحجج الشرعية' && (claimType === 'حجة وصية' || claimType === 'حجة تخارج') && (
                    <div className={ecg.subCard}>
                        <label className={ecg.labelGold}>
                            تفاصيل الحجة (مثال: اسم الموصى له، أو تفاصيل حصص التخارج)
                        </label>
                        <textarea
                            value={guardianshipDetails}
                            onChange={(e) => onGuardianshipDetailsChange(e.target.value)}
                            className={ecg.textarea}
                            rows={4}
                            placeholder={claimType === 'حجة وصية'
                                ? "مثال: الموصى له: محمد علي، الحصة الموصى بها: ربع التركة..."
                                : "مثال: تفاصيل حصص الورثة المتخارجين والمبالغ المتفق عليها..."
                            }
                        />
                    </div>
                )}

                {docType === 'تنفيذ الأحكام الأجنبية' && (
                    <ForeignJudgmentSection
                        foreignData={foreignData}
                        onForeignDataChange={onForeignDataChange}
                    />
                )}
            </div>
        </ExecutionCreationSection>
    );
};
