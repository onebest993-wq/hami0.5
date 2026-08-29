import type { CriminalDashboardModalsHostProps } from './criminalDashboardModalsHostProps';
import {
    SendToCassationModal,
} from './criminalDashboardLazyModals';
import {
    JudicialCassationAppealModal,
    JudicialCassationResultModal,
    type JudicialCassationAppealModalVariant,
} from './criminalDashboardAppealFlowLazyModals';
import { VerdictCassationFilingModal } from './criminalDashboardRequestFlowLazyModals';

export type CriminalDashboardModalsHostCassationProps = Pick<
    CriminalDashboardModalsHostProps,
    | 'id'
    | 'defendants'
    | 'activeParties'
    | 'criminalCase'
    | 'caseStage'
    | 'showLegalToast'
    | 'cassationAppealModal'
    | 'setCassationAppealModal'
    | 'declareJudicialDecisionFinal'
    | 'fileJudicialDecisionAppeal'
    | 'cassationResultContext'
    | 'setCassationResultContext'
    | 'recordJudicialAppealResult'
    | 'isSendToCassationOpen'
    | 'setIsSendToCassationOpen'
    | 'availableCassationFilingTypes'
    | 'cassationType'
    | 'setCassationType'
    | 'cassationInterventionBasis'
    | 'setCassationInterventionBasis'
    | 'cassationNumber'
    | 'setCassationNumber'
    | 'cassationPanelName'
    | 'setCassationPanelName'
    | 'cassationAppellantIds'
    | 'setCassationAppellantIds'
    | 'submitSendToCassation'
    | 'verdictCassationFilingCard'
    | 'setVerdictCassationFilingCard'
    | 'effectiveUiStage'
    | 'isDecisionsTabMaterialReadOnly'
    | 'patchVerdictCardOrdinaryAppeal'
>;

/** مودالات الطعن التمييزي / إرسال الأوراق / تسجيل تقديم الطعن على بطاقة حكم. */
export function CriminalDashboardModalsHostCassation({
    id,
    defendants,
    activeParties,
    criminalCase,
    caseStage,
    showLegalToast,
    cassationAppealModal,
    setCassationAppealModal,
    declareJudicialDecisionFinal,
    fileJudicialDecisionAppeal,
    cassationResultContext,
    setCassationResultContext,
    recordJudicialAppealResult,
    isSendToCassationOpen,
    setIsSendToCassationOpen,
    availableCassationFilingTypes,
    cassationType,
    setCassationType,
    cassationInterventionBasis,
    setCassationInterventionBasis,
    cassationNumber,
    setCassationNumber,
    cassationPanelName,
    setCassationPanelName,
    cassationAppellantIds,
    setCassationAppellantIds,
    submitSendToCassation,
    verdictCassationFilingCard,
    setVerdictCassationFilingCard,
    effectiveUiStage,
    isDecisionsTabMaterialReadOnly,
    patchVerdictCardOrdinaryAppeal,
}: CriminalDashboardModalsHostCassationProps) {
    return (
        <>
            <JudicialCassationAppealModal
                open={Boolean(cassationAppealModal)}
                decision={cassationAppealModal?.decision ?? null}
                variant={cassationAppealModal?.variant ?? 'ordinary'}
                parties={activeParties}
                onClose={() => setCassationAppealModal(null)}
                onSubmit={({ appellantType, appellantIds, targetDefendantIds, appellantManualLabel }) => {
                    if (!cassationAppealModal) return null;
                    const { decision, variant } = cassationAppealModal;
                    let err: string | null = null;
                    if (variant === 'declare_final') {
                        err = declareJudicialDecisionFinal(id, decision.id, {
                            declarerType: appellantType,
                            declarerIds: appellantIds,
                            declarerManualLabel: appellantManualLabel,
                        });
                    } else {
                        err = fileJudicialDecisionAppeal(id, decision.id, {
                            appellantType,
                            appellantIds,
                            targetDefendantIds,
                            appellantManualLabel,
                            appealPath: variant,
                        });
                    }
                    if (err) {
                        showLegalToast(err, 5000);
                        return err;
                    }
                    const successByVariant: Record<JudicialCassationAppealModalVariant, string> = {
                        ordinary: '✓ تم تسجيل الطعن التمييزي — بانتظار نتيجة محكمة الطعن.',
                        intervention_264b: '✓ تم تسجيل طلب التدخل التمييزي — بانتظار النتيجة.',
                        correction_266: '✓ تم تسجيل طلب تصحيح القرار — بانتظار النتيجة.',
                        declare_final: '✓ تم إعلان الحكم باتاً واختتامه في السجل.',
                    };
                    showLegalToast(successByVariant[variant], 5000);
                    setCassationAppealModal(null);
                    return null;
                }}
            />

            <JudicialCassationResultModal
                open={Boolean(cassationResultContext)}
                decision={cassationResultContext?.decision ?? null}
                appeal={cassationResultContext?.appeal ?? null}
                parties={activeParties}
                onClose={() => setCassationResultContext(null)}
                onSubmit={(payload) => {
                    if (!cassationResultContext) return;
                    const err = recordJudicialAppealResult(
                        id,
                        cassationResultContext.decision.id,
                        cassationResultContext.appeal.id,
                        payload,
                    );
                    if (err) {
                        showLegalToast(err, 5000);
                        return;
                    }
                    showLegalToast('✓ تم تسجيل نتيجة الطعن التمييزي — القرار محصن ولا يُعاد فتحه.', 5000);
                    setCassationResultContext(null);
                }}
            />

            <SendToCassationModal
                open={isSendToCassationOpen}
                availableCassationFilingTypes={availableCassationFilingTypes}
                cassationType={cassationType}
                setCassationType={setCassationType}
                cassationInterventionBasis={cassationInterventionBasis}
                setCassationInterventionBasis={setCassationInterventionBasis}
                cassationNumber={cassationNumber}
                setCassationNumber={setCassationNumber}
                cassationPanelName={cassationPanelName}
                setCassationPanelName={setCassationPanelName}
                defendants={defendants}
                cassationAppellantIds={cassationAppellantIds}
                setCassationAppellantIds={setCassationAppellantIds}
                onClose={() => setIsSendToCassationOpen(false)}
                onSubmit={submitSendToCassation}
            />

            <VerdictCassationFilingModal
                open={Boolean(verdictCassationFilingCard)}
                card={verdictCassationFilingCard}
                caseStage={
                    effectiveUiStage === 'felony' || effectiveUiStage === 'misdemeanor'
                        ? effectiveUiStage
                        : caseStage
                }
                currentAccusationArticle={
                    criminalCase.currentAccusationArticle ?? criminalCase.basics.legalArticle
                }
                crimeType={criminalCase.basics.crimeType}
                readOnly={isDecisionsTabMaterialReadOnly}
                onClose={() => setVerdictCassationFilingCard(null)}
                onSave={(patch) => {
                    if (!verdictCassationFilingCard) return;
                    patchVerdictCardOrdinaryAppeal(id, verdictCassationFilingCard.id, patch);
                    setVerdictCassationFilingCard(null);
                }}
            />
        </>
    );
}
