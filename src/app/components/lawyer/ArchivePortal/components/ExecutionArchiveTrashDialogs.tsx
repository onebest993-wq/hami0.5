import React, { useContext, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ExecutionArchiveBoxMark, ExecutionArchiveTrashMark } from '../executionArchiveMarks';
import { URGENT_DOSSIER_BTN_PRIMARY } from '@/app/components/lawyer/Dashboard_Active_Order_File/layout/urgentDossierUi';
import { ExecutionArchiveHostOpenContext } from '@/app/components/lawyer/dashboard/executionArchiveHostOpenContext';
import {
    EXECUTION_ARCHIVE_TRASH_DIALOGS_LAYER_TEST_ID,
} from '../executionArchiveTrashDialogsLayer';
import type { LooseArchiveFile } from '../types';
import { ArchivePortalConfirmDialog } from './ArchivePortalConfirmDialog';

export type ExecutionArchiveTrashDialogsProps = {
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
    const hostOpen = useContext(ExecutionArchiveHostOpenContext);

    useEffect(() => {
        if (hostOpen) return;
        setTrashConfirmTarget(null);
        setArchiveConfirmTarget(null);
        setPermanentDeleteOpen(false);
    }, [hostOpen, setTrashConfirmTarget, setArchiveConfirmTarget, setPermanentDeleteOpen]);

    const hasLayer =
        (trashConfirmTarget && onMoveExecutionToTrash) ||
        (archiveConfirmTarget && onArchiveExecution) ||
        permanentDeleteOpen;

    if (!hostOpen || !hasLayer) return null;
    if (typeof document === 'undefined') return null;

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
                    cancelTestId="execution-trash-confirm-cancel"
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
                            <ExecutionArchiveBoxMark size={18} className="text-[#E6C673]" />
                            تأكيد الأرشفة
                        </>
                    }
                    titleId="execution-archive-confirm-title"
                    testId="execution-archive-confirm-dialog"
                    confirmLabel="تأكيد الأرشفة"
                    confirmTestId="execution-archive-confirm-submit"
                    cancelTestId="execution-archive-confirm-cancel"
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
                            <ExecutionArchiveTrashMark size={18} className="text-rose-300" />
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

    return createPortal(
        <div
            className="pointer-events-none fixed inset-0"
            style={{ zIndex: 10050 }}
            data-testid={EXECUTION_ARCHIVE_TRASH_DIALOGS_LAYER_TEST_ID}
        >
            <div className="pointer-events-auto">{layer}</div>
        </div>,
        document.body,
    );
}
