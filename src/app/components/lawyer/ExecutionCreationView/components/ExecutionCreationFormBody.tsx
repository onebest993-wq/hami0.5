import React, { useEffect } from 'react';
import { X } from '@/app/components/ui/icons/X';
import ExecutionOptionSheet from './ExecutionOptionSheet';
import { ecg } from './executionCreationGlassUi';
import { DirectorateSection } from './DirectorateSection';
import { ExecutionSaveButton } from './ExecutionSaveButton';
import { LawyerFeesToggleCard } from './LawyerFeesToggleCard';
import { ExecutionIntakeModals } from './ExecutionIntakeModals';
import { VisitationCustodyExtrasSection } from './VisitationCustodyExtrasSection';
import {
    LazyInstrumentDetailsSection,
    prefetchInstrumentDetailsSection,
} from './instrumentDetailsSectionLazy';
import { LazyPartiesSection, prefetchPartiesSection } from './partiesSectionLazy';
import { PreloadableOverlayGate } from '@/app/components/lawyer/ExecutionDashboard/preloadableOverlayGate';
import {
    claimHasFinancialAmountSection,
} from '../hooks/executionFormUtils';
import {
    DEFAULT_COURT_JUDGMENT_DOC_TYPE,
    EXECUTION_DOC_TYPE_OPTIONS,
} from '../hooks/useExecutionCreationFormOptions';
import { useExecutionCreationSequentialReveal } from '../hooks/useExecutionCreationSequentialReveal';
import type { ExecutionCreationFormVm } from './executionCreationFormVm';

export type { ExecutionCreationFormVm } from './executionCreationFormVm';

const CREATION_INNER_SILENT_FALLBACK = (
    <div
        className="space-y-2"
        aria-hidden
        data-testid="execution-creation-inner-paint-slot"
    >
        <div className="min-h-[44px] rounded-xl border border-white/[0.06] bg-transparent" />
        <div className="min-h-[44px] rounded-xl border border-white/[0.06] bg-transparent" />
        <div className="min-h-[44px] rounded-xl border border-white/[0.06] bg-transparent" />
    </div>
);

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
        setJudgmentDate,
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
        evictionPremisesUse,
        setEvictionPremisesUse,
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
        showLawyerFeesToggle,
        includeLawyerFees,
        setIncludeLawyerFees,
        lawyerFeesAmount,
        setLawyerFeesAmount,
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
        claimUsesMonetaryAmountField,
        isShariaLinkedFinancialClaim,
    } = vm;

    const hasAmountStep =
        effectiveClaimTypes.some((ct) => claimHasFinancialAmountSection(ct)) ||
        Boolean(claimType && claimUsesMonetaryAmountField(claimType));
    const { isRevealed, commitStep } = useExecutionCreationSequentialReveal({
        docType,
        hasAmountStep,
        showLawyerFees: showLawyerFeesToggle,
    });

    useEffect(() => {
        if (!isRevealed('fileNumber')) return;
        prefetchInstrumentDetailsSection();
        prefetchPartiesSection();
    }, [isRevealed]);

    useEffect(() => {
        if (!hasAmountStep || !isRevealed('claimAmounts')) return;
        const hasDigits = (raw: string) => /\d/.test(String(raw || ''));
        const filled =
            hasDigits(totalAmount) ||
            Object.values(claimAmountsByType || {}).some((value) => hasDigits(String(value || '')));
        if (filled) commitStep('claimAmounts', { focusNext: false });
    }, [claimAmountsByType, commitStep, hasAmountStep, isRevealed, totalAmount]);

    /** مطالبات بلا مبلغ: أظهر الحقول المخصّصة وافتح طريق الأطراف دون انتظار إدخال مبلغ */
    useEffect(() => {
        if (hasAmountStep) return;
        if (!isRevealed('claimAmounts')) return;
        if (!claimType && effectiveClaimTypes.length === 0) return;
        commitStep('claimAmounts', { focusNext: false });
    }, [claimType, commitStep, effectiveClaimTypes.length, hasAmountStep, isRevealed]);

    useEffect(() => {
        if (!isRevealed('docType')) return;
        if (docType !== DEFAULT_COURT_JUDGMENT_DOC_TYPE) return;
        commitStep('docType', { focusNext: true });
    }, [commitStep, docType, isRevealed]);

    useEffect(() => {
        if (docType !== 'الأوراق التجارية' || !claimType) return;
        if (!isRevealed('claimType')) return;
        commitStep('claimType', { focusNext: false });
    }, [claimType, commitStep, docType, isRevealed]);

    const showLawyerFeesCard =
        showLawyerFeesToggle &&
        (hasAmountStep ? isRevealed('claimAmounts') : isRevealed('claimType'));

    return (
        <>
                <div className={ecg.modalHeader}>
                    <div className="flex min-w-0 items-center gap-2">
                    <h1 className={ecg.modalHeaderTitle} data-testid="execution-creation-title">فتح إضبارة تنفيذ</h1>
                    </div>
                    <button type="button" onClick={onClose} className={ecg.modalClose} aria-label="إغلاق" data-testid="execution-creation-close">
                        <X size={18} />
                        <span className="text-xs font-medium">إغلاق</span>
                    </button>
                </div>

                <div className={ecg.modalBody}>
                    <div className={ecg.modalBodyStack}>
                        <DirectorateSection
                            directorate={directorate}
                            fileNumber={fileNumber}
                            showFileNumber={isRevealed('fileNumber')}
                            onDirectorateChange={setDirectorate}
                            onFileNumberChange={setFileNumber}
                            onCommitDirectorate={() => commitStep('directorate')}
                            onCommitFileNumber={() => commitStep('fileNumber')}
                        />

                        {isRevealed('docType') ? (
                        <PreloadableOverlayGate
                            lazy={LazyInstrumentDetailsSection}
                            fallback={CREATION_INNER_SILENT_FALLBACK}
                            lazyProps={{
                                                docType,
                            docNumber,
                            onDocNumberChange: setDocNumber,
                            currentDocTypeLabel,
                            onOpenDocTypeSheet: () => setDocTypeSheetOpen(true),
                            visibleClassificationOptions,
                            classification,
                            onClassificationChange: handleClassificationChange,
                            claimTypeOptionsList,
                            currentClaimTypeLabel,
                            onOpenClaimTypeSheet: () => setClaimTypeSheetOpen(true),
                            effectiveClaimTypes,
                            onRemoveActiveClaimType: removeActiveClaimType,
                                                claimType,
                            claimSectionCardClass,
                            showMultiClaimAggregatePanel,
                            aggregatedClaimTotalDisplay,
                            hasActiveClaim,
                            chequeNumber,
                            onChequeNumberChange: setChequeNumber,
                            shariaDeedNumber,
                            onShariaDeedNumberChange: setShariaDeedNumber,
                            shariaRegisterNumber,
                            onShariaRegisterNumberChange: setShariaRegisterNumber,
                            shariaIssueDate,
                            onShariaIssueDateChange: setShariaIssueDate,
                            shariaIssuingCourt,
                            onShariaIssuingCourtChange: setShariaIssuingCourt,
                            shariaDeedDetails,
                            onShariaDeedDetailsChange: setShariaDeedDetails,
                            formatCurrency,
                            handleAmountChange,
                            totalAmount,
                            onTotalAmountChange: setTotalAmount,
                            claimAmountsByType,
                            onClaimAmountsByTypeChange: setClaimAmountsByType,
                                        alimonyBeneficiary,
                            onAlimonyBeneficiaryChange: setAlimonyBeneficiary,
                                        alimonyLawsuitDate,
                            onAlimonyLawsuitDateChange: setAlimonyLawsuitDate,
                                        alimonyExecutionDate,
                            onAlimonyExecutionDateChange: setAlimonyExecutionDate,
                                        alimonyWifeMonthly,
                            onAlimonyWifeMonthlyChange: setAlimonyWifeMonthly,
                                        alimonyChildrenMonthly,
                            onAlimonyChildrenMonthlyChange: setAlimonyChildrenMonthly,
                                        alimonyChildrenCount,
                            onAlimonyChildrenCountChange: setAlimonyChildrenCount,
                                        calculatedAlimonyNew,
                                        judgmentDate,
                            onJudgmentDateChange: setJudgmentDate,
                            alimonyIncludesPastCalc,
                            alimonyPastLawSystem,
                            onAlimonyPastLawSystemChange: setAlimonyPastLawSystem,
                                        alimonyPastStartDate,
                            onAlimonyPastStartDateChange: setAlimonyPastStartDate,
                            pastWifeAlimonyAmount,
                            onPastWifeAlimonyAmountChange: setPastWifeAlimonyAmount,
                            dowryReason,
                            onDowryReasonChange: setDowryReason,
                            guardianshipDetails,
                            onGuardianshipDetailsChange: setGuardianshipDetails,
                                        evictionPropertyNumber,
                            onEvictionPropertyNumberChange: setEvictionPropertyNumber,
                                        evictionDistrict,
                            onEvictionDistrictChange: setEvictionDistrict,
                                        evictionPropertyType,
                            onEvictionPropertyTypeChange: setEvictionPropertyType,
                                        evictionFullAddress,
                            onEvictionFullAddressChange: setEvictionFullAddress,
                            evictionPremisesUse,
                            onEvictionPremisesUseChange: setEvictionPremisesUse,
                            specificDeliveryItems,
                            onSpecificDeliveryItemsChange: setSpecificDeliveryItems,
                            maritalFurnitureItems,
                            onMaritalFurnitureItemsChange: setMaritalFurnitureItems,
                            dueDate,
                            onDueDateChange: setDueDate,
                            executionTarget,
                            onExecutionTargetChange: setExecutionTarget,
                            isDocumentBlocked,
                            foreignData,
                            onForeignDataChange: setForeignData,
                            claimUsesMonetaryAmountField,
                            isShariaLinkedFinancialClaim,
                            revealDocNumber: isRevealed('docNumber'),
                            revealJudgmentDate: isRevealed('judgmentDate'),
                            revealClassification: isRevealed('classification'),
                            revealClaimType: isRevealed('claimType'),
                            revealShariaIdentity: isRevealed('shariaIdentity'),
                            revealClaimAmounts: isRevealed('claimAmounts'),
                            onCommitDocNumber: () => commitStep('docNumber'),
                            onCommitJudgmentDate: () =>
                                commitStep('judgmentDate', { focusNext: false }),
                            onCommitClassification: () => commitStep('classification'),
                            onCommitShariaIdentity: () => commitStep('shariaIdentity'),
                            onCommitClaimAmounts: () => commitStep('claimAmounts'),
                            onCommitClaimAmountsStay: () =>
                                commitStep('claimAmounts', { focusNext: false }),
                            }}
                        />
                    ) : null}

                    {showLawyerFeesCard ? (
                        <LawyerFeesToggleCard
                            includeLawyerFees={includeLawyerFees}
                            onIncludeLawyerFeesChange={setIncludeLawyerFees}
                            lawyerFeesAmount={lawyerFeesAmount}
                            formatCurrency={formatCurrency}
                            handleAmountChange={handleAmountChange}
                            onLawyerFeesAmountChange={setLawyerFeesAmount}
                            onCommitLawyerFees={() => commitStep('lawyerFees')}
                        />
                    ) : null}

                    {isRevealed('creditors') ? (
                        <PreloadableOverlayGate
                            lazy={LazyPartiesSection}
                            fallback={CREATION_INNER_SILENT_FALLBACK}
                            lazyProps={{
                            creditors,
                            additionalCreditors,
                            debtors,
                            additionalDebtorsForm,
                            allowMultipleDebtors,
                            showDebtorSolidarySplit,
                            classification,
                            claimType,
                            effectiveClaimTypes,
                            globalClaimTotal: globalClaimTotalForSplit,
                            lockedEntityKind: lockedDebtorEntityKind,
                            debtorManualDebtClaims,
                            debtorLawyerFeesClaims,
                                        formatCurrency,
                            onDebtorManualDebtChange: handleDebtorManualDebtChange,
                            onDebtorLawyerFeesChange: handleDebtorLawyerFeesChange,
                            onAddCreditor: addCreditor,
                            onRemoveAdditionalCreditor: removeAdditionalCreditor,
                            onUpdateAdditionalCreditor: updateAdditionalCreditor,
                            onUpdateCreditor: updateCreditor,
                            onAddIndependentDebtor: addIndependentDebtor,
                            onAddSolidaryDebtor: addSolidaryDebtor,
                            onAddAnotherDebtor: addAnotherDebtor,
                            onRemoveAdditionalDebtor: removeAdditionalDebtor,
                            onUpdateAdditionalDebtor: updateAdditionalDebtor,
                            onUpdateDebtor: updateDebtor,
                            includeLawyerFees,
                            showDebtors: isRevealed('creditors'),
                            onCreditorNameCommit: (opts) => commitStep('creditors', opts),
                            }}
                        />
                        ) : null}

                    {isRevealed('claimAmounts') || isRevealed('claimType') ? (
                    <VisitationCustodyExtrasSection
                        claimType={claimType}
                        visitationChildrenNames={visitationChildrenNames}
                        setVisitationChildrenNames={setVisitationChildrenNames}
                        visitationScheduleDraft={visitationScheduleDraft}
                        setVisitationScheduleDraft={setVisitationScheduleDraft}
                        custodyWardNames={custodyWardNames}
                        setCustodyWardNames={setCustodyWardNames}
                    />
                    ) : null}
                        
                    <div className="h-6" />
                    </div>
                </div>

                <ExecutionSaveButton onSubmit={handleSubmit} />

                {sectionConfirmDialog}

            <ExecutionOptionSheet
                open={docTypeSheetOpen}
                onClose={() => setDocTypeSheetOpen(false)}
                title="نوع السند المنفذ"
                options={EXECUTION_DOC_TYPE_OPTIONS}
                selectedValue={docType}
                onSelect={(v) => {
                    handleDocTypeChange(v);
                    commitStep('docType');
                    setDocTypeSheetOpen(false);
                }}
            />

                <ExecutionOptionSheet
                    open={claimTypeSheetOpen}
                    onClose={() => setClaimTypeSheetOpen(false)}
                    title="نوع المطالبة والتنفيذ"
                    options={shariaExclusiveClaimOptions}
                    selectedValue={claimType}
                exclusiveSectionTitle={showShariaLinkedClaimPanel ? 'مطالبات منفردة' : undefined}
                    onSelect={(v) => {
                        const sameExclusive =
                            effectiveClaimTypes.length <= 1 &&
                            (effectiveClaimTypes[0] ?? claimType) === v;
                        if (!sameExclusive) {
                            setActiveClaimTypes([v]);
                            setClaimAmountsByType({});
                            setLinkedClaimDraft([]);
                        }
                        setClaimTypeSheetOpen(false);
                        commitStep('claimType');
                    }}
                    multiSelectPanel={
                        showShariaLinkedClaimPanel
                            ? {
                                  sectionTitle: 'مطالبات مالية',
                                  options: shariaLinkedClaimOptions,
                                  draftValues: linkedClaimDraft,
                                  onToggleDraft: toggleLinkedClaimDraft,
                                  onConfirm: () => {
                                      saveLinkedClaimDraft();
                                      commitStep('claimType');
                                  },
                                  confirmLabel: 'حفظ الاختيار',
                              }
                            : undefined
                    }
                />
                
            <ExecutionIntakeModals
                showChequeValidatorModal={showChequeValidatorModal}
                chequeBankName={chequeBankName}
                chequeIssueDate={chequeIssueDate}
                chequeNumber={chequeNumber}
                onChequeBankNameChange={setChequeBankName}
                onChequeIssueDateChange={setChequeIssueDate}
                onChequeNumberChange={setChequeNumber}
                onChequeValidatorClose={() => setShowChequeValidatorModal(false)}
                onDocTypeChange={handleDocTypeChange}
                onClaimTypeChange={setClaimType}
                showAbsenteeModal={showAbsenteeModal}
                absenteeChecks={absenteeChecks}
                onAbsenteeChecksChange={setAbsenteeChecks}
                onAbsenteeModalClose={() => setShowAbsenteeModal(false)}
                onDocumentBlockedChange={setIsDocumentBlocked}
            />
        </>
    );
}
