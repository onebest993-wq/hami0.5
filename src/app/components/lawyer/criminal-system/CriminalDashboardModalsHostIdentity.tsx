import type { CriminalDashboardModalsHostProps } from './criminalDashboardModalsHostProps';
import {
    PartyIdentityCorrectionModal,
    VenueIdentityCorrectionModal,
    ConfirmActionModal,
} from './criminalDashboardLazyModals';
import { CriminalCaseTrashModal } from './criminalDashboardCaseFlowLazyModals';

export type CriminalDashboardModalsHostIdentityProps = Pick<
    CriminalDashboardModalsHostProps,
    | 'id'
    | 'criminalCase'
    | 'activeLegalArticle'
    | 'isTimelineArchiveReadOnly'
    | 'isDashboardReadOnly'
    | 'canManageDossier'
    | 'showLegalToast'
    | 'identityEdit'
    | 'setIdentityEdit'
    | 'identityEditError'
    | 'setIdentityEditError'
    | 'correctCasePartyName'
    | 'showEditInvestigationCourt'
    | 'showEditTrialCourt'
    | 'showEditDeposition'
    | 'depositEntityName'
    | 'isTrialPhase'
    | 'correctCaseLegalArticle'
    | 'correctCaseCourtName'
    | 'correctCaseDepositionLocation'
    | 'correctCaseReferenceNumbers'
    | 'isTrashModalOpen'
    | 'setIsTrashModalOpen'
    | 'trashItems'
    | 'restoreTrashItem'
    | 'purgeTrashItem'
    | 'setConfirmAction'
    | 'confirmAction'
    | 'runConfirmAction'
    | 'closeConfirmAction'
>;

/**
 * مودالات تصحيح الهوية/الموقع، سلة المهملات، وتأكيد العمليات العامة.
 */
export function CriminalDashboardModalsHostIdentity({
    id,
    criminalCase,
    activeLegalArticle,
    isTimelineArchiveReadOnly,
    isDashboardReadOnly,
    canManageDossier,
    showLegalToast,
    identityEdit,
    setIdentityEdit,
    identityEditError,
    setIdentityEditError,
    correctCasePartyName,
    showEditInvestigationCourt,
    showEditTrialCourt,
    showEditDeposition,
    depositEntityName,
    isTrialPhase,
    correctCaseLegalArticle,
    correctCaseCourtName,
    correctCaseDepositionLocation,
    correctCaseReferenceNumbers,
    isTrashModalOpen,
    setIsTrashModalOpen,
    trashItems,
    restoreTrashItem,
    purgeTrashItem,
    setConfirmAction,
    confirmAction,
    runConfirmAction,
    closeConfirmAction,
}: CriminalDashboardModalsHostIdentityProps) {
    return (
        <>
            <PartyIdentityCorrectionModal
                open={identityEdit?.mode === 'party'}
                partyKind={identityEdit?.mode === 'party' ? identityEdit.kind : 'complainant'}
                fullName={identityEdit?.mode === 'party' ? identityEdit.fullName : ''}
                phone={identityEdit?.mode === 'party' ? identityEdit.phone : ''}
                address={identityEdit?.mode === 'party' ? identityEdit.address : ''}
                error={identityEditError}
                onClose={() => {
                    setIdentityEdit(null);
                    setIdentityEditError('');
                }}
                onSubmit={({ newFullName, newPhone, newAddress, reason }) => {
                    if (identityEdit?.mode !== 'party') return;
                    const err = correctCasePartyName(id, {
                        partyKind: identityEdit.kind,
                        partyId: identityEdit.id,
                        newFullName,
                        newPhone,
                        newAddress,
                        reason,
                    });
                    if (err) {
                        setIdentityEditError(err);
                        return;
                    }
                    setIdentityEdit(null);
                    setIdentityEditError('');
                }}
            />

            <VenueIdentityCorrectionModal
                open={identityEdit?.mode === 'venue'}
                error={identityEditError}
                showInvestigationCourt={showEditInvestigationCourt}
                investigationCourtName={criminalCase.location.investigationCourtName}
                showTrialCourt={showEditTrialCourt}
                trialCourtName={criminalCase.location.courtName}
                showDeposition={showEditDeposition}
                papersAt={
                    criminalCase.location.investigationPapersAt === 'مكتب تحقيق قضائي'
                        ? 'مكتب تحقيق قضائي'
                        : 'مركز شرطة'
                }
                depositionEntityName={depositEntityName}
                legalArticle={activeLegalArticle}
                showLegalArticle={canManageDossier && !isTimelineArchiveReadOnly}
                showReferenceNumbers={canManageDossier && !isTimelineArchiveReadOnly && isTrialPhase}
                courtCaseNumber={String(
                    criminalCase.courtCaseNumber ?? criminalCase.location.caseNumber ?? '',
                ).trim()}
                publicProsecutionNumber={String(
                    criminalCase.location.publicProsecutionNumber ?? '',
                ).trim()}
                onClose={() => {
                    setIdentityEdit(null);
                    setIdentityEditError('');
                }}
                onSubmit={({
                    investigationCourtName,
                    trialCourtName,
                    papersAt,
                    depositionEntityName,
                    legalArticle,
                    courtCaseNumber,
                    publicProsecutionNumber,
                    reason,
                }) => {
                    let err: string | null = null;
                    if (legalArticle) {
                        err = correctCaseLegalArticle(id, { newArticle: legalArticle, reason });
                    }
                    if (!err && investigationCourtName) {
                        err = correctCaseCourtName(id, {
                            newCourtName: investigationCourtName,
                            reason,
                            scope: 'investigation',
                        });
                    }
                    if (!err && trialCourtName) {
                        err = correctCaseCourtName(id, {
                            newCourtName: trialCourtName,
                            reason,
                            scope: 'trial',
                        });
                    }
                    if (!err && papersAt && depositionEntityName) {
                        err = correctCaseDepositionLocation(id, {
                            papersAt,
                            entityName: depositionEntityName,
                            reason,
                        });
                    }
                    if (
                        !err &&
                        (courtCaseNumber !== undefined || publicProsecutionNumber !== undefined)
                    ) {
                        err = correctCaseReferenceNumbers(id, {
                            ...(courtCaseNumber !== undefined ? { courtCaseNumber } : {}),
                            ...(publicProsecutionNumber !== undefined
                                ? { publicProsecutionNumber }
                                : {}),
                            reason,
                        });
                    }
                    if (err) {
                        setIdentityEditError(err);
                        return;
                    }
                    setIdentityEdit(null);
                    setIdentityEditError('');
                }}
            />

            <CriminalCaseTrashModal
                open={isTrashModalOpen}
                items={trashItems}
                readOnly={isTimelineArchiveReadOnly || isDashboardReadOnly}
                onClose={() => setIsTrashModalOpen(false)}
                onRestore={(trashItemId) => {
                    const err = restoreTrashItem(id, trashItemId);
                    if (err) {
                        showLegalToast(err, 4500);
                        return;
                    }
                    showLegalToast('✓ تم استرجاع العنصر.', 4000);
                }}
                onPurge={(trashItemId) => {
                    setConfirmAction({
                        title: 'حذف نهائي',
                        message: 'لن يمكن استرجاع هذا العنصر بعد الحذف النهائي.',
                        confirmText: 'حذف نهائي',
                        onConfirm: () => {
                            const err = purgeTrashItem(id, trashItemId);
                            if (err) {
                                showLegalToast(err, 4500);
                            }
                        },
                    });
                }}
            />

            <ConfirmActionModal
                open={Boolean(confirmAction)}
                title={confirmAction?.title}
                message={confirmAction?.message ?? ''}
                confirmText={confirmAction?.confirmText}
                cancelText={confirmAction?.cancelText}
                onConfirm={runConfirmAction}
                onCancel={closeConfirmAction}
            />
        </>
    );
}
