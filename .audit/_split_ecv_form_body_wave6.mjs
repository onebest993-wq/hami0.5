import fs from 'fs';

const path = 'src/app/components/lawyer/ExecutionCreationView.tsx';
const lines = fs.readFileSync(path, 'utf8').split(/\r?\n/);

const ifOpenIdx = lines.findIndex((l) => l.includes('if (!isOpen) return null'));
const reduceIdx = lines.findIndex((l) => l.includes('if (reduceMotion)'));
const shellStart = lines.findIndex((l) => l.includes('const shellContent = ('));
let shellEnd = -1;
for (let i = reduceIdx - 1; i > shellStart; i--) {
  if (lines[i].trim() === ');') {
    shellEnd = i;
    break;
  }
}

const shellInner = lines.slice(shellStart + 1, shellEnd).join('\n');

const formBody = `import React from 'react';
import { X } from '@/app/components/ui/icons/X';
import ExecutionOptionSheet from './ExecutionOptionSheet';
import { ecg } from './executionCreationGlassUi';
import { DirectorateSection } from './DirectorateSection';
import { ExecutionSaveButton } from './ExecutionSaveButton';
import { PartiesSection } from './PartiesSection';
import { InstrumentDetailsSection } from './InstrumentDetailsSection';
import { LawyerFeesToggleCard } from './LawyerFeesToggleCard';
import { ExecutionIntakeModals } from './ExecutionIntakeModals';
import { VisitationCustodyExtrasSection } from './VisitationCustodyExtrasSection';
import {
    claimUsesMonetaryAmountField,
    isDirectorateSectionComplete,
    isShariaLinkedFinancialClaim,
} from '../hooks/executionFormUtils';
import { EXECUTION_DOC_TYPE_OPTIONS } from '../hooks/useExecutionCreationFormOptions';

/** Opaque view-model bag from ExecutionCreationView host (zero visual change peel). */
export type ExecutionCreationFormVm = Record<string, any>;

export function ExecutionCreationFormBody({
    onClose,
    vm,
}: {
    onClose: () => void;
    vm: ExecutionCreationFormVm;
}) {
    const {
        directorate,
        setDirectorate,
        fileNumber,
        setFileNumber,
        docType,
        docNumber,
        setDocNumber,
        currentDocTypeLabel,
        setDocTypeSheetOpen,
        visibleClassificationOptions,
        classification,
        handleClassificationChange,
        claimTypeOptionsList,
        currentClaimTypeLabel,
        setClaimTypeSheetOpen,
        effectiveClaimTypes,
        removeActiveClaimType,
        claimType,
        claimSectionCardClass,
        showMultiClaimAggregatePanel,
        aggregatedClaimTotalDisplay,
        hasActiveClaim,
        chequeNumber,
        setChequeNumber,
        shariaDeedNumber,
        setShariaDeedNumber,
        shariaRegisterNumber,
        setShariaRegisterNumber,
        shariaIssueDate,
        setShariaIssueDate,
        shariaIssuingCourt,
        setShariaIssuingCourt,
        shariaDeedDetails,
        setShariaDeedDetails,
        formatCurrency,
        handleAmountChange,
        totalAmount,
        setTotalAmount,
        claimAmountsByType,
        setClaimAmountsByType,
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
        calculatedAlimonyNew,
        judgmentDate,
        alimonyIncludesPastCalc,
        alimonyPastLawSystem,
        setAlimonyPastLawSystem,
        alimonyPastStartDate,
        setAlimonyPastStartDate,
        pastWifeAlimonyAmount,
        setPastWifeAlimonyAmount,
        dowryReason,
        setDowryReason,
        guardianshipDetails,
        setGuardianshipDetails,
        evictionPropertyNumber,
        setEvictionPropertyNumber,
        evictionDistrict,
        setEvictionDistrict,
        evictionPropertyType,
        setEvictionPropertyType,
        evictionFullAddress,
        setEvictionFullAddress,
        specificDeliveryItems,
        setSpecificDeliveryItems,
        maritalFurnitureItems,
        setMaritalFurnitureItems,
        dueDate,
        setDueDate,
        executionTarget,
        setExecutionTarget,
        isDocumentBlocked,
        foreignData,
        setForeignData,
        showLawyerFeesBetweenSections,
        includeLawyerFees,
        setIncludeLawyerFees,
        lawyerFeesAmount,
        setLawyerFeesAmount,
        showPartiesSection,
        creditors,
        additionalCreditors,
        debtors,
        additionalDebtorsForm,
        allowMultipleDebtors,
        showDebtorSolidarySplit,
        globalClaimTotalForSplit,
        lockedDebtorEntityKind,
        debtorManualDebtClaims,
        debtorLawyerFeesClaims,
        handleDebtorManualDebtChange,
        handleDebtorLawyerFeesChange,
        addCreditor,
        removeAdditionalCreditor,
        updateAdditionalCreditor,
        updateCreditor,
        addIndependentDebtor,
        addSolidaryDebtor,
        addAnotherDebtor,
        removeAdditionalDebtor,
        updateAdditionalDebtor,
        updateDebtor,
        visitationChildrenNames,
        setVisitationChildrenNames,
        visitationScheduleDraft,
        setVisitationScheduleDraft,
        custodyWardNames,
        setCustodyWardNames,
        handleSubmit,
        sectionConfirmDialog,
        docTypeSheetOpen,
        handleDocTypeChange,
        claimTypeSheetOpen,
        shariaExclusiveClaimOptions,
        showShariaLinkedClaimPanel,
        setActiveClaimTypes,
        setLinkedClaimDraft,
        shariaLinkedClaimOptions,
        linkedClaimDraft,
        toggleLinkedClaimDraft,
        saveLinkedClaimDraft,
        showChequeValidatorModal,
        chequeBankName,
        chequeIssueDate,
        setChequeBankName,
        setChequeIssueDate,
        setShowChequeValidatorModal,
        setClaimType,
        showAbsenteeModal,
        absenteeChecks,
        setAbsenteeChecks,
        setShowAbsenteeModal,
        setIsDocumentBlocked,
    } = vm;

    return (
${shellInner}
    );
}
`;

fs.writeFileSync(
  'src/app/components/lawyer/ExecutionCreationView/components/ExecutionCreationFormBody.tsx',
  formBody,
);

// Build new host: keep through ifOpenIdx, then compose FormBody
const head = lines.slice(0, ifOpenIdx).join('\n');

let cleaned = head
  .replace(/import \{ X \} from '@\/app\/components\/ui\/icons\/X';\r?\n/, '')
  .replace(/import ExecutionOptionSheet from '\.\/ExecutionCreationView\/components\/ExecutionOptionSheet';\r?\n/, '')
  .replace(/import \{ DirectorateSection \} from '\.\/ExecutionCreationView\/components\/DirectorateSection';\r?\n/, '')
  .replace(/import \{ ExecutionSaveButton \} from '\.\/ExecutionCreationView\/components\/ExecutionSaveButton';\r?\n/, '')
  .replace(/import \{ PartiesSection \} from '\.\/ExecutionCreationView\/components\/PartiesSection';\r?\n/, '')
  .replace(/import \{ InstrumentDetailsSection \} from '\.\/ExecutionCreationView\/components\/InstrumentDetailsSection';\r?\n/, '')
  .replace(/import \{ LawyerFeesToggleCard \} from '\.\/ExecutionCreationView\/components\/LawyerFeesToggleCard';\r?\n/, '')
  .replace(/import \{ ExecutionIntakeModals \} from '\.\/ExecutionCreationView\/components\/ExecutionIntakeModals';\r?\n/, '')
  .replace(/import \{ VisitationCustodyExtrasSection \} from '\.\/ExecutionCreationView\/components\/VisitationCustodyExtrasSection';\r?\n/, '')
  .replace(
    /import \{\r?\n\s*EXECUTION_DOC_TYPE_OPTIONS,\r?\n\s*useExecutionCreationFormOptions,\r?\n\} from '\.\/ExecutionCreationView\/hooks\/useExecutionCreationFormOptions';/,
    `import {
    useExecutionCreationFormOptions,
} from './ExecutionCreationView/hooks/useExecutionCreationFormOptions';`,
  )
  .replace(
    /import \{\r?\n\s*claimUsesMonetaryAmountField,\r?\n\s*isDirectorateSectionComplete,\r?\n\s*isShariaLinkedFinancialClaim,\r?\n\s*parseMoneyInput,\r?\n\} from '\.\/ExecutionCreationView\/hooks\/executionFormUtils';/,
    `import {
    claimUsesMonetaryAmountField,
    isDirectorateSectionComplete,
    isShariaLinkedFinancialClaim,
    parseMoneyInput,
} from './ExecutionCreationView/hooks/executionFormUtils';
import { ExecutionCreationFormBody } from './ExecutionCreationView/components/ExecutionCreationFormBody';`,
  );

// claimUsesMonetaryAmountField / isShariaLinkedFinancialClaim still needed in vm bag
const tail = `
    if (!isOpen) return null;

    const vm = {
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
        alimonyChildrenCount, setAlimonyChildrenCount, calculatedAlimonyNew, judgmentDate,
        alimonyIncludesPastCalc, alimonyPastLawSystem, setAlimonyPastLawSystem,
        alimonyPastStartDate, setAlimonyPastStartDate, pastWifeAlimonyAmount, setPastWifeAlimonyAmount,
        dowryReason, setDowryReason, guardianshipDetails, setGuardianshipDetails,
        evictionPropertyNumber, setEvictionPropertyNumber, evictionDistrict, setEvictionDistrict,
        evictionPropertyType, setEvictionPropertyType, evictionFullAddress, setEvictionFullAddress,
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
`;

fs.writeFileSync(path, cleaned + tail);
console.log({
  host: (cleaned + tail).split(/\n/).length,
  body: formBody.split(/\n/).length,
});
