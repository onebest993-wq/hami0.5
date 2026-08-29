import React from 'react';
import { ExecutionCreationSection } from './ExecutionCreationSection';
import { InstrumentTypeIdentityFields } from './InstrumentTypeIdentityFields';
import { InstrumentClaimAmountsBlock } from './InstrumentClaimAmountsBlock';
import { InstrumentClaimExtrasSection } from './InstrumentClaimExtrasSection';
import { InstrumentCommercialMetaSection } from './InstrumentCommercialMetaSection';
import { InstrumentShariaForeignExtras } from './InstrumentShariaForeignExtras';
import type { SpecificDeliveryItem } from '@/app/utils/specificDeliveryItemsUtils';
import type { MaritalFurnitureItem } from '@/app/types/maritalFurniture';
import type { AlimonyCalculationResult } from '../hooks/useAlimonyCalculator';
import type { ExecutionTargetOption } from '../types';
import type { ForeignJudgmentData } from './ForeignJudgmentSection';

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
    onJudgmentDateChange?: (v: string) => void;
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
    evictionPremisesUse: 'commercial' | 'residential';
    onEvictionPremisesUseChange: (v: 'commercial' | 'residential') => void;

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
 * Wave 4: التركيب فقط؛ الحقول في subsections تحت components/.
 */
export const InstrumentDetailsSection: React.FC<InstrumentDetailsSectionProps> = (props) => {
    const {
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
        onJudgmentDateChange,
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
        evictionPremisesUse,
        onEvictionPremisesUseChange,
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
    } = props;

    return (
        <ExecutionCreationSection title="السند المنفذ">
            <div className="flex flex-col gap-3">
                <InstrumentTypeIdentityFields
                    docType={docType}
                    docNumber={docNumber}
                    onDocNumberChange={onDocNumberChange}
                    currentDocTypeLabel={currentDocTypeLabel}
                    onOpenDocTypeSheet={onOpenDocTypeSheet}
                    visibleClassificationOptions={visibleClassificationOptions}
                    classification={classification}
                    onClassificationChange={onClassificationChange}
                    claimTypeOptionsList={claimTypeOptionsList}
                    currentClaimTypeLabel={currentClaimTypeLabel}
                    onOpenClaimTypeSheet={onOpenClaimTypeSheet}
                    effectiveClaimTypes={effectiveClaimTypes}
                    onRemoveActiveClaimType={onRemoveActiveClaimType}
                    claimType={claimType}
                    chequeNumber={chequeNumber}
                    onChequeNumberChange={onChequeNumberChange}
                    shariaDeedNumber={shariaDeedNumber}
                    onShariaDeedNumberChange={onShariaDeedNumberChange}
                    shariaRegisterNumber={shariaRegisterNumber}
                    onShariaRegisterNumberChange={onShariaRegisterNumberChange}
                    shariaIssueDate={shariaIssueDate}
                    onShariaIssueDateChange={onShariaIssueDateChange}
                    shariaIssuingCourt={shariaIssuingCourt}
                    onShariaIssuingCourtChange={onShariaIssuingCourtChange}
                    judgmentDate={judgmentDate}
                    onJudgmentDateChange={onJudgmentDateChange}
                />

                <InstrumentClaimAmountsBlock
                    claimTypeOptionsList={claimTypeOptionsList}
                    effectiveClaimTypes={effectiveClaimTypes}
                    claimType={claimType}
                    claimSectionCardClass={claimSectionCardClass}
                    showMultiClaimAggregatePanel={showMultiClaimAggregatePanel}
                    aggregatedClaimTotalDisplay={aggregatedClaimTotalDisplay}
                    docType={docType}
                    formatCurrency={formatCurrency}
                    handleAmountChange={handleAmountChange}
                    totalAmount={totalAmount}
                    onTotalAmountChange={onTotalAmountChange}
                    claimAmountsByType={claimAmountsByType}
                    onClaimAmountsByTypeChange={onClaimAmountsByTypeChange}
                    alimonyBeneficiary={alimonyBeneficiary}
                    onAlimonyBeneficiaryChange={onAlimonyBeneficiaryChange}
                    alimonyLawsuitDate={alimonyLawsuitDate}
                    onAlimonyLawsuitDateChange={onAlimonyLawsuitDateChange}
                    alimonyExecutionDate={alimonyExecutionDate}
                    onAlimonyExecutionDateChange={onAlimonyExecutionDateChange}
                    alimonyWifeMonthly={alimonyWifeMonthly}
                    onAlimonyWifeMonthlyChange={onAlimonyWifeMonthlyChange}
                    alimonyChildrenMonthly={alimonyChildrenMonthly}
                    onAlimonyChildrenMonthlyChange={onAlimonyChildrenMonthlyChange}
                    alimonyChildrenCount={alimonyChildrenCount}
                    onAlimonyChildrenCountChange={onAlimonyChildrenCountChange}
                    calculatedAlimonyNew={calculatedAlimonyNew}
                    judgmentDate={judgmentDate}
                    alimonyIncludesPastCalc={alimonyIncludesPastCalc}
                    alimonyPastLawSystem={alimonyPastLawSystem}
                    onAlimonyPastLawSystemChange={onAlimonyPastLawSystemChange}
                    alimonyPastStartDate={alimonyPastStartDate}
                    onAlimonyPastStartDateChange={onAlimonyPastStartDateChange}
                    pastWifeAlimonyAmount={pastWifeAlimonyAmount}
                    onPastWifeAlimonyAmountChange={onPastWifeAlimonyAmountChange}
                    claimUsesMonetaryAmountField={claimUsesMonetaryAmountField}
                    isShariaLinkedFinancialClaim={isShariaLinkedFinancialClaim}
                />

                <InstrumentClaimExtrasSection
                    docType={docType}
                    claimType={claimType}
                    effectiveClaimTypes={effectiveClaimTypes}
                    hasActiveClaim={hasActiveClaim}
                    alimonyBeneficiary={alimonyBeneficiary}
                    onAlimonyBeneficiaryChange={onAlimonyBeneficiaryChange}
                    alimonyLawsuitDate={alimonyLawsuitDate}
                    onAlimonyLawsuitDateChange={onAlimonyLawsuitDateChange}
                    alimonyExecutionDate={alimonyExecutionDate}
                    onAlimonyExecutionDateChange={onAlimonyExecutionDateChange}
                    alimonyWifeMonthly={alimonyWifeMonthly}
                    onAlimonyWifeMonthlyChange={onAlimonyWifeMonthlyChange}
                    alimonyChildrenMonthly={alimonyChildrenMonthly}
                    onAlimonyChildrenMonthlyChange={onAlimonyChildrenMonthlyChange}
                    alimonyChildrenCount={alimonyChildrenCount}
                    onAlimonyChildrenCountChange={onAlimonyChildrenCountChange}
                    calculatedAlimonyNew={calculatedAlimonyNew}
                    judgmentDate={judgmentDate}
                    alimonyIncludesPastCalc={alimonyIncludesPastCalc}
                    alimonyPastStartDate={alimonyPastStartDate}
                    dowryReason={dowryReason}
                    onDowryReasonChange={onDowryReasonChange}
                    shariaDeedDetails={shariaDeedDetails}
                    onShariaDeedDetailsChange={onShariaDeedDetailsChange}
                    evictionPropertyNumber={evictionPropertyNumber}
                    onEvictionPropertyNumberChange={onEvictionPropertyNumberChange}
                    evictionDistrict={evictionDistrict}
                    onEvictionDistrictChange={onEvictionDistrictChange}
                    evictionPropertyType={evictionPropertyType}
                    onEvictionPropertyTypeChange={onEvictionPropertyTypeChange}
                    evictionFullAddress={evictionFullAddress}
                    onEvictionFullAddressChange={onEvictionFullAddressChange}
                    evictionPremisesUse={evictionPremisesUse}
                    onEvictionPremisesUseChange={onEvictionPremisesUseChange}
                    specificDeliveryItems={specificDeliveryItems}
                    onSpecificDeliveryItemsChange={onSpecificDeliveryItemsChange}
                    maritalFurnitureItems={maritalFurnitureItems}
                    onMaritalFurnitureItemsChange={onMaritalFurnitureItemsChange}
                    formatCurrency={formatCurrency}
                />

                <InstrumentCommercialMetaSection
                    docType={docType}
                    dueDate={dueDate}
                    onDueDateChange={onDueDateChange}
                    executionTarget={executionTarget}
                    onExecutionTargetChange={onExecutionTargetChange}
                    isDocumentBlocked={isDocumentBlocked}
                />

                <InstrumentShariaForeignExtras
                    docType={docType}
                    claimType={claimType}
                    dowryReason={dowryReason}
                    onDowryReasonChange={onDowryReasonChange}
                    guardianshipDetails={guardianshipDetails}
                    onGuardianshipDetailsChange={onGuardianshipDetailsChange}
                    foreignData={foreignData}
                    onForeignDataChange={onForeignDataChange}
                />
            </div>
        </ExecutionCreationSection>
    );
};
