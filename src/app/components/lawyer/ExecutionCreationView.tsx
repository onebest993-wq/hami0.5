import React, { useCallback, useEffect, useMemo } from 'react';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { motion } from '@/app/motion/overlayMotionRuntime';
import {
    formatMoneyIntegerDisplay,
    handleMoneyInputChange,
} from '@/app/utils/moneyInput';
import type { ExecutionArchiveFile, ModalProps } from '@/app/types/common';
import { ecg } from './ExecutionCreationView/components/executionCreationGlassUi';
import { useExecutionSectionConfirm } from './execution/useExecutionSectionConfirm';
import {
    claimUsesMonetaryAmountField,
    isDirectorateSectionComplete,
    isShariaLinkedFinancialClaim,
    parseMoneyInput,
} from './ExecutionCreationView/hooks/executionFormUtils';
import { ExecutionCreationFormBody } from './ExecutionCreationView/components/ExecutionCreationFormBody';
import type { ExecutionCreationFormVm } from './ExecutionCreationView/components/executionCreationFormVm';
import {
    useExecutionCreationFormOptions,
} from './ExecutionCreationView/hooks/useExecutionCreationFormOptions';
import { useExecutionCreationFormState } from './ExecutionCreationView/hooks/useExecutionCreationFormState';
import { useExecutionCreationClaimCascade } from './ExecutionCreationView/hooks/useExecutionCreationClaimCascade';
import { useExecutionCreationPartyActions } from './ExecutionCreationView/hooks/useExecutionCreationPartyActions';
import { useExecutionCreationSubmit } from './ExecutionCreationView/hooks/useExecutionCreationSubmit';
import { useLegalWarnings } from './ExecutionCreationView/hooks/useLegalWarnings';
import { useAlimonyCalculator } from './ExecutionCreationView/hooks/useAlimonyCalculator';
import { useStatuteCalculations } from './ExecutionCreationView/hooks/useStatuteCalculations';

interface ExecutionCreationViewProps extends ModalProps {
    onSave: (fileData: ExecutionArchiveFile) => void;
}

export const ExecutionCreationView: React.FC<ExecutionCreationViewProps> = ({ isOpen, onClose, onSave }) => {
    const reduceMotion = useReduceMotion();
    const { confirm: confirmInSection, dialog: sectionConfirmDialog } = useExecutionSectionConfirm();

    const {
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
        setEvictionPremisesUse,
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
    } = useExecutionCreationFormState(isOpen);

    const alimonyCalcClaimType =
        activeClaimTypes.includes('نفقة') || claimType === 'نفقة' || activeClaimTypes.includes('نفقة ماضية')
            ? 'نفقة'
            : claimType;

    const alimonyIncludesPastCalc = activeClaimTypes.includes('نفقة ماضية');

    const { calculatedAlimonyNew } = useAlimonyCalculator(
        alimonyCalcClaimType,
        alimonyLawsuitDate,
        alimonyExecutionDate,
        alimonyWifeMonthly,
        alimonyChildrenMonthly,
        alimonyChildrenCount,
        alimonyIncludesPastCalc,
        alimonyPastLawSystem,
        alimonyPastStartDate,
        pastWifeAlimonyAmount,
    );

    const resolveGlobalClaimTotalNumber = useCallback((): number => {
        const types = activeClaimTypes.length > 0 ? activeClaimTypes : claimType ? [claimType] : [];
        let sum = 0;
        for (const ct of types) {
            if (ct === 'نفقة' || ct === 'حجة نفقة اتفاقية') {
                sum += Math.round(calculatedAlimonyNew?.baseAccumulation ?? 0);
                continue;
            }
            if (ct === 'نفقة ماضية') {
                sum +=
                    Math.round(calculatedAlimonyNew?.pastAccumulation ?? 0) ||
                    parseMoneyInput(claimAmountsByType[ct] ?? '');
                continue;
            }
            if (ct === 'أثاث زوجية') {
                continue;
            }
            if (claimUsesMonetaryAmountField(ct)) {
                sum += parseMoneyInput(claimAmountsByType[ct] ?? totalAmount) || parseMoneyInput(claimAmount);
            }
        }
        return sum;
    }, [
        claimType,
        claimAmount,
        claimAmountsByType,
        calculatedAlimonyNew,
        activeClaimTypes,
        totalAmount,
    ]);

    const globalClaimTotalForSplit = useMemo(() => {
        const resolved = resolveGlobalClaimTotalNumber();
        if (resolved > 0) return resolved;
        return parseMoneyInput(totalAmount) || parseMoneyInput(claimAmount);
    }, [resolveGlobalClaimTotalNumber, totalAmount, claimAmount]);

    const formatCurrency = formatMoneyIntegerDisplay;

    const handleAmountChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
        handleMoneyInputChange(e.target.value, setter);
        },
        [],
    );

    const {
        classificationOptionsList,
        claimTypeOptionsList,
        currentDocTypeLabel,
        currentClaimTypeLabel,
    } = useExecutionCreationFormOptions(docType, classification, claimType, activeClaimTypes);

    const {
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
    } = useExecutionCreationClaimCascade({
            directorate,
            fileNumber,
            docType,
        setDocType,
            classification,
        setClassification,
            claimType,
        setClaimType,
        activeClaimTypes,
        setActiveClaimTypes,
        claimAmountsByType,
        setClaimAmountsByType,
        debtors,
        setDebtors,
        additionalDebtorsForm,
        setAdditionalDebtorsForm,
        classificationOptionsList,
        claimTypeOptionsList,
        claimTypeSheetOpen,
        setClaimTypeSheetOpen,
        linkedClaimDraft,
        setLinkedClaimDraft,
        setVisitationChildrenNames,
        setVisitationScheduleDraft,
        setCustodyWardNames,
        calculatedAlimonyNew,
        alimonyLawsuitDate,
        alimonyPastStartDate,
        setShowChequeValidatorModal,
        setShowAbsenteeModal,
        setSpecificDeliveryItems,
    });

    const aggregatedClaimTotalDisplay = resolveGlobalClaimTotalNumber();

    const { currentLegalInfo } = useLegalWarnings(claimType);

    const { calculateStatuteOfLimitations, calculateNotificationPeriod } = useStatuteCalculations(
        lastProcedureDate,
        claimType,
        notificationDate,
    );

    const {
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
    } = useExecutionCreationPartyActions({
        creditors,
        setCreditors,
        additionalCreditors,
        setAdditionalCreditors,
                    debtors,
        setDebtors,
                    additionalDebtorsForm,
        setAdditionalDebtorsForm,
        allowMultipleDebtors,
            debtorManualDebtClaims,
        setDebtorManualDebtClaims,
        debtorLawyerFeesClaims,
        setDebtorLawyerFeesClaims,
            globalClaimTotalForSplit,
        lawyerFeesAmount,
    });

    useEffect(() => {
        if (isDirectorateSectionComplete(directorate, fileNumber) && !docType) {
                setDocType('قرارات وأحكام المحاكم');
        }
    }, [directorate, fileNumber, docType, setDocType]);

    const { handleSubmit } = useExecutionCreationSubmit({
        directorate,
        fileNumber,
        creditors,
        debtors,
        additionalCreditors,
        additionalDebtorsForm,
        debtorManualDebtClaims,
        debtorLawyerFeesClaims,
        allowMultipleDebtors,
        docType,
        docNumber,
        judgmentDate,
        classification,
        claimType,
        activeClaimTypes,
        claimAmountsByType,
        totalAmount,
        claimAmount,
        foreignData,
        visitationChildrenNames,
        visitationScheduleDraft,
        custodyWardNames,
        maritalFurnitureItems,
        evictionPropertyNumber,
        evictionDistrict,
        evictionPropertyType,
        evictionFullAddress,
        evictionPremisesUse,
        specificDeliveryItems,
        dueDate,
        executionTarget,
        chequeBankName,
        chequeIssueDate,
        chequeNumber,
        isDocumentBlocked,
        dowryReason,
        guardianshipDetails,
        shariaDeedNumber,
        shariaRegisterNumber,
        shariaIssueDate,
        shariaIssuingCourt,
        shariaDeedDetails,
        includeLawyerFees,
        lawyerFeesAmount,
        clientFeesAmount,
        alimonyBeneficiary,
        alimonyLawsuitDate,
        alimonyExecutionDate,
        alimonyWifeMonthly,
        alimonyChildrenMonthly,
        alimonyChildrenCount,
        alimonyIncludesPastCalc,
        alimonyPastLawSystem,
        alimonyPastStartDate,
        pastWifeAlimonyAmount,
        calculatedAlimonyNew,
        resolveGlobalClaimTotalNumber,
        confirmInSection,
        onSave,
        intakeLegalSnapshot: {
            warnings: currentLegalInfo.warnings,
            requiredAttachments: currentLegalInfo.requiredAttachments,
            legalTips: currentLegalInfo.legalTips,
            statuteMessage: calculateStatuteOfLimitations?.message ?? null,
            notificationPeriodMessage: calculateNotificationPeriod?.message ?? null,
        },
    });

    if (!isOpen) return null;

    const vm: ExecutionCreationFormVm = {
        directorate, setDirectorate, fileNumber, setFileNumber,
        docType, docNumber, setDocNumber, currentDocTypeLabel, setDocTypeSheetOpen,
        visibleClassificationOptions, classification, handleClassificationChange,
        claimTypeOptionsList, currentClaimTypeLabel, setClaimTypeSheetOpen,
        effectiveClaimTypes, removeActiveClaimType, claimType, claimSectionCardClass,
        showMultiClaimAggregatePanel, aggregatedClaimTotalDisplay, hasActiveClaim,
        chequeNumber, setChequeNumber, shariaDeedNumber, setShariaDeedNumber,
        shariaRegisterNumber, setShariaRegisterNumber, shariaIssueDate, setShariaIssueDate,
        shariaIssuingCourt, setShariaIssuingCourt, shariaDeedDetails, setShariaDeedDetails,
        formatCurrency, handleAmountChange, totalAmount, setTotalAmount,
        claimAmountsByType, setClaimAmountsByType, alimonyBeneficiary, setAlimonyBeneficiary,
        alimonyLawsuitDate, setAlimonyLawsuitDate, alimonyExecutionDate, setAlimonyExecutionDate,
        alimonyWifeMonthly, setAlimonyWifeMonthly, alimonyChildrenMonthly, setAlimonyChildrenMonthly,
        alimonyChildrenCount, setAlimonyChildrenCount, calculatedAlimonyNew, judgmentDate, setJudgmentDate,
        alimonyIncludesPastCalc, alimonyPastLawSystem, setAlimonyPastLawSystem,
        alimonyPastStartDate, setAlimonyPastStartDate, pastWifeAlimonyAmount, setPastWifeAlimonyAmount,
        dowryReason, setDowryReason, guardianshipDetails, setGuardianshipDetails,
        evictionPropertyNumber, setEvictionPropertyNumber, evictionDistrict, setEvictionDistrict,
        evictionPropertyType, setEvictionPropertyType, evictionFullAddress, setEvictionFullAddress,
        evictionPremisesUse, setEvictionPremisesUse,
        specificDeliveryItems, setSpecificDeliveryItems, maritalFurnitureItems, setMaritalFurnitureItems,
        dueDate, setDueDate, executionTarget, setExecutionTarget, isDocumentBlocked,
        foreignData, setForeignData, showLawyerFeesBetweenSections, includeLawyerFees,
        setIncludeLawyerFees, lawyerFeesAmount, setLawyerFeesAmount, showPartiesSection,
        creditors, additionalCreditors, debtors, additionalDebtorsForm, allowMultipleDebtors,
        showDebtorSolidarySplit, globalClaimTotalForSplit, lockedDebtorEntityKind,
        debtorManualDebtClaims, debtorLawyerFeesClaims, handleDebtorManualDebtChange,
        handleDebtorLawyerFeesChange, addCreditor, removeAdditionalCreditor, updateAdditionalCreditor,
        updateCreditor, addIndependentDebtor, addSolidaryDebtor, addAnotherDebtor,
        removeAdditionalDebtor, updateAdditionalDebtor, updateDebtor, visitationChildrenNames,
        setVisitationChildrenNames, visitationScheduleDraft, setVisitationScheduleDraft,
        custodyWardNames, setCustodyWardNames, handleSubmit, sectionConfirmDialog,
        docTypeSheetOpen, handleDocTypeChange, claimTypeSheetOpen, shariaExclusiveClaimOptions,
        showShariaLinkedClaimPanel, setActiveClaimTypes, setLinkedClaimDraft,
        shariaLinkedClaimOptions, linkedClaimDraft, toggleLinkedClaimDraft, saveLinkedClaimDraft,
        showChequeValidatorModal, chequeBankName, chequeIssueDate, setChequeBankName,
        setChequeIssueDate, setShowChequeValidatorModal, setClaimType, showAbsenteeModal,
        absenteeChecks, setAbsenteeChecks, setShowAbsenteeModal, setIsDocumentBlocked,
        claimUsesMonetaryAmountField, isShariaLinkedFinancialClaim,
    };

    const shell = <ExecutionCreationFormBody onClose={onClose} vm={vm} />;

    if (reduceMotion) {
        return (
            <div dir="rtl" className={ecg.modalShell}>
                {shell}
            </div>
        );
    }

    return (
        <motion.div initial={false} animate={{ opacity: 1 }} dir="rtl" className={ecg.modalShell}>
            {shell}
        </motion.div>
    );
};
