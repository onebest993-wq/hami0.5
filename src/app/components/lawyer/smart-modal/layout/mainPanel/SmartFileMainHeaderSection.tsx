import { SmartHeader } from '../../parts/SmartHeader';
import { pickNonemptyString, readFileDetailsField } from './smartFileMainPanelUtils';
import { SmartFileStatusBanners } from './SmartFileStatusBanners';
import { SmartFileAppealDeadlineBanner } from './SmartFileAppealDeadlineBanner';
import type { SmartFileMainPanelProps } from './smartFileMainPanelTypes';
import type { useSmartFileMainPanelLayout } from './useSmartFileMainPanelLayout';

type Layout = ReturnType<typeof useSmartFileMainPanelLayout>;

export type SmartFileMainHeaderSectionProps = {
    file: SmartFileMainPanelProps['file'];
    status: SmartFileMainPanelProps['status'];
    isViewingArchived: boolean;
    interactionLocked: boolean;
    isPaused: SmartFileMainPanelProps['isPaused'];
    pauseReason: SmartFileMainPanelProps['pauseReason'];
    isInterrupted: SmartFileMainPanelProps['isInterrupted'];
    interruptionData: SmartFileMainPanelProps['interruptionData'];
    linkedCaseNo: SmartFileMainPanelProps['linkedCaseNo'];
    parentData: SmartFileMainPanelProps['parentData'];
    displayStage: SmartFileMainPanelProps['displayStage'];
    stages: SmartFileMainPanelProps['stages'];
    stepperStages: SmartFileMainPanelProps['stepperStages'];
    currentStageId: SmartFileMainPanelProps['currentStageId'];
    headerParties: Layout['headerParties'];
    primaryCaseNo: Layout['primaryCaseNo'];
    primaryDocType: Layout['primaryDocType'];
    consolidatedSecondaryLabel: Layout['consolidatedSecondaryLabel'];
    crossAppealEligibility: Layout['crossAppealEligibility'];
    showOpponentAppealBtn: Layout['showOpponentAppealBtn'];
    showAbsentJudgmentFooter: Layout['showAbsentJudgmentFooter'];
    handleStageSelect: SmartFileMainPanelProps['handleStageSelect'];
    setShowPauseResumeModal: SmartFileMainPanelProps['setShowPauseResumeModal'];
    setShowPauseModal: SmartFileMainPanelProps['setShowPauseModal'];
    handleInterruptionToggle: SmartFileMainPanelProps['handleInterruptionToggle'];
    handleAbandonment: SmartFileMainPanelProps['handleAbandonment'];
    setShowNotificationModal: SmartFileMainPanelProps['setShowNotificationModal'];
    handleCancelCrossAppeal: SmartFileMainPanelProps['handleCancelCrossAppeal'];
    setShowCrossAppealModal: SmartFileMainPanelProps['setShowCrossAppealModal'];
    handleToggleNotification: SmartFileMainPanelProps['handleToggleNotification'];
    handleCassationDecision: SmartFileMainPanelProps['handleCassationDecision'];
    handleClosePleadings: SmartFileMainPanelProps['handleClosePleadings'];
    handleReopenPleadings: SmartFileMainPanelProps['handleReopenPleadings'];
    handleOpenDefendantCassationAppeal: SmartFileMainPanelProps['handleOpenDefendantCassationAppeal'];
    setShowAppealModal: SmartFileMainPanelProps['setShowAppealModal'];
    handleDefaultObjection: SmartFileMainPanelProps['handleDefaultObjection'];
    handleWaiveObjection: SmartFileMainPanelProps['handleWaiveObjection'];
    handleOtherAppeals: SmartFileMainPanelProps['handleOtherAppeals'];
    setShowProvisionalOrderModal: SmartFileMainPanelProps['setShowProvisionalOrderModal'];
    handleUpdateIncidentalEntryDecision: SmartFileMainPanelProps['handleUpdateIncidentalEntryDecision'];
};

export function SmartFileMainHeaderSection({
    file,
    status,
    isViewingArchived,
    interactionLocked,
    isPaused,
    pauseReason,
    isInterrupted,
    interruptionData,
    linkedCaseNo,
    parentData,
    displayStage,
    stages,
    stepperStages,
    currentStageId,
    headerParties,
    primaryCaseNo,
    primaryDocType,
    consolidatedSecondaryLabel,
    crossAppealEligibility,
    showOpponentAppealBtn,
    showAbsentJudgmentFooter,
    handleStageSelect,
    setShowPauseResumeModal,
    setShowPauseModal,
    handleInterruptionToggle,
    handleAbandonment,
    setShowNotificationModal,
    handleCancelCrossAppeal,
    setShowCrossAppealModal,
    handleToggleNotification,
    handleCassationDecision,
    handleClosePleadings,
    handleReopenPleadings,
    handleOpenDefendantCassationAppeal,
    setShowAppealModal,
    handleDefaultObjection,
    handleWaiveObjection,
    handleOtherAppeals,
    setShowProvisionalOrderModal,
    handleUpdateIncidentalEntryDecision,
}: SmartFileMainHeaderSectionProps) {
    return (
        <>
            {/* PRINT HEADER */}
            <div className="hidden print:block text-center mb-8 border-b-2 border-black pb-4">
                <h1 className="text-2xl font-bold">تقرير حالة دعوى قضائية</h1>
                <p className="text-sm mt-2">تاريخ الإصدار: {new Date().toLocaleDateString('ar-IQ')}</p>
            </div>

            <SmartFileStatusBanners
                displayStage={displayStage}
                status={status}
                interruptionData={interruptionData}
            />

            <SmartHeader
                formData={{
                    ...displayStage,
                    parties: headerParties,
                    caseNo: pickNonemptyString(displayStage?.caseNo, primaryCaseNo),
                    court: pickNonemptyString(
                        displayStage?.court,
                        (displayStage as Record<string, unknown> | undefined)?.courtName,
                        file?.court,
                        parentData?.court,
                        readFileDetailsField(file, 'court'),
                    ),
                    judge: pickNonemptyString(
                        displayStage?.judge,
                        (displayStage as Record<string, unknown> | undefined)?.judgeName,
                        (displayStage as Record<string, unknown> | undefined)?.judge_name,
                        file?.judge,
                        parentData?.judge,
                        (file as Record<string, unknown> | undefined)?.judgeName,
                        readFileDetailsField(file, 'judge'),
                        readFileDetailsField(file, 'judgeName'),
                        readFileDetailsField(file, 'judge_name'),
                    ),
                    docType: primaryDocType,
                    claimValue: pickNonemptyString(
                        file?.claimValue,
                        displayStage?.claimValue,
                    ),
                }}
                caseType={String(file?.type ?? displayStage?.type ?? 'غير محدد')}
                representedParty={parentData.representedParty}
                incidentalCases={displayStage?.incidentalCases || []}
                stages={stepperStages}
                crossAppealEligibility={crossAppealEligibility}
                currentStageId={currentStageId}
                onStageClick={handleStageSelect}
                stageHistory={stages.filter(s => s.status === 'completed' || s.status === 'locked')}
                isPaused={isPaused}
                pauseReason={pauseReason}
                onResume={!interactionLocked ? () => setShowPauseResumeModal(true) : undefined}
                onPause={!interactionLocked ? () => setShowPauseModal(true) : undefined}
                status={status}
                isInterrupted={isInterrupted}
                interruptionData={interruptionData}
                linkedCaseNo={consolidatedSecondaryLabel || linkedCaseNo}
                onInterrupt={!interactionLocked ? handleInterruptionToggle : undefined}
                onAbandon={!interactionLocked ? handleAbandonment : undefined}
                onNotification={!interactionLocked ? () => setShowNotificationModal(true) : undefined}
                isReadOnly={interactionLocked}
                hasCrossAppeal={displayStage?.hasCrossAppeal}
                onCancelCrossAppeal={!interactionLocked ? handleCancelCrossAppeal : undefined}
                onAddCrossAppeal={
                    !interactionLocked && crossAppealEligibility.showButton
                        ? () => setShowCrossAppealModal(true)
                        : undefined
                }
                notificationStatus={displayStage?.parties?.[1]?.notificationStatus || displayStage?.defendantNotificationStatus}
                onToggleNotification={!interactionLocked ? handleToggleNotification : undefined}
                // Cassation Props
                onCassationDecision={
                    !isViewingArchived
                        ? (type) =>
                              handleCassationDecision(type as 'ratified' | 'quashed')
                        : undefined
                }
                // Pleadings Lock Props
                isPleadingsClosed={displayStage?.isPleadingsClosed}
                wasReopened={displayStage?.wasReopened}
                onClosePleadings={!interactionLocked ? handleClosePleadings : undefined}
                onReopenPleadings={!interactionLocked ? handleReopenPleadings : undefined}
                onCassationAppeal={!interactionLocked ? handleOpenDefendantCassationAppeal : undefined}
                onRegisterOpponentAppeal={!interactionLocked ? () => setShowAppealModal(true) : undefined}
                hasJudgment={Boolean(displayStage?.finalDecision || displayStage?.isPleadingsClosed)}
                // Default Judgment Props
                onDefaultObjection={!interactionLocked ? handleDefaultObjection : undefined}
                onWaiveObjection={!interactionLocked ? handleWaiveObjection : undefined}
                onOtherAppeals={!interactionLocked ? handleOtherAppeals : undefined}
                provisionalOrders={displayStage?.provisionalOrders || []}
                onAddProvisionalOrder={!interactionLocked ? () => setShowProvisionalOrderModal(true) : undefined}
                thirdParties={displayStage?.thirdParties || []}
                onUpdateIncidentalEntryDecision={
                    !interactionLocked ? handleUpdateIncidentalEntryDecision : undefined
                }
            />

            <SmartFileAppealDeadlineBanner
                displayStage={displayStage}
                showOpponentAppealBtn={showOpponentAppealBtn}
                showAbsentJudgmentFooter={showAbsentJudgmentFooter}
            />
        </>
    );
}
