import type { CriminalDashboardModalsHostProps } from './criminalDashboardModalsHostProps';
import { hasIdentifiedDefendant } from './criminalUnknownDefendant';
import {
    resolveEffectiveDefendantScopeIds,
    shouldShowDefendantDecisionScopePicker,
} from './partyPersonalStage';
import {
    InvestigationDecisionModal,
    CriminalStatementModal,
    MergeCaseModal,
    LegalArticleEditModal,
    ReopenCaseModal,
} from './criminalDashboardLazyModals';
import { SeveranceTargetPickerModal } from './criminalDashboardCaseFlowLazyModals';
import { useCriminalStore } from './criminalStore';

export type CriminalDashboardModalsHostInvestigationProps = Pick<
    CriminalDashboardModalsHostProps,
    | 'id'
    | 'defendants'
    | 'complainants'
    | 'criminalCase'
    | 'isMutualComplaint'
    | 'isInvestigationPhase'
    | 'activeLegalArticle'
    | 'onOpenCase'
    | 'showLegalToast'
    | 'showLegalError'
    | 'isInvestigationDecisionOpen'
    | 'setIsInvestigationDecisionOpen'
    | 'investigationDecisionError'
    | 'setInvestigationDecisionError'
    | 'hasUnrevealedUnknown'
    | 'referInvestigationDefendantToTrial'
    | 'applyInvestigationReferral'
    | 'isSeveranceOpen'
    | 'setIsSeveranceOpen'
    | 'severanceError'
    | 'setSeveranceError'
    | 'investigationDefendantsPartyMix'
    | 'beginSeveranceFromDossier'
    | 'openInlineSeveranceForm'
    | 'isLegalEditOpen'
    | 'setIsLegalEditOpen'
    | 'legalArticleNext'
    | 'setLegalArticleNext'
    | 'legalChangedBy'
    | 'setLegalChangedBy'
    | 'submitLegalEdit'
    | 'activeTab'
    | 'isStatementModalOpen'
    | 'setIsStatementModalOpen'
    | 'editingStatement'
    | 'setEditingStatement'
    | 'statementEligibleDefendants'
    | 'ourRepresentation'
    | 'addStatement'
    | 'updateStatement'
    | 'isReopenCaseOpen'
    | 'setIsReopenCaseOpen'
    | 'reopenCaseReason'
    | 'setReopenCaseReason'
    | 'submitReopenCase'
    | 'isMergeCasesOpen'
    | 'setIsMergeCasesOpen'
    | 'headerTitle'
    | 'mergeTargetCaseId'
    | 'setMergeTargetCaseId'
    | 'mergeReason'
    | 'setMergeReason'
    | 'submitMergeCases'
>;

/**
 * مودالات التحقيق: قرار الإحالة، التفريق، المادة القانونية، الإفادات، إعادة الفتح، الدمج.
 */
export function CriminalDashboardModalsHostInvestigation({
    id,
    defendants,
    complainants,
    criminalCase,
    isMutualComplaint,
    isInvestigationPhase,
    activeLegalArticle,
    onOpenCase,
    showLegalToast,
    showLegalError,
    isInvestigationDecisionOpen,
    setIsInvestigationDecisionOpen,
    investigationDecisionError,
    setInvestigationDecisionError,
    hasUnrevealedUnknown,
    referInvestigationDefendantToTrial,
    applyInvestigationReferral,
    isSeveranceOpen,
    setIsSeveranceOpen,
    severanceError,
    setSeveranceError,
    investigationDefendantsPartyMix,
    beginSeveranceFromDossier,
    openInlineSeveranceForm,
    isLegalEditOpen,
    setIsLegalEditOpen,
    legalArticleNext,
    setLegalArticleNext,
    legalChangedBy,
    setLegalChangedBy,
    submitLegalEdit,
    activeTab,
    isStatementModalOpen,
    setIsStatementModalOpen,
    editingStatement,
    setEditingStatement,
    statementEligibleDefendants,
    ourRepresentation,
    addStatement,
    updateStatement,
    isReopenCaseOpen,
    setIsReopenCaseOpen,
    reopenCaseReason,
    setReopenCaseReason,
    submitReopenCase,
    isMergeCasesOpen,
    setIsMergeCasesOpen,
    headerTitle,
    mergeTargetCaseId,
    setMergeTargetCaseId,
    mergeReason,
    setMergeReason,
    submitMergeCases,
}: CriminalDashboardModalsHostInvestigationProps) {
    return (
        <>
            <InvestigationDecisionModal
                open={isInvestigationDecisionOpen}
                onClose={() => setIsInvestigationDecisionOpen(false)}
                error={investigationDecisionError}
                defendants={defendants}
                crossAccusedComplainants={complainants.filter(
                    (c) => isMutualComplaint || c.isCrossComplaint === true,
                )}
                activeLegalArticle={activeLegalArticle}
                publicProsecutionNumber={criminalCase.location.publicProsecutionNumber}
                onSubmitReferral={(payload) => {
                    if (hasUnrevealedUnknown && !hasIdentifiedDefendant(defendants)) {
                        setInvestigationDecisionError(
                            'لا يمكن إحالة إضبارة بلا متهم معروف — أكّد هوية متهم واحد على الأقل عبر «كشف الهوية».',
                        );
                        return;
                    }
                    const scopedIds = resolveEffectiveDefendantScopeIds(defendants, payload.defendantIds ?? [])
                        .filter((defId) => defendants.some((d) => d.id === defId));
                    if (shouldShowDefendantDecisionScopePicker(defendants) && !scopedIds.length) {
                        setInvestigationDecisionError('حدّد متهماً واحداً على الأقل مشمولاً بالإحالة.');
                        return;
                    }
                    const allCaseDefIds = defendants.map((d) => d.id);
                    const remainingOnCase = allCaseDefIds.filter((defId) => !scopedIds.includes(defId));
                    const isPartialReferral = scopedIds.length > 0 && remainingOnCase.length > 0;
                    const referralPayload = { ...payload, defendantIds: scopedIds };

                    setInvestigationDecisionError('');
                    if (isPartialReferral) {
                        const childId = referInvestigationDefendantToTrial(id, referralPayload);
                        if (!childId) {
                            setInvestigationDecisionError(
                                'تعذّر إتمام الإحالة — تحقق من المتهمين النشطين والمحكمة.',
                            );
                            return;
                        }
                        setIsInvestigationDecisionOpen(false);
                        showLegalToast('✓ تمت الإحالة وإنشاء إضبارة المحكمة المختصة.', 5000);
                        onOpenCase?.(childId);
                        return;
                    }

                    applyInvestigationReferral(id, referralPayload);
                    setIsInvestigationDecisionOpen(false);
                    showLegalToast('✓ تمت الإحالة إلى محكمة الموضوع.', 5000);
                }}
            />

            <SeveranceTargetPickerModal
                open={isSeveranceOpen}
                onClose={() => {
                    setIsSeveranceOpen(false);
                    setSeveranceError('');
                }}
                defendants={defendants}
                defendantsPartyMix={investigationDefendantsPartyMix}
                error={severanceError}
                onContinue={(defendantIds, judicialSeveranceDraft) => {
                    const ok = beginSeveranceFromDossier(id, defendantIds, {
                        judicialSeveranceDraft,
                    });
                    if (!ok) {
                        setSeveranceError(
                            'تعذّر بدء عملية التفريق — تحقق من المتهمين المحددين وحالة الإضبارة.',
                        );
                        return;
                    }
                    setIsSeveranceOpen(false);
                    setSeveranceError('');
                    showLegalToast(
                        '✓ تم تجهيز مسار التفريق — أكمل بيانات الإضبارة الجديدة ثم «تنفيذ التفريق وإنشاء الإضبارة».',
                        6000,
                    );
                    openInlineSeveranceForm();
                }}
            />

            <LegalArticleEditModal
                open={isLegalEditOpen}
                legalArticleNext={legalArticleNext}
                setLegalArticleNext={setLegalArticleNext}
                legalChangedBy={legalChangedBy}
                setLegalChangedBy={setLegalChangedBy}
                onClose={() => setIsLegalEditOpen(false)}
                onSubmit={submitLegalEdit}
            />

            <CriminalStatementModal
                isOpen={activeTab === 'statements' && isStatementModalOpen}
                initialStatement={editingStatement}
                complainants={complainants}
                defendants={statementEligibleDefendants}
                ourRepresentation={ourRepresentation}
                isMutualComplaint={isMutualComplaint}
                showDepositionVenuePicker={isInvestigationPhase}
                investigationPapersAt={criminalCase?.location.investigationPapersAt ?? ''}
                onClose={() => {
                    setEditingStatement(null);
                    setIsStatementModalOpen(false);
                }}
                onCreate={(statement) => {
                    try {
                        return addStatement(id, statement);
                    } catch {
                        // إن نجح الحقن في الـ store رغم رمي مشترك لاحق (جسر/تقويم) نعدّه نجاحاً
                        const saved = useCriminalStore
                            .getState()
                            .casesById[id]?.statements?.some((s) => s.id === statement.id);
                        return saved ? null : 'تعذّر حفظ الإفادة.';
                    }
                }}
                onUpdate={(statementId, updatedData) => updateStatement(id, statementId, updatedData)}
                onError={(message) => showLegalError(message)}
            />

            <ReopenCaseModal
                open={isReopenCaseOpen}
                reopenCaseReason={reopenCaseReason}
                setReopenCaseReason={setReopenCaseReason}
                onClose={() => setIsReopenCaseOpen(false)}
                onSubmit={submitReopenCase}
            />

            <MergeCaseModal
                open={isMergeCasesOpen}
                parentCaseId={id}
                parentCaseTitle={headerTitle.primary}
                mergeTargetCaseId={mergeTargetCaseId}
                mergeReason={mergeReason}
                onTargetChange={setMergeTargetCaseId}
                onReasonChange={setMergeReason}
                onClose={() => setIsMergeCasesOpen(false)}
                onSubmit={submitMergeCases}
            />
        </>
    );
}
