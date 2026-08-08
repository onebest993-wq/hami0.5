import React from 'react';
import { createPortal } from 'react-dom';
import { Archive, Trash2 } from '@/app/components/ui/lucideIcons';
import { URGENT_DOSSIER_BTN_PRIMARY } from '@/app/components/lawyer/Dashboard_Active_Order_File/layout/urgentDossierUi';
import type { LooseArchiveFile } from '../types';
import { ArchivePortalConfirmDialog } from './ArchivePortalConfirmDialog';

export type ExecutionArchiveTrashDialogsProps = {
    embedded?: boolean;
    trashConfirmTarget: LooseArchiveFile | null;
    setTrashConfirmTarget: (f: LooseArchiveFile | null) => void;
    archiveConfirmTarget: LooseArchiveFile | null;
    setArchiveConfirmTarget: (f: LooseArchiveFile | null) => void;
    permanentDeleteOpen: boolean;
    setPermanentDeleteOpen: (v: boolean) => void;
    confirmPermanentDelete: () => void;
    permanentIdsRef: React.MutableRefObject<Array<string | number>>;
    onMoveExecutionToTrash?: (id: string | number) => void;
    onArchiveExecution?: (id: string | number) => void;
};

function executionArchiveFileLabel(file: LooseArchiveFile): string {
    const num = String(file.fileNumber || file.caseNo || '').trim() || '—';
    const year = String(file.fileYear ?? file.year ?? '').trim();
    return year ? `${num} / ${year}` : num;
}

export function ExecutionArchiveTrashDialogs({
    embedded = false,
    trashConfirmTarget,
    setTrashConfirmTarget,
    archiveConfirmTarget,
    setArchiveConfirmTarget,
    permanentDeleteOpen,
    setPermanentDeleteOpen,
    confirmPermanentDelete,
    permanentIdsRef,
    onMoveExecutionToTrash,
    onArchiveExecution,
}: ExecutionArchiveTrashDialogsProps) {
    const hasLayer =
        (trashConfirmTarget && onMoveExecutionToTrash) ||
        (archiveConfirmTarget && onArchiveExecution) ||
        permanentDeleteOpen;

    if (!hasLayer) return null;

    const layer = (
        <>
            {trashConfirmTarget && onMoveExecutionToTrash ? (
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
                        <span className="font-mono tabular-nums">
                            {executionArchiveFileLabel(trashConfirmTarget)}
                        </span>
                    </p>
                </ArchivePortalConfirmDialog>
            ) : null}

            {archiveConfirmTarget && onArchiveExecution ? (
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
                        <span className="font-mono tabular-nums">
                            {executionArchiveFileLabel(archiveConfirmTarget)}
                        </span>
                    </p>
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
                    titleId="execution-permanent-delete-title"
                    testId="execution-permanent-delete-dialog"
                    confirmLabel="حذف نهائي الآن"
                    confirmTestId="execution-permanent-delete-confirm"
                    cancelLabel="إلغاء والاحتفاظ في السلة"
                    onCancel={() => setPermanentDeleteOpen(false)}
                    onConfirm={confirmPermanentDelete}
                    confirmClassName={`${URGENT_DOSSIER_BTN_PRIMARY} border-rose-500/35 bg-rose-600/15 text-rose-100 hover:bg-rose-600/25`}
                >
                    <p>
                        سيتم حذف {permanentIdsRef.current.length} إضبارة تنفيذ نهائياً من هذا الجهاز. لا
                        يمكن التراجع بعد التأكيد.
                    </p>
                </ArchivePortalConfirmDialog>
            ) : null}
        </>
    );

    if (embedded) {
        return (
            <div className="pointer-events-none fixed inset-0 z-[500]" data-testid="execution-archive-trash-dialogs-layer">
                <div className="pointer-events-auto">{layer}</div>
            </div>
        );
    }

    if (typeof document === 'undefined') return null;

    return createPortal(layer, document.body);
}
