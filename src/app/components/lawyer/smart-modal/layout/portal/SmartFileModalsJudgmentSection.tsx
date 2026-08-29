import React, { Suspense, lazy } from 'react';
import type { SmartFileModalsPortalProps } from './smartFileModalsPortalTypes';
import { partiesForLegacyModals } from './smartFileModalsPortalTypes';
import { resolveCrossAppealEligibility } from '../../smartFile/crossAppealEngine';
/** SmartJudgmentModal يبقى eager — keep-mounted أثناء الإغلاق (عقد انتقال مرحلة). */
import { SmartJudgmentModal } from '../../SmartJudgmentModal';
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
                currentStage={currentStage.stageName ?? currentStage.name}
                representedParty={parentData.representedParty}
                stages={stages}
                caseStatus={parentData.status}
                activeStageIndex={activeStageIndex}
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
                        finalDecision={currentStage.finalDecision}
                        incidentalCases={currentStage.incidentalCases}
                        appealRoute={appealRoute}
                        stages={stages}
                        lawsuitFile={lawsuitFile}
                        sourceCaseNumber={String(currentStage.caseNo ?? parentData.caseNo ?? '').trim()}
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
                        lawsuitFile={lawsuitFile}
                        sourceCaseNumber={String(currentStage.caseNo ?? parentData.caseNo ?? '').trim()}
                    />
                </Suspense>
            ) : null}
            {showCrossAppealModal ? (
                <Suspense fallback={null}>
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
