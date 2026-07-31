import React from 'react';
import type { SmartFileModalsPortalProps } from './smartFileModalsPortalTypes';
import { partiesForLegacyModals } from './smartFileModalsPortalTypes';
import { resolveCrossAppealEligibility } from '../../smartFile/crossAppealEngine';
/** Eager imports — avoid first-open Suspense flash on stage-transition buttons. */
import { SmartJudgmentModal } from '../../SmartJudgmentModal';
import { AppealTransitionModal } from '../../AppealTransitionModal';
import { CrossAppealModal } from '../../CrossAppealModal';
import {
    LazyAddProvisionalOrderModal,
    LazyJudicialNotificationModal,
} from '../../lazySmartFileModalChunks';

export function SmartFileModalsJudgmentSection(props: SmartFileModalsPortalProps) {
    const {
        showJudgmentModal,
        setShowJudgmentModal,
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
    } = props;

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
                onClose={() => setShowJudgmentModal(false)}
                onConfirm={h.handleJudgmentConfirm}
                currentParties={currentStage.parties ?? []}
                currentStage={currentStage.stageName}
                representedParty={parentData.representedParty}
                stages={stages}
                caseStatus={parentData.status}
                activeStageIndex={activeStageIndex}
            />
            <AppealTransitionModal
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
                        appellant: data.appellant,
                        filingDate: data.filingDate,
                        includedAppellantPartyIds: data.includedAppellantPartyIds,
                        includedOpponentPartyIds: data.includedOpponentPartyIds,
                        appealDossierMode: data.appealDossierMode,
                    })
                }
                mode="opponentRegistration"
                currentParties={partiesForLegacyModals(currentStage.parties)}
                representedParty={parentData.representedParty ?? ''}
                judgmentForm={currentStage.judgmentForm}
                lastJudgmentType={currentStage.lastJudgmentType}
                stageName={currentStage.stageName}
                incidentalCases={currentStage.incidentalCases}
                appealRoute={appealRoute}
            />
            <AppealTransitionModal
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
                judgmentForm={tempJudgmentData?.judgmentForm as string | undefined}
                stageName={currentStage.stageName}
                incidentalCases={currentStage.incidentalCases}
                appealRoute={appealRoute}
            />
            <CrossAppealModal
                key="cross-appeal"
                isOpen={showCrossAppealModal}
                onClose={() => setShowCrossAppealModal(false)}
                pendingParties={crossAppealEligibility.pendingCrossAppellants.map((p) => ({
                    id: p.id,
                    name: String(p.name ?? ''),
                    role: p.role,
                }))}
                onConfirm={h.handleCrossAppeal}
            />
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
                <LazyJudicialNotificationModal
                    key="notification"
                    isOpen={showNotificationModal}
                    onClose={() => setShowNotificationModal(false)}
                    onConfirm={h.handleSaveNotification}
                />
            ) : null}
        </>
    );
}
