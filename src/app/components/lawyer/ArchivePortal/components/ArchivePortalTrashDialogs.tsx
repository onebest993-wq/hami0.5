import React from 'react';
import { createPortal } from 'react-dom';
import { Archive, Trash2 } from 'lucide-react';
import { unpinWorkspaceItem } from '@/app/workspace/unpinWorkspaceEntity';
import { CIVIL_LAWSUIT_TEST_IDS } from '@/app/components/lawyer/smart-modal/smartFile/civilLawsuitTestIds';
import {
    URGENT_DOSSIER_BTN_GHOST,
    URGENT_DOSSIER_BTN_PRIMARY,
    URGENT_DOSSIER_DIALOG_OVERLAY,
    URGENT_DOSSIER_DIALOG_PANEL,
    URGENT_DOSSIER_SECTION_TITLE,
} from '@/app/components/lawyer/Dashboard_Active_Order_File/layout/urgentDossierUi';
import type { LooseArchiveFile } from '../types';

export type ArchivePortalTrashDialogsProps = {
    type: string;
    trashConfirmTarget: LooseArchiveFile | null;
    setTrashConfirmTarget: (f: LooseArchiveFile | null) => void;
    archiveConfirmTarget: LooseArchiveFile | null;
    setArchiveConfirmTarget: (f: LooseArchiveFile | null) => void;
    onArchiveExecution?: (id: string | number) => void;
    lawsuitTrashConfirmTarget: LooseArchiveFile | null;
    setLawsuitTrashConfirmTarget: (f: LooseArchiveFile | null) => void;
    criminalDeleteTarget: { id: string; title: string } | null;
    setCriminalDeleteTarget: (t: { id: string; title: string } | null) => void;
    permanentDeleteOpen: boolean;
    setPermanentDeleteOpen: (v: boolean) => void;
    confirmPermanentDelete: () => void;
    permanentIdsRef: React.MutableRefObject<Array<string | number>>;
    onMoveExecutionToTrash?: (id: string | number) => void;
    onMoveLawsuitToTrash?: (id: string | number) => void;
    onDeleteCriminalCase?: (id: string) => void;
};

function executionArchiveFileLabel(file: LooseArchiveFile): string {
    const num = String(file.fileNumber || file.caseNo || '').trim() || '—';
    const year = String(file.fileYear ?? file.year ?? '').trim();
    return year ? `${num} / ${year}` : num;
}

function lawsuitArchiveFileLabel(file: LooseArchiveFile): string {
    return String(file.caseNo || file.caseNumber || '—').trim() || '—';
}

type ArchivePortalConfirmDialogProps = {
    open: boolean;
    title: React.ReactNode;
    titleId: string;
    testId?: string;
    children: React.ReactNode;
    cancelLabel?: string;
    confirmLabel: string;
    confirmTestId?: string;
    onCancel: () => void;
    onConfirm: () => void;
    confirmClassName?: string;
};

function ArchivePortalConfirmDialog({
    open,
    title,
    titleId,
    testId,
    children,
    cancelLabel = 'إلغاء',
    confirmLabel,
    confirmTestId,
    onCancel,
    onConfirm,
    confirmClassName,
}: ArchivePortalConfirmDialogProps) {
    if (!open) return null;

    return (
        <div className={URGENT_DOSSIER_DIALOG_OVERLAY} onClick={onCancel} role="presentation">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                data-testid={testId}
                className={URGENT_DOSSIER_DIALOG_PANEL}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
            >
                <div id={titleId} className={`${URGENT_DOSSIER_SECTION_TITLE} flex flex-row-reverse items-center justify-end gap-2`}>
                    {title}
                </div>
                <div className="mt-2 space-y-2 text-white/75 text-sm leading-relaxed">{children}</div>
                <div className="mt-4 flex items-center justify-end gap-2 flex-wrap">
                    <button type="button" onClick={(e) => { e.stopPropagation(); onCancel(); }} className={URGENT_DOSSIER_BTN_GHOST}>
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        data-testid={confirmTestId}
                        onClick={(e) => {
                            e.stopPropagation();
                            onConfirm();
                        }}
                        className={confirmClassName ?? URGENT_DOSSIER_BTN_PRIMARY}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function ArchivePortalTrashDialogs({
    type,
    trashConfirmTarget,
    setTrashConfirmTarget,
    archiveConfirmTarget,
    setArchiveConfirmTarget,
    onArchiveExecution,
    lawsuitTrashConfirmTarget,
    setLawsuitTrashConfirmTarget,
    criminalDeleteTarget,
    setCriminalDeleteTarget,
    permanentDeleteOpen,
    setPermanentDeleteOpen,
    confirmPermanentDelete,
    permanentIdsRef,
    onMoveExecutionToTrash,
    onMoveLawsuitToTrash,
    onDeleteCriminalCase,
}: ArchivePortalTrashDialogsProps) {
    const hasLayer =
        (type === 'executions' && trashConfirmTarget && onMoveExecutionToTrash) ||
        (type === 'executions' && archiveConfirmTarget && onArchiveExecution) ||
        (type === 'lawsuits' && lawsuitTrashConfirmTarget && onMoveLawsuitToTrash) ||
        (criminalDeleteTarget && onDeleteCriminalCase) ||
        permanentDeleteOpen;

    if (!hasLayer || typeof document === 'undefined') return null;

    const permanentDialogTestId =
        type === 'lawsuits'
            ? CIVIL_LAWSUIT_TEST_IDS.permanentDeleteDialog
            : 'execution-permanent-delete-dialog';
    const permanentConfirmTestId =
        type === 'lawsuits'
            ? CIVIL_LAWSUIT_TEST_IDS.permanentDeleteConfirm
            : 'execution-permanent-delete-confirm';

    const layer = (
        <>
            {type === 'executions' && trashConfirmTarget && onMoveExecutionToTrash ? (
                <ArchivePortalConfirmDialog
                    open
                    title="تأكيد النقل إلى سلة المهملات"
                    titleId="execution-trash-confirm-title"
                    testId="execution-trash-confirm-dialog"
                    confirmLabel="تأكيد النقل إلى السلة"
                    confirmTestId="execution-trash-confirm-submit"
                    onCancel={() => setTrashConfirmTarget(null)}
                    onConfirm={() => {
                        const id = trashConfirmTarget.id;
                        if (id === undefined || id === null || id === '') return;
                        onMoveExecutionToTrash(id);
                        setTrashConfirmTarget(null);
                    }}
                >
                    <p>
                        سيتم نقل الإضبارة إلى سلة المهملات. تبقى هناك 30 يوماً ويمكنك استرجاعها خلالها؛
                        بعدها تُحذف نهائياً تلقائياً من هذا الجهاز.
                    </p>
                    <p className="text-[#E6C673]/85 text-xs">
                        رقم الإضبارة:{' '}
                        <span className="font-mono tabular-nums">{executionArchiveFileLabel(trashConfirmTarget)}</span>
                    </p>
                </ArchivePortalConfirmDialog>
            ) : null}

            {type === 'executions' && archiveConfirmTarget && onArchiveExecution ? (
                <ArchivePortalConfirmDialog
                    open
                    title={
                        <>
                            <Archive size={18} className="text-[#E6C673]" />
                            تأكيد الأرشفة
                        </>
                    }
                    titleId="execution-archive-confirm-title"
                    testId="execution-archive-confirm-dialog"
                    confirmLabel="تأكيد الأرشفة"
                    confirmTestId="execution-archive-confirm-submit"
                    onCancel={() => setArchiveConfirmTarget(null)}
                    onConfirm={() => {
                        const id = archiveConfirmTarget.id;
                        if (id === undefined || id === null || id === '') return;
                        onArchiveExecution(id);
                        setArchiveConfirmTarget(null);
                    }}
                >
                    <p>
                        ستُنقل الإضبارة إلى مخزن الأرشيف وتختفي من القائمة النشطة. يمكنك استرجاعها
                        لاحقاً من تبويب «مخزن الأرشيف».
                    </p>
                    <p className="text-[#E6C673]/85 text-xs">
                        رقم الإضبارة:{' '}
                        <span className="font-mono tabular-nums">{executionArchiveFileLabel(archiveConfirmTarget)}</span>
                    </p>
                </ArchivePortalConfirmDialog>
            ) : null}

            {type === 'lawsuits' && lawsuitTrashConfirmTarget && onMoveLawsuitToTrash ? (
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
                        <span className="font-mono tabular-nums">{lawsuitArchiveFileLabel(lawsuitTrashConfirmTarget)}</span>
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

            {(type === 'executions' || type === 'lawsuits') && permanentDeleteOpen ? (
                <ArchivePortalConfirmDialog
                    open
                    title={
                        <>
                            <Trash2 size={18} className="text-rose-300" />
                            تأكيد الحذف النهائي
                        </>
                    }
                    titleId="archive-permanent-delete-title"
                    testId={permanentDialogTestId}
                    confirmLabel="حذف نهائي الآن"
                    confirmTestId={permanentConfirmTestId}
                    cancelLabel="إلغاء والاحتفاظ في السلة"
                    onCancel={() => setPermanentDeleteOpen(false)}
                    onConfirm={confirmPermanentDelete}
                    confirmClassName={`${URGENT_DOSSIER_BTN_PRIMARY} border-rose-500/35 bg-rose-600/15 text-rose-100 hover:bg-rose-600/25`}
                >
                    <p>
                        سيتم حذف {permanentIdsRef.current.length}{' '}
                        {type === 'lawsuits' ? 'إضبارة دعوى' : 'إضبارة تنفيذ'} نهائياً من هذا الجهاز. لا
                        يمكن التراجع بعد التأكيد.
                    </p>
                </ArchivePortalConfirmDialog>
            ) : null}
        </>
    );

    return createPortal(layer, document.body);
}
