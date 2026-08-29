import fs from 'fs';

const path = 'src/app/components/lawyer/ExecutionCreationView.tsx';
const lines = fs.readFileSync(path, 'utf8').split(/\r?\n/);

const componentStart = lines.findIndex((l) =>
  l.includes('export const ExecutionCreationView'),
);
const bodyStart = lines.findIndex(
  (l, i) => i > componentStart && l.includes('const reduceMotion'),
);
const ifOpenIdx = lines.findIndex((l) => l.includes('if (!isOpen) return null'));

console.log({ componentStart, bodyStart, ifOpenIdx });

const hookBody = lines.slice(bodyStart, ifOpenIdx).join('\n');

const hookFile = `import { useCallback, useEffect, useMemo } from 'react';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import {
    formatMoneyIntegerDisplay,
    handleMoneyInputChange,
} from '@/app/utils/moneyInput';
import type { ExecutionArchiveFile } from '@/app/types/common';
import { useExecutionSectionConfirm } from '../../execution/useExecutionSectionConfirm';
import {
    claimUsesMonetaryAmountField,
    isDirectorateSectionComplete,
    isShariaLinkedFinancialClaim,
    parseMoneyInput,
} from './executionFormUtils';
import {
    useExecutionCreationFormOptions,
} from './useExecutionCreationFormOptions';
import { useExecutionCreationFormState } from './useExecutionCreationFormState';
import { useExecutionCreationClaimCascade } from './useExecutionCreationClaimCascade';
import { useExecutionCreationPartyActions } from './useExecutionCreationPartyActions';
import { useExecutionCreationSubmit } from './useExecutionCreationSubmit';
import { useLegalWarnings } from './useLegalWarnings';
import { useAlimonyCalculator } from './useAlimonyCalculator';
import { useStatuteCalculations } from './useStatuteCalculations';
import { useImprisonmentEligibility } from './useImprisonmentEligibility';

export function useExecutionCreationViewModel(args: {
    isOpen: boolean;
    onSave: (fileData: ExecutionArchiveFile) => void;
}) {
    const { isOpen, onSave } = args;
${hookBody}
    return {
        reduceMotion,
        onClose: undefined as unknown as undefined, // filled by view
        directorate,
        setDirectorate,
        fileNumber,
        setFileNumber,
        creditors,
        setCreditors,
        debtors,
        setDebtors,
        debtorManualDebtClaims,
        setDebtorManualDebtClaims,
        debtorLawyerFeesClaims,
        setDebtorLawyerFeesClaims,
        additionalCreditors,
        setAdditionalCreditors,
        additionalDebtorsForm,
        setAdditionalDebtorsForm,
        docType,
        setDocType,
        docNumber,
        setDocNumber,
        judgmentDate,
        setJudgmentDate,
        shariaDeedNumber,
        setShariaDeedNumber,
        shariaRegisterNumber,
        setShariaRegisterNumber,
        shariaIssueDate,
        setShariaIssueDate,
        shariaIssuingCourt,
        setShariaIssuingCourt,
        classification,
        setClassification,
        claimType,
        setClaimType,
        activeClaimTypes,
        setActiveClaimTypes,
        claimAmountsByType,
        setClaimAmountsByType,
        foreignData,
        setForeignData,
        totalAmount,
        setTotalAmount,
        visitationChildrenNames,
        setVisitationChildrenNames,
        visitationScheduleDraft,
        setVisitationScheduleDraft,
        custodyWardNames,
        setCustodyWardNames,
        docTypeSheetOpen,
        setDocTypeSheetOpen,
        claimTypeSheetOpen,
        setClaimTypeSheetOpen,
        linkedClaimDraft,
        setLinkedClaimDraft,
        maritalFurnitureItems,
        setMaritalFurnitureItems,
        evictionPropertyNumber,
        setEvictionPropertyNumber,
        evictionDistrict,
        setEvictionDistrict,
        evictionPropertyType,
        setEvictionPropertyType,
        evictionFullAddress,
        setEvictionFullAddress,
        evictionPremisesUse,
        specificDeliveryItems,
        setSpecificDeliveryItems,
        dueDate,
        setDueDate,
        executionTarget,
        setExecutionTarget,
        showChequeValidatorModal,
        setShowChequeValidatorModal,
        chequeBankName,
        setChequeBankName,
        chequeIssueDate,
        setChequeIssueDate,
        chequeNumber,
        setChequeNumber,
        showAbsenteeModal,
        setShowAbsenteeModal,
        absenteeChecks,
        setAbsenteeChecks,
        isDocumentBlocked,
        setIsDocumentBlocked,
        dowryReason,
        setDowryReason,
        guardianshipDetails,
        setGuardianshipDetails,
        shariaDeedDetails,
        setShariaDeedDetails,
        includeLawyerFees,
        setIncludeLawyerFees,
        lawyerFeesAmount,
        setLawyerFeesAmount,
        clientFeesAmount,
        alimonyBeneficiary,
        setAlimonyBeneficiary,
        alimonyLawsuitDate,
        setAlimonyLawsuitDate,
        alimonyExecutionDate,
        setAlimonyExecutionDate,
        alimonyWifeMonthly,
        setAlimonyWifeMonthly,
        alimonyChildrenMonthly,
        setAlimonyChildrenMonthly,
        alimonyChildrenCount,
        setAlimonyChildrenCount,
        alimonyPastLawSystem,
        setAlimonyPastLawSystem,
        alimonyPastStartDate,
        setAlimonyPastStartDate,
        pastWifeAlimonyAmount,
        setPastWifeAlimonyAmount,
        claimAmount,
        lastProcedureDate,
        notificationDate,
        alimonyIncludesPastCalc,
        calculatedAlimonyNew,
        resolveGlobalClaimTotalNumber,
        allDebtorsCombined,
        globalClaimTotalForSplit,
        formatCurrency,
        handleAmountChange,
        classificationOptionsList,
        claimTypeOptionsList,
        currentDocTypeLabel,
        currentClaimTypeLabel,
        visibleClassificationOptions,
        effectiveClaimTypes,
        showPartiesSection,
        allowMultipleDebtors,
        showDebtorSolidarySplit,
        showLawyerFeesBetweenSections,
        hasActiveClaim,
        showMultiClaimAggregatePanel,
        claimSectionCardClass,
        showShariaLinkedClaimPanel,
        shariaLinkedClaimOptions,
        shariaExclusiveClaimOptions,
        toggleLinkedClaimDraft,
        saveLinkedClaimDraft,
        removeActiveClaimType,
        handleDocTypeChange,
        handleClassificationChange,
        aggregatedClaimTotalDisplay,
        addCreditor,
        removeAdditionalCreditor,
        updateAdditionalCreditor,
        updateCreditor,
        lockedDebtorEntityKind,
        addIndependentDebtor,
        addSolidaryDebtor,
        addAnotherDebtor,
        removeAdditionalDebtor,
        updateAdditionalDebtor,
        updateDebtor,
        handleDebtorManualDebtChange,
        handleDebtorLawyerFeesChange,
        handleSubmit,
        sectionConfirmDialog,
        claimUsesMonetaryAmountField,
        isDirectorateSectionComplete,
        isShariaLinkedFinancialClaim,
    };
}
`;

fs.writeFileSync(
  'src/app/components/lawyer/ExecutionCreationView/hooks/useExecutionCreationViewModel.ts',
  hookFile,
);
console.log('hook lines', hookFile.split(/\n/).length);
