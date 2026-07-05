import React from 'react';
import type { SmartFileModalsPortalProps } from './smartFileModalsPortalTypes';
import { partiesForLegacyModals } from './smartFileModalsPortalTypes';
import { resolveCrossAppealEligibility } from '../../smartFile/crossAppealEngine';
import {
    LazySmartJudgmentModal,
    LazyAppealTransitionModal,
    LazyCrossAppealModal,
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
                {showJudgmentModal && (
                    <>
                        {/* #region debug-point B:judgment-modal-render */}
                        {(() => {
                            fetch('http://127.0.0.1:7778/event', {
                                method: 'POST',
                                body: JSON.stringify({
                                    sessionId: 'pleadings-close-button',
                                    runId: 'pre-fix',
                                    hypothesisId: 'B',
                                    location: 'SmartFileModalsJudgmentSection.tsx:showJudgmentModal',
                                    msg: '[DEBUG] judgment modal render path reached',
                                    data: {
                                        stageName: currentStage.stageName ?? null,
                                        partyCount: Array.isArray(currentStage.parties) ? currentStage.parties.length : 0,
                                        showAppealModal,
                                        showAppealTransitionModal,
                                        showCrossAppealModal,
                                    },
                                    ts: Date.now(),
                                }),
                            }).catch(() => {});
                            return null;
                        })()}
                        {/* #endregion */}
                        <LazySmartJudgmentModal
                            key="judgment"
                            isOpen={showJudgmentModal}
                            onClose={() => setShowJudgmentModal(false)}
                            onConfirm={h.handleJudgmentConfirm}
                            currentParties={currentStage.parties ?? []}
                            currentStage={currentStage.stageName}
                            representedParty={parentData.representedParty}
                        />
                    </>
                )}
                {showAppealModal && (
                    <>
                    {/* #region debug-point B:appeal-modal-render */}
                    {(() => {
                        fetch('http://127.0.0.1:7777/event', {
                            method: 'POST',
                            body: JSON.stringify({
                                sessionId: 'opponent-appeal-crash',
                                runId: 'pre-fix',
                                hypothesisId: 'B',
                                location: 'SmartFileModalsJudgmentSection.tsx:showAppealModal',
                                msg: '[DEBUG] opponent appeal modal render',
                                data: {
                                    stageName: currentStage.stageName ?? null,
                                    judgmentForm: currentStage.judgmentForm ?? null,
                                    lastJudgmentType: currentStage.lastJudgmentType ?? null,
                                    partyCount: Array.isArray(currentStage.parties) ? currentStage.parties.length : 0,
                                    incidentalCount: Array.isArray(currentStage.incidentalCases) ? currentStage.incidentalCases.length : 0,
                                    appealRouteStage: appealRoute?.stageName ?? appealRoute?.currentStage ?? null,
                                },
                                ts: Date.now(),
                            }),
                        }).catch(() => {});
                        return null;
                    })()}
                    {/* #endregion */}
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
                    </>
                )}
                {showAppealTransitionModal && (
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
                        judgmentForm={tempJudgmentData?.judgmentForm as string | undefined}
                        stageName={currentStage.stageName}
                        incidentalCases={currentStage.incidentalCases}
                        appealRoute={appealRoute}
                    />
                )}
                {showCrossAppealModal && (
                    <LazyCrossAppealModal
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
                )}
                {showProvisionalOrderModal && (
                    <LazyAddProvisionalOrderModal
                        key="provisional-order"
                        isOpen={showProvisionalOrderModal}
                        onClose={() => setShowProvisionalOrderModal(false)}
                        onConfirm={h.handleProvisionalOrderConfirm}
                        currentParties={partiesForLegacyModals(currentStage.parties)}
                    />
                )}
                {showNotificationModal && (
                    <LazyJudicialNotificationModal
                        key="notification"
                        isOpen={showNotificationModal}
                        onClose={() => setShowNotificationModal(false)}
                        onConfirm={h.handleSaveNotification}
                    />
                )}
        </>
    );
}
