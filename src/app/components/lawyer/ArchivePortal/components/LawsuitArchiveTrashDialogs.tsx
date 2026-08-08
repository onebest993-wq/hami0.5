import React from 'react';
import { createPortal } from 'react-dom';
import { Trash2 } from '@/app/components/ui/lucideIcons';
import { unpinWorkspaceItem } from '@/app/workspace/unpinWorkspaceEntity';
import { CIVIL_LAWSUIT_TEST_IDS } from '@/app/components/lawyer/smart-modal/smartFile/civilLawsuitTestIds';
import { URGENT_DOSSIER_BTN_PRIMARY } from '@/app/components/lawyer/Dashboard_Active_Order_File/layout/urgentDossierUi';
import type { LooseArchiveFile } from '../types';
import { ArchivePortalConfirmDialog } from './ArchivePortalConfirmDialog';

export type LawsuitArchiveTrashDialogsProps = {
    lawsuitTrashConfirmTarget: LooseArchiveFile | null;
    setLawsuitTrashConfirmTarget: (f: LooseArchiveFile | null) => void;
    criminalDeleteTarget: { id: string; title: string } | null;
    setCriminalDeleteTarget: (t: { id: string; title: string } | null) => void;
    permanentDeleteOpen: boolean;
    setPermanentDeleteOpen: (v: boolean) => void;
    confirmPermanentDelete: () => void;
    permanentIdsRef: React.MutableRefObject<Array<string | number>>;
    onMoveLawsuitToTrash?: (id: string | number) => void;
    onDeleteCriminalCase?: (id: string) => void;
};

function lawsuitArchiveFileLabel(file: LooseArchiveFile): string {
    return String(file.caseNo || file.caseNumber || '—').trim() || '—';
}

export function LawsuitArchiveTrashDialogs({
    lawsuitTrashConfirmTarget,
    setLawsuitTrashConfirmTarget,
    criminalDeleteTarget,
    setCriminalDeleteTarget,
    permanentDeleteOpen,
    setPermanentDeleteOpen,
    confirmPermanentDelete,
    permanentIdsRef,
    onMoveLawsuitToTrash,
    onDeleteCriminalCase,
}: LawsuitArchiveTrashDialogsProps) {
    const hasLayer =
        (lawsuitTrashConfirmTarget && onMoveLawsuitToTrash) ||
        (criminalDeleteTarget && onDeleteCriminalCase) ||
        permanentDeleteOpen;

    if (!hasLayer || typeof document === 'undefined') return null;

    const layer = (
        <>
            {lawsuitTrashConfirmTarget && onMoveLawsuitToTrash ? (
                <ArchivePortalConfirmDialog
                    open
                    title="تأكيد النقل إلى سلة المهملات"
                    titleId="lawsuit-trash-confirm-title"
                    testId={CIVIL_LAWSUIT_TEST_IDS.trashConfirmDialog}
                    confirmLabel="تأكيد النقل إلى السلة"
                    confirmTestId={CIVIL_LAWSUIT_TEST_IDS.trashConfirmSubmit}
                    onCancel={() => setLawsuitTrashConfirmTarget(null)}
                    onConfirm={() => {
                        const id = lawsuitTrashConfirmTarget.id;
                        if (id === undefined || id === null || id === '') return;
                        onMoveLawsuitToTrash(id);
                        setLawsuitTrashConfirmTarget(null);
                    }}
                >
                    <p>
                        سيتم نقل إضبارة الدعوى إلى سلة المهملات. تبقى هناك حتى تحذفها نهائياً بنفسك،
                        ويمكنك استرجاعها في أي وقت.
                    </p>
                    <p className="text-[#E6C673]/85 text-xs">
                        رقم الإضبارة:{' '}
                        <span className="font-mono tabular-nums">
                            {lawsuitArchiveFileLabel(lawsuitTrashConfirmTarget)}
                        </span>
                    </p>
                </ArchivePortalConfirmDialog>
            ) : null}

            {criminalDeleteTarget && onDeleteCriminalCase ? (
                <ArchivePortalConfirmDialog
                    open
                    title="تأكيد حذف الإضبارة الجزائية"
                    titleId="lawsuit-criminal-delete-title"
                    testId={CIVIL_LAWSUIT_TEST_IDS.criminalDeleteDialog}
                    confirmLabel="حذف نهائي"
                    confirmTestId={CIVIL_LAWSUIT_TEST_IDS.criminalDeleteConfirm}
                    onCancel={() => setCriminalDeleteTarget(null)}
                    onConfirm={() => {
                        onDeleteCriminalCase(criminalDeleteTarget.id);
                        unpinWorkspaceItem(criminalDeleteTarget.id, 'criminal');
                        setCriminalDeleteTarget(null);
                    }}
                    confirmClassName={`${URGENT_DOSSIER_BTN_PRIMARY} border-rose-500/35 bg-rose-600/15 text-rose-100 hover:bg-rose-600/25`}
                >
                    <p className="text-white/55 text-xs truncate">{criminalDeleteTarget.title}</p>
                    <p>سيتم حذف الإضبارة وكل بياناتها المرتبطة نهائياً من هذا الجهاز.</p>
                </ArchivePortalConfirmDialog>
            ) : null}

            {permanentDeleteOpen ? (
                <ArchivePortalConfirmDialog
                    open
                    title={
                        <>
                            <Trash2 size={18} className="text-rose-300" />
                            تأكيد الحذف النهائي
                        </>
                    }
                    titleId="lawsuit-permanent-delete-title"
                    testId={CIVIL_LAWSUIT_TEST_IDS.permanentDeleteDialog}
                    confirmLabel="حذف نهائي الآن"
                    confirmTestId={CIVIL_LAWSUIT_TEST_IDS.permanentDeleteConfirm}
                    cancelLabel="إلغاء والاحتفاظ في السلة"
                    onCancel={() => setPermanentDeleteOpen(false)}
                    onConfirm={confirmPermanentDelete}
                    confirmClassName={`${URGENT_DOSSIER_BTN_PRIMARY} border-rose-500/35 bg-rose-600/15 text-rose-100 hover:bg-rose-600/25`}
                >
                    <p>
                        سيتم حذف {permanentIdsRef.current.length} إضبارة دعوى نهائياً من هذا الجهاز. لا
                        يمكن التراجع بعد التأكيد.
                    </p>
                </ArchivePortalConfirmDialog>
            ) : null}
        </>
    );

    return createPortal(layer, document.body);
}
