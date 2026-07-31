import React, { Suspense } from 'react';
import {
    Bell, Calendar, MapPin, Pencil, Phone, X, XCircle,
} from 'lucide-react';
import { heirsDetailsIncludeClient } from '../helpers/heirUtils';
import {
    LazyDashboardHeaderSection,
    LazyDebtorsSection,
    LazyDossierActionsModal,
    LazyPartiesSection,
} from '../executionDashboardLazyRegistry';
import { EXEC_OVERLAY_LAZY_FALLBACK, EXEC_SECTION_LAZY_FALLBACK } from '../executionDashboardLazyShellUi';
import { DebtorSeizureCategoryBadges } from '@/app/components/lawyer/execution/DebtorSeizureCategoryBadges';
import { ExecutionPartyInteractiveBadges } from '@/app/components/lawyer/execution/ExecutionPartyInteractiveBadges';
import { getExecutionPartyDisplayName as getExecutionPartyDisplayNameUtil } from '@/app/utils/partyDisplayName';
import { PartyOverflowToggle } from '../executionDashboardLazyShellUi';
import type { ExecutionFile } from '@/app/types/execution';
import { useExecutionDashboardStore as executionDashboardStoreApi } from '@/app/stores/executionDashboardStore';
import {
    ExecutionDashboardPhoneBodySecondarySections,
    type ExecutionDashboardPhoneBodySecondaryScope,
} from './ExecutionDashboardPhoneBodySecondarySections';
import {
    ExecutionDashboardPhoneBodyDeferredPanels,
    type ExecutionDashboardPhoneBodyDeferredScope,
} from './ExecutionDashboardPhoneBodyDeferredPanels';
import type { useExecutionDashboardPhoneBodyScope } from '../hooks/useExecutionDashboardPhoneBodyScope';

export type ExecutionDashboardPhoneBodyScrollModel = ReturnType<typeof useExecutionDashboardPhoneBodyScope>;

/** Content scroll area: header + parties + debtors + secondary + deferred */
export function ExecutionDashboardPhoneBodyScrollContent({
    model,
}: {
    model: ExecutionDashboardPhoneBodyScrollModel;
}) {
    const {
        props,
        followupSpec,
        safeInabaTargets,
        safeSubFiles,
        safeActiveGraceTasks,
        safeShouldShowGuarantorExternalHub,
        safeToggleHeaderExpanded,
        safeOpenEditDossierMeta,
        safeOpenParentDossierMetaEdit,
        safeOpenEditParty,
        safeHandleDebtorEmploymentToggle,
        directHandleMemoFollowupClick,
        directOpenDecisionsModalWithBoot,
        safeOpenAppointmentModal,
        directOpenNotesModal,
        directOpenDocumentsModal,
        directOpenTimelineModal,
        directOpenLedgerModal,
        directOpenEvictionExpenseModal,
        directOpenPaymentCalculator,
        directOpenSettlementCalculator,
        directOpenUnifiedSummonsHub,
        directOpenFinancialCenter,
        closeFinancialHubPortal,
        toggleFinancialCenterExpanded,
        openGuarantorFollowupDetails,
        safeTimelineAccordionExpanded,
        safeSetTimelineAccordionExpanded,
        removeJudicialCustodianEntry,
        propertyInlineSaveCtx,
        secondaryStageReady,
        tertiaryStageReady,
        quaternaryStageReady,
        safeResolveCalendarUserId,
        showToast,
        statuteStatus,
        isAlimonyClaim,
        executionPaused,
        handleResumeExecution,
        stayOfExecutionActive,
        executionData,
        handleLiftStayOfExecution,
        isHeaderExpanded,
        headerFields,
        isEvictionExecutionModule,
        classificationDisplay,
        showJudgmentMeta,
        docNumber,
        judgmentDateDisplay,
        claimTypeArabicDisplay,
        evictionPropertyNumber,
        evictionPropertyDistrict,
        evictionPropertyTypeField,
        evictionFullAddressField,
        isInabaActive,
        persistExecutionMerge,
        isUnifiedTabActive,
        setLinkedDossierToView,
        setShowLinkedDossierTimeline,
        setShowTransferFileNumberChangeModal,
        activeSubFileId,
        setExecutionStorageTick,
        parentExecutionFile,
        parentHeaderFields,
        parentClassificationDisplay,
        parentClaimTypeArabicDisplay,
        parentShowJudgmentMeta,
        parentJudgmentDateDisplay,
        parentIsEvictionForExpandedHeader,
        dossierActionModalOpen,
        dossierActionModalType,
        setDossierActionModalOpen,
        setDossierActionModalType,
        setDossierActionModalSaving,
        handleDossierAction,
        dossierActionModalSaving,
        currentFileId,
        creditorWorkspaceEntries,
        showExtraCreditors,
        setShowExtraCreditors,
        getExecutionPartyDisplayName: _scopeGetExecutionPartyDisplayName,
        viewExecutionData,
        buildPartyHeirsRows,
        openHeirsQuickView,
        effectiveCreditors,
        executionAppealBanner,
        partyBadgesExecutionId,
        activeCoerciveActions,
        seizedAssets,
        activeTimelineEvents,
        decisionsReloadEpoch,
        isHistoricalMode,
        creditorDeathMenuLabel,
        handleCreditorDeathMenuAction,
        creditorExtraMinorNames,
        creditorExtraMinorLabel,
        decisionsStorageExecutionId,
        debtorsSectionRef,
        activeDebtorHeirsForNotification,
        activeDebtorIsDeceased,
        activeNoticeState,
        activeTimelineEventsDebtorScoped,
        buildDebtorSummonsMarkerPatchForKey,
        buildEmployeeAssignmentPatchForDebtorKey,
        buildPublicationNoticePatchForDebtorKey,
        claimType,
        clearDebtorSummonsMarker,
        completeEvictionResidentialGrace,
        completePoliceAssistance,
        computeTaklifDeadlineYmd,
        daysRemainingUntilDeadline,
        debtorArrested,
        debtorAttendedVoluntarily,
        debtorBrowserTabsMode,
        liabilityGroupTabsMode,
        debtorLiabilityGroups,
        debtorDeathMenuLabel,
        debtorEmploymentToggleMenuLabel,
        debtorForcedToAttend,
        debtorSummonsMarkerLocal,
        debtorSummonsProfile,
        debtorWorkspaceChipStripRef,
        debtorWorkspaceEntries,
        dismissDebtorAbsenceBadge,
        effectiveDebtors,
        evictionGraceBadgeInfo,
        evictionGracePinned,
        executionDebtorTabIndex,
        executionId,
        executionMemoBadgePopoverOpen,
        executionToolsTimelineLockedUi,
        forcedAttendanceIssued,
        forcedPathAttendanceSecured,
        getDebtorSummonsMarkerForKey,
        getDebtorSummonsProfile,
        getEmployeeAssignmentForDebtorKey,
        getPersonalCoerciveSubtypeOutcome,
        getPublicationNoticeForDebtorKey,
        handleDebtorDeathMenuAction,
        isAssignmentDeadlinePassed,
        isDebtorGovernmentEmployee,
        isDebtorRowEmployee,
        isNonFinancialClaim,
        isRepresentingDebtor,
        multiDebtorMode,
        nextTimelineId,
        openEvictionResidentialGraceModal,
        openHeirsNotificationCenter,
        openPoliceAssistanceFromBadge,
        financialLawyerFeesAmount,
        financialPrincipalAmount,
        publicationNoticeDeadlineYmd,
        pushTimelineEvent,
        realEstateSeizureAssets,
        saveSummonsMarkerPurposeEdit,
        setDebtorSummonsMarkerLocal,
        setEvictionGraceDecisionId,
        setExecutionDebtorTabIndex,
        setExecutionMemoBadgePopoverOpen,
        setShowExtraDebtors,
        setSummonsMarkerPopoverOpen,
        setSummonsPurposeDraft,
        showDebtorSummonsAttendanceBadge,
        showDebtorUnservedMemoBadge,
        showExtraDebtors,
        standaloneExecutionMarks,
        summonsMarkerPopoverOpen,
        summonsPurposeDraft,
        thirdPartySeizureAssets,
        thirdPartySeizuresUi,
        timelineDebtorMetadata,
        toggleEvictionGracePinned,
        voluntaryAttendanceCount,
        noticeVoluntaryPeriodEndOptimistic,
        voluntaryEndOptimistic,
        persistGuarantorFollowupDetails,
        policeAssistanceBadgeInfo,
        primaryDebtorAbsenceBadge,
        primaryDebtorKeyResolved,
        primaryMemoNoticeBadge,
    } = model;

    // داخل PhoneBody chunk — لا عبر scope الرئيسي (كانت تسحب ~22KB gz إلى cold path)
    const getExecutionPartyDisplayName =
        typeof _scopeGetExecutionPartyDisplayName === 'function'
            ? _scopeGetExecutionPartyDisplayName
            : getExecutionPartyDisplayNameUtil;

    return (
        <div
            className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700/50 scrollbar-track-transparent overscroll-contain"
            dir="rtl"
        >
            {/* حدود Suspense محلية — chunk بارد لقسم واحد لا يحجب بقية الجسم */}
            <Suspense fallback={EXEC_SECTION_LAZY_FALLBACK}>
            <LazyDashboardHeaderSection statuteStatus={statuteStatus} isAlimonyClaim={isAlimonyClaim} executionPaused={executionPaused} handleResumeExecution={handleResumeExecution} stayOfExecutionActive={stayOfExecutionActive} executionData={executionData} handleLiftStayOfExecution={handleLiftStayOfExecution}
                XCircle={XCircle} isHeaderExpanded={isHeaderExpanded} toggleHeaderExpanded={safeToggleHeaderExpanded} headerFields={headerFields} openEditDossierMeta={safeOpenEditDossierMeta}
                Pencil={Pencil} isEvictionExecutionModule={isEvictionExecutionModule} classificationDisplay={classificationDisplay} showJudgmentMeta={showJudgmentMeta} docNumber={docNumber} judgmentDateDisplay={judgmentDateDisplay} claimTypeArabicDisplay={claimTypeArabicDisplay}
                evictionPropertyNumber={evictionPropertyNumber}
                evictionPropertyDistrict={evictionPropertyDistrict}
                evictionPropertyTypeField={evictionPropertyTypeField}
                evictionFullAddressField={evictionFullAddressField}
            isSubFile={isInabaActive}
            hasActiveInaba={!isInabaActive && safeInabaTargets.length > 0}
            delegationPurpose={(executionData as any)?.delegationPurpose}
            linkToken={isInabaActive ? undefined : (executionData as any)?.linkToken}
            onCopyLinkToken={() => {
                const token = (executionData as any)?.linkToken;
                if (token) {
                    navigator.clipboard.writeText(token).catch(() => {});
                    showToast('تم نسخ رمز المشاركة', 'success');
                }
            }}
            linkedDossiers={
                isInabaActive
                    ? undefined
                    : (() => {
                          const rows = (executionData as ExecutionFile | null | undefined)?.linkedDossiers;
                          return Array.isArray(rows) && rows.length > 0 ? rows : undefined;
                      })()
            }
            onRemoveLinkedDossier={(linkedId) => {
                const store = executionDashboardStoreApi.getState();
                const current = executionData as any;
                const existing = Array.isArray(current?.linkedDossiers)
                    ? (current.linkedDossiers as any[])
                    : [];
                const next = existing.filter((d) => String(d?.linkedId || '') !== String(linkedId));
                const curId = String(current?.id || '').trim();
                const hasChildren = curId ? store.getChildDossiers(curId).length > 0 : false;
                const patch: any = { linkedDossiers: next };
                if (next.length === 0 && !hasChildren) {
                    patch.linkToken = undefined;
                }
                if (isUnifiedTabActive) {
                    persistExecutionMerge(patch);
                } else {
                    store.updateCurrentFile(patch);
                }
                showToast('تم إلغاء الربط بنجاح', 'success');
            }}
            onOpenLinkedDossier={(dossier) => {
                if (dossier.type === 'colleague') {
                    setLinkedDossierToView(dossier);
                    setShowLinkedDossierTimeline(true);
                }
            }}
            onRequestTransferFileNumberChange={() => {
                setShowTransferFileNumberChangeModal(true);
            }}
            onSaveSubFileNumber={(fileNumber, fileYear) => {
                if (!isInabaActive || !activeSubFileId) return;
                const num = String(fileNumber || '').trim();
                const year = String(fileYear || '').trim();
                const st = executionDashboardStoreApi.getState();
                const cur = st.currentFile
                    ? ({ ...st.currentFile, fileNumber: num, fileYear: year } as ExecutionFile)
                    : null;
                executionDashboardStoreApi.setState({
                    currentFile: cur,
                    subFiles: st.subFiles.map((f) =>
                        f.id === activeSubFileId ? { ...f, fileNumber: num, fileYear: year } : f
                    ),
                });
                persistExecutionMerge({ fileNumber: num, fileYear: year });
                setExecutionStorageTick((t) => t + 1);
                showToast('تم حفظ رقم الإضبارة الفرعية', 'success');
            }}
            expandedDossierFromParent={
                isInabaActive && parentExecutionFile
                    ? {
                          headerFields: parentHeaderFields,
                          classificationDisplay: parentClassificationDisplay,
                          claimTypeArabicDisplay: parentClaimTypeArabicDisplay,
                          showJudgmentMeta: parentShowJudgmentMeta,
                          judgmentDateDisplay: parentJudgmentDateDisplay,
                          docNumber: parentHeaderFields.docNumber,
                          evictionPropertyNumber: String(
                              (parentExecutionFile as { property_number?: string }).property_number ?? ''
                          ),
                          evictionPropertyDistrict: String(
                              (parentExecutionFile as { district?: string }).district ?? ''
                          ),
                          evictionPropertyTypeField: String(
                              (parentExecutionFile as { property_type?: string }).property_type ?? ''
                          ),
                          evictionFullAddressField: String(
                              (parentExecutionFile as { full_address?: string }).full_address ?? ''
                          ),
                          isEvictionExecutionModule: parentIsEvictionForExpandedHeader,
                          openEditDossierMeta: safeOpenParentDossierMetaEdit,
                      }
                    : undefined
            }
            />
            </Suspense>

            <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
            <LazyDossierActionsModal
                open={dossierActionModalOpen}
                actionType={dossierActionModalType} onClose={() => {
                    setDossierActionModalOpen(false);
                    setDossierActionModalType(null);
                }}
                onConfirm={(payload) => {
                    setDossierActionModalSaving(true);
                    void handleDossierAction(payload);
                }}
                saving={dossierActionModalSaving} currentFileId={currentFileId} inabaTargets={safeInabaTargets}
            />
            </Suspense>

            {/* Parties / Creditors */}
            <Suspense fallback={EXEC_SECTION_LAZY_FALLBACK}>
            <LazyPartiesSection creditorWorkspaceEntries={creditorWorkspaceEntries} showExtraCreditors={showExtraCreditors} setShowExtraCreditors={setShowExtraCreditors} getExecutionPartyDisplayName={getExecutionPartyDisplayName} executionData={executionData} viewExecutionData={viewExecutionData} buildPartyHeirsRows={buildPartyHeirsRows} openHeirsQuickView={openHeirsQuickView} effectiveCreditors={effectiveCreditors}
                heirsDetailsIncludeClient={heirsDetailsIncludeClient} executionAppealBanner={executionAppealBanner}
                onOpenDecisionsAppealsTab={() => {
                    if (typeof directOpenDecisionsModalWithBoot === 'function') {
                        directOpenDecisionsModalWithBoot({ tab: 'appeals' });
                        return;
                    }
                    showToast(
                        'تعذر فتح القرارات والطعون لأن الربط الحقيقي لم يصل إلى الواجهة بعد.',
                        'error',
                    );
                }} partyBadgesExecutionId={partyBadgesExecutionId} seizedAssets={seizedAssets} activeTimelineEvents={activeTimelineEvents} decisionsReloadEpoch={decisionsReloadEpoch} isHistoricalMode={isHistoricalMode} creditorDeathMenuLabel={creditorDeathMenuLabel} handleCreditorDeathMenuAction={handleCreditorDeathMenuAction} creditorExtraMinorNames={creditorExtraMinorNames} creditorExtraMinorLabel={creditorExtraMinorLabel} showToast={showToast} decisionsStorageExecutionId={decisionsStorageExecutionId} openEditParty={safeOpenEditParty}
            />

            <LazyDebtorsSection ref={debtorsSectionRef} {...{
                Bell,
                Calendar,
                DebtorSeizureCategoryBadges,
                ExecutionPartyInteractiveBadges,
                MapPin,
                PartyOverflowToggle,
                Phone,
                X,
                activeCoerciveActions,
                activeDebtorHeirsForNotification,
                activeDebtorIsDeceased,
                activeNoticeState,
                activeTimelineEvents,
                activeTimelineEventsDebtorScoped,
                buildDebtorSummonsMarkerPatchForKey,
                buildEmployeeAssignmentPatchForDebtorKey,
                buildPartyHeirsRows,
                buildPublicationNoticePatchForDebtorKey,
                claimType,
                clearDebtorSummonsMarker,
                completeEvictionResidentialGrace,
                completePoliceAssistance,
                computeTaklifDeadlineYmd,
                daysRemainingUntilDeadline,
                debtorArrested,
                debtorAttendedVoluntarily,
                debtorBrowserTabsMode,
                liabilityGroupTabsMode,
                debtorLiabilityGroups,
                debtorDeathMenuLabel,
                debtorEmploymentToggleMenuLabel,
                debtorForcedToAttend,
                debtorSummonsMarkerLocal,
                debtorSummonsProfile,
                debtorWorkspaceChipStripRef,
                debtorWorkspaceEntries,
                decisionsReloadEpoch,
                decisionsStorageExecutionId,
                dismissDebtorAbsenceBadge,
                effectiveDebtors,
                evictionGraceBadgeInfo,
                evictionGracePinned,
                executionAppealBanner,
                executionData,
                executionDebtorTabIndex,
                executionId,
                executionMemoBadgePopoverOpen,
                executionToolsTimelineLockedUi,
                forcedAttendanceIssued,
                forcedPathAttendanceSecured,
                getDebtorSummonsMarkerForKey,
                getDebtorSummonsProfile,
                getEmployeeAssignmentForDebtorKey,
                getExecutionPartyDisplayName,
                getPersonalCoerciveSubtypeOutcome,
                getPublicationNoticeForDebtorKey,
                handleDebtorDeathMenuAction,
                handleDebtorEmploymentToggle: safeHandleDebtorEmploymentToggle,
                heirsDetailsIncludeClient,
                isAssignmentDeadlinePassed,
                isDebtorGovernmentEmployee,
                isDebtorRowEmployee,
                isEvictionExecutionModule,
                isHistoricalMode,
                isNonFinancialClaim,
                isRepresentingDebtor,
                multiDebtorMode,
                nextTimelineId,
                openEditParty: safeOpenEditParty,
                openEvictionResidentialGraceModal,
                openHeirsNotificationCenter,
                openHeirsQuickView,
                openPoliceAssistanceFromBadge,
                parsedLawyerFees: financialLawyerFeesAmount,
                partyBadgesExecutionId,
                persistExecutionMerge,
                persistGuarantorFollowupDetails,
                policeAssistanceBadgeInfo,
                primaryDebtorAbsenceBadge,
                primaryDebtorKeyResolved,
                primaryMemoNoticeBadge,
                principalDebtAmount: financialPrincipalAmount,
                publicationNoticeDeadlineYmd,
                pushTimelineEvent,
                realEstateSeizureAssets,
                saveSummonsMarkerPurposeEdit,
                seizedAssets,
                setDebtorSummonsMarkerLocal,
                onOpenDecisionsAppealsTab: () => {
                    if (typeof directOpenDecisionsModalWithBoot === 'function') {
                        directOpenDecisionsModalWithBoot({ tab: 'appeals' });
                        return;
                    }
                    showToast(
                        'تعذر فتح القرارات والطعون لأن الربط الحقيقي لم يصل إلى الواجهة بعد.',
                        'error',
                    );
                },
                setEvictionGraceDecisionId,
                setExecutionDebtorTabIndex,
                setExecutionMemoBadgePopoverOpen,
                setShowExtraDebtors,
                onOpenUnifiedSummonsHub: directOpenUnifiedSummonsHub,
                setSummonsMarkerPopoverOpen,
                setSummonsPurposeDraft,
                showDebtorSummonsAttendanceBadge,
                showDebtorUnservedMemoBadge,
                showExtraDebtors,
                showToast,
                smExecutionTarget: executionData?.executionTarget,
                smHasGuarantorFile: executionData?.hasGuarantor,
                hideAllGuarantorPresence: Boolean(followupSpec.hideAllGuarantorPresence),
                standaloneExecutionMarks,
                summonsMarkerPopoverOpen,
                summonsPurposeDraft,
                thirdPartySeizureAssets,
                thirdPartySeizures: thirdPartySeizuresUi,
                timelineDebtorMetadata,
                toggleEvictionGracePinned,
                viewExecutionData,
                voluntaryAttendanceCount,
                noticeVoluntaryPeriodEndOptimistic,
                voluntaryEndOptimistic,
            }}
            />
            </Suspense>
            <ExecutionDashboardPhoneBodySecondarySections
                scope={props as unknown as ExecutionDashboardPhoneBodySecondaryScope}
                secondaryStageReady={secondaryStageReady}
                followupSpec={followupSpec}
                safeResolveCalendarUserId={safeResolveCalendarUserId}
                safeSetTimelineAccordionExpanded={safeSetTimelineAccordionExpanded}
                safeTimelineAccordionExpanded={safeTimelineAccordionExpanded}
                safeSubFilesCount={safeSubFiles.length}
                safeOpenAppointmentModal={safeOpenAppointmentModal}
                directOpenNotesModal={directOpenNotesModal}
                directOpenDocumentsModal={directOpenDocumentsModal}
                directOpenTimelineModal={directOpenTimelineModal}
                directOpenFinancialCenter={directOpenFinancialCenter}
                directHandleMemoFollowupClick={directHandleMemoFollowupClick}
                directOpenDecisionsModalWithBoot={directOpenDecisionsModalWithBoot}
            />

            <ExecutionDashboardPhoneBodyDeferredPanels
                scope={props as unknown as ExecutionDashboardPhoneBodyDeferredScope}
                quaternaryStageReady={quaternaryStageReady}
                tertiaryStageReady={tertiaryStageReady}
                safeActiveGraceTasks={safeActiveGraceTasks}
                safeShouldShowGuarantorExternalHub={safeShouldShowGuarantorExternalHub}
                directOpenUnifiedSummonsHub={directOpenUnifiedSummonsHub}
                removeJudicialCustodianEntry={removeJudicialCustodianEntry}
                propertyInlineSaveCtx={propertyInlineSaveCtx}
                openGuarantorFollowupDetails={openGuarantorFollowupDetails}
                closeFinancialHubPortal={closeFinancialHubPortal}
                toggleFinancialCenterExpanded={toggleFinancialCenterExpanded}
                directOpenPaymentCalculator={directOpenPaymentCalculator}
                directOpenSettlementCalculator={directOpenSettlementCalculator}
                directOpenLedgerModal={directOpenLedgerModal}
                directOpenEvictionExpenseModal={directOpenEvictionExpenseModal}
            />
            {/* BOTTOM SPACER FOR SMOOTH SCROLLING */}
            <div className="h-6"></div>

        </div>
    );
}
