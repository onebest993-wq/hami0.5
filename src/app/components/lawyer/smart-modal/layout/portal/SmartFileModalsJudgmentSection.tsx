import React, { Suspense, lazy } from 'react';
import type { SmartFileModalsPortalProps } from './smartFileModalsPortalTypes';
import { partiesForLegacyModals } from './smartFileModalsPortalTypes';
import { resolveCrossAppealEligibility } from '../../smartFile/crossAppealEngine';
import {
    resolveOpponentRegistrationModalSource,
    resolveRemainingOpponentChallengeFooter,
} from '../../smartFile/opponentRegistrationContext';
/** SmartJudgmentModal يبقى eager — keep-mounted أثناء الإغلاق (عقد انتقال مرحلة). */
import { SmartJudgmentModal } from '../../SmartJudgmentModal';
import { AdjournPleadingModal } from '../../parts/AdjournPleadingModal';
import {
    LazyAddProvisionalOrderModal,
} from '../../lazySmartFileModalChunks';

const LazyAppealTransitionModal = lazy(() =>
    import('../../AppealTransitionModal').then((m) => ({
        default: m.AppealTransitionModal,
    })),
);

const LazyCrossAppealModal = lazy(() =>
    import('../../CrossAppealModal').then((m) => ({
        default: m.CrossAppealModal,
    })),
);

const LazyJudicialNotificationModal = lazy(() =>
    import('../../modals/appealObjectionModals').then((m) => ({
        default: m.JudicialNotificationModal,
    })),
);

export function SmartFileModalsJudgmentSection(props: SmartFileModalsPortalProps) {
    const {
        showJudgmentModal,
        setShowJudgmentModal,
        showAdjournPleadingModal,
        setShowAdjournPleadingModal,
        pendingJudgmentDate,
        setPendingJudgmentDate,
        showAppealModal,
        setShowAppealModal,
        showAppealTransitionModal,
        setShowAppealTransitionModal,
        showCrossAppealModal,
        setShowCrossAppealModal,
        showProvisionalOrderModal,
        setShowProvisionalOrderModal,
        showNotificationModal,
        setShowNotificationModal,
        tempJudgmentData,
        setTempJudgmentData,
        currentStage,
        stages,
        activeStageIndex,
        parentData,
        handlers: h,
        appealRoute,
        lawsuitFile,
    } = props;

    const appealLawsuitFile = {
        ...lawsuitFile,
        disputeIntegrity:
            parentData.disputeIntegrity
            ?? currentStage.disputeIntegrity
            ?? lawsuitFile?.disputeIntegrity,
    };

    const opponentModalSource = resolveOpponentRegistrationModalSource(stages, currentStage);
    const remainingOpponent = resolveRemainingOpponentChallengeFooter({
        stages,
        currentStageName: currentStage.stageName ?? currentStage.name,
        representedParty: parentData.representedParty,
        file: lawsuitFile as
            | { lawsuitJurisdiction?: string; selectedType?: string; type?: string }
            | undefined,
    });

    const crossAppealEligibility = resolveCrossAppealEligibility({
        appealStage: currentStage,
        stages,
        appealStageIndex: activeStageIndex,
    });

    return (
        <>
            {/* Keep mounted while closed so first open is a visibility toggle, not a chunk mount. */}
            <SmartJudgmentModal
                key="judgment"
                isOpen={showJudgmentModal}
                onClose={() => {
                    setShowJudgmentModal(false);
                    setPendingJudgmentDate?.('');
                }}
                onConfirm={(data) => {
                    const result = h.handleJudgmentConfirm(data);
                    setPendingJudgmentDate?.('');
                    return result;
                }}
                currentParties={currentStage.parties ?? []}
                currentStage={currentStage.stageName ?? currentStage.name}
                representedParty={parentData.representedParty}
                stages={stages}
                caseStatus={parentData.status}
                activeStageIndex={activeStageIndex}
                presetJudgmentDate={pendingJudgmentDate}
                caseDocType={parentData.docType}
            />
            <AdjournPleadingModal
                isOpen={showAdjournPleadingModal}
                onClose={() => setShowAdjournPleadingModal(false)}
                onConfirm={h.handleJudgmentConfirm}
                stageName={currentStage.stageName ?? currentStage.name}
            />
            {showAppealModal ? (
                <Suspense fallback={null}>
                    <LazyAppealTransitionModal
                        key="appeal-reg"
                        isOpen={showAppealModal}
                        onClose={() => setShowAppealModal(false)}
                        onConfirm={(data) =>
                            h.handleAppealRegistration({
                                appealMethod:
                                    data.appealType === 'اعتراض على الحكم الغيابي'
                                        ? 'اعتراض غيابي'
                                        : data.appealType,
                                appealCaseNo: data.newCaseNumber,
                                appealCourt: data.newCourt,
                                appellant: data.appellant,
                                filingDate: data.filingDate,
                                includedAppellantPartyIds: data.includedAppellantPartyIds,
                                includedOpponentPartyIds: data.includedOpponentPartyIds,
                                appealDossierMode: data.appealDossierMode,
                            })
                        }
                        mode="opponentRegistration"
                        currentParties={partiesForLegacyModals(opponentModalSource.parties)}
                        representedParty={parentData.representedParty ?? ''}
                        judgmentForm={opponentModalSource.judgmentForm}
                        lastJudgmentType={opponentModalSource.lastJudgmentType}
                        stageName={opponentModalSource.stageName}
                        finalDecision={opponentModalSource.finalDecision}
                        incidentalCases={opponentModalSource.incidentalCases}
                        appealRoute={appealRoute}
                        stages={stages}
                        lawsuitFile={appealLawsuitFile}
                        sourceCaseNumber={String(opponentModalSource.caseNo ?? parentData.caseNo ?? '').trim()}
                        decisionDate={opponentModalSource.decisionDate}
                        appealDeadline={opponentModalSource.appealDeadline ?? opponentModalSource.legalTimers?.appealDeadline}
                        cassationDeadline={opponentModalSource.legalTimers?.cassationDeadline}
                        appealWindowLapsed={opponentModalSource.appealWindowLapsed}
                        cassationWindowLapsed={opponentModalSource.cassationWindowLapsed}
                        partyJudgmentDispositions={opponentModalSource.partyJudgmentDispositions}
                        forcedAllowedMethods={remainingOpponent.show ? remainingOpponent.methods : undefined}
                    />
                </Suspense>
            ) : null}
            {showAppealTransitionModal ? (
                <Suspense fallback={null}>
                    <LazyAppealTransitionModal
                        key="appeal-transition"
                        isOpen={showAppealTransitionModal}
                        onClose={() => {
                            setShowAppealTransitionModal(false);
                            setTempJudgmentData(null);
                        }}
                        onConfirm={h.handleAppealTransition}
                        currentParties={partiesForLegacyModals(currentStage.parties)}
                        representedParty={parentData.representedParty ?? ''}
                        judgmentType={tempJudgmentData?.judgmentType as string | undefined}
                        judgmentForm={
                            (tempJudgmentData?.judgmentForm as string | undefined) ??
                            currentStage.judgmentForm ??
                            currentStage.lastJudgmentType
                        }
                        lastJudgmentType={
                            (tempJudgmentData?.lastJudgmentType as string | undefined) ??
                            currentStage.lastJudgmentType ??
                            currentStage.judgmentForm
                        }
                        stageName={currentStage.stageName}
                        finalDecision={currentStage.finalDecision}
                        incidentalCases={currentStage.incidentalCases}
                        appealRoute={appealRoute}
                        stages={stages}
                        lawsuitFile={appealLawsuitFile}
                        sourceCaseNumber={String(currentStage.caseNo ?? parentData.caseNo ?? '').trim()}
                        presetCourt={String(tempJudgmentData?.newCourt ?? '').trim() || undefined}
                        partyJudgmentDispositions={
                            Array.isArray(tempJudgmentData?.partyJudgmentDispositions)
                                ? tempJudgmentData.partyJudgmentDispositions
                                : currentStage.partyJudgmentDispositions
                        }
                        preferredChallengerPartyId={
                            tempJudgmentData?.preferredChallengerPartyId != null
                                ? String(tempJudgmentData.preferredChallengerPartyId)
                                : null
                        }
                        spawnIndependentDossier={Boolean(
                            tempJudgmentData?.forceIndependentChallengeSpawn
                            || tempJudgmentData?.preferredChallengerPartyId,
                        )}
                    />
                </Suspense>
            ) : null}
            {showProvisionalOrderModal ? (
                <LazyAddProvisionalOrderModal
                    key="provisional-order"
                    isOpen={showProvisionalOrderModal}
                    onClose={() => setShowProvisionalOrderModal(false)}
                    onConfirm={h.handleProvisionalOrderConfirm}
                    currentParties={partiesForLegacyModals(currentStage.parties)}
                />
            ) : null}
            {showNotificationModal ? (
                <Suspense fallback={null}>
                    <LazyJudicialNotificationModal
                        key="notification"
                        isOpen={showNotificationModal}
                        onClose={() => setShowNotificationModal(false)}
                        onConfirm={h.handleSaveNotification}
                    />
                </Suspense>
            ) : null}
        </>
    );
}
