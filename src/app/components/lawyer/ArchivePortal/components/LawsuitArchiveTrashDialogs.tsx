import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2 } from '@/app/components/ui/icons/Trash2';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { unpinWorkspaceItem } from '@/app/workspace/unpinWorkspaceEntity';
import { LAWSUIT_VAULT_TEST_IDS } from '@/app/components/lawyer/smart-modal/smartFile/lawsuitVaultTestIds';
import {
    beginLawsuitVaultCommitHold,
    endLawsuitVaultCommitHold,
} from '@/app/runtime/lawsuitVaultCommitHold';
import { recordLawsuitLifecycleE2e } from '@/app/runtime/lawsuitLifecycleE2eProbe';
import type { LooseArchiveFile } from '../types';
import { ArchivePortalConfirmDialog } from './ArchivePortalConfirmDialog';

const CONFIRM_DANGER =
    'inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-xl border border-rose-500/35 bg-rose-600/15 text-rose-100 text-sm font-bold hover:bg-rose-600/25 touch-manipulation';

const TRASH_FAIL_MESSAGE =
    'تعذّر تثبيت النقل إلى المهملات على القرص. أعد المحاولة بعد لحظات.';

export type LawsuitArchiveTrashDialogsProps = {
    lawsuitTrashConfirmTarget: LooseArchiveFile | null;
    setLawsuitTrashConfirmTarget: (f: LooseArchiveFile | null) => void;
    criminalDeleteTarget: { id: string; title: string } | null;
    setCriminalDeleteTarget: (t: { id: string; title: string } | null) => void;
    permanentDeleteOpen: boolean;
    setPermanentDeleteOpen: (v: boolean) => void;
    confirmPermanentDelete: () => void | Promise<boolean>;
    permanentIdsRef: React.MutableRefObject<Array<string | number>>;
    onMoveLawsuitToTrash?: (
        id: string | number,
    ) => void | boolean | Promise<void | boolean>;
    onDeleteCriminalCase?: (id: string) => boolean | void;
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
    const moveRef = useRef(onMoveLawsuitToTrash);
    moveRef.current = onMoveLawsuitToTrash;
    const permanentDeleteRef = useRef(confirmPermanentDelete);
    permanentDeleteRef.current = confirmPermanentDelete;
    const trashTargetIdRef = useRef<string | number | null>(null);
    trashTargetIdRef.current = lawsuitTrashConfirmTarget?.id ?? null;

    const [trashCommitPhase, setTrashCommitPhase] = useState<'idle' | 'pending' | 'ok' | 'fail'>(
        'idle',
    );

    useLayoutEffect(() => {
        setTrashCommitPhase('idle');
    }, [lawsuitTrashConfirmTarget?.id]);

    const hasLayer =
        (lawsuitTrashConfirmTarget && onMoveLawsuitToTrash) ||
        (criminalDeleteTarget && onDeleteCriminalCase) ||
        permanentDeleteOpen;

    useLayoutEffect(() => {
        if (!hasLayer) return undefined;
        beginLawsuitVaultCommitHold();
        return () => {
            endLawsuitVaultCommitHold();
        };
    }, [hasLayer]);

    if (!hasLayer || typeof document === 'undefined') return null;

    const trashConfirmLabel =
        trashCommitPhase === 'pending'
            ? 'جاري النقل…'
            : trashCommitPhase === 'fail'
              ? 'إعادة المحاولة'
              : 'تأكيد النقل إلى السلة';

    const layer = (
        <>
            {lawsuitTrashConfirmTarget && onMoveLawsuitToTrash ? (
                <ArchivePortalConfirmDialog
                    open
                    title="تأكيد النقل إلى سلة المهملات"
                    titleId="lawsuit-trash-confirm-title"
                    testId={LAWSUIT_VAULT_TEST_IDS.trashConfirmDialog}
                    confirmLabel={trashConfirmLabel}
                    confirmTestId={LAWSUIT_VAULT_TEST_IDS.trashConfirmSubmit}
                    commitPhase={trashCommitPhase}
                    failMessage={TRASH_FAIL_MESSAGE}
                    onCancel={() => {
                        if (trashCommitPhase === 'pending') return;
                        setLawsuitTrashConfirmTarget(null);
                    }}
                    onConfirm={async () => {
                        const id = trashTargetIdRef.current ?? lawsuitTrashConfirmTarget.id;
                        if (id === undefined || id === null || id === '') return false;
                        const move = moveRef.current;
                        if (!move) return false;
                        recordLawsuitLifecycleE2e('ui-confirm', { kind: 'trash', ids: String(id) });
                        setTrashCommitPhase('pending');
                        try {
                            const result = await move(id);
                            if (result !== true) {
                                recordLawsuitLifecycleE2e('ui-fail', {
                                    kind: 'trash',
                                    ids: String(id),
                                });
                                setTrashCommitPhase('fail');
                                SmartToast.error(TRASH_FAIL_MESSAGE);
                                return false;
                            }
                            setTrashCommitPhase('ok');
                            unpinWorkspaceItem(id, 'lawsuit');
                            setLawsuitTrashConfirmTarget(null);
                            return true;
                        } catch {
                            recordLawsuitLifecycleE2e('ui-fail', {
                                kind: 'trash',
                                ids: String(id),
                                reason: 'throw',
                            });
                            setTrashCommitPhase('fail');
                            SmartToast.error(TRASH_FAIL_MESSAGE);
                            return false;
                        }
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
                    testId={LAWSUIT_VAULT_TEST_IDS.criminalDeleteDialog}
                    confirmLabel="حذف نهائي"
                    confirmTestId={LAWSUIT_VAULT_TEST_IDS.criminalDeleteConfirm}
                    onCancel={() => setCriminalDeleteTarget(null)}
                    onConfirm={() => {
                        const ok = onDeleteCriminalCase(criminalDeleteTarget.id);
                        if (ok === false) return;
                        unpinWorkspaceItem(criminalDeleteTarget.id, 'criminal');
                        setCriminalDeleteTarget(null);
                    }}
                    confirmClassName={CONFIRM_DANGER}
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
                    testId={LAWSUIT_VAULT_TEST_IDS.permanentDeleteDialog}
                    confirmLabel="حذف نهائي الآن"
                    confirmTestId={LAWSUIT_VAULT_TEST_IDS.permanentDeleteConfirm}
                    cancelLabel="إلغاء والاحتفاظ في السلة"
                    onCancel={() => setPermanentDeleteOpen(false)}
                    onConfirm={async () => {
                        const result = await permanentDeleteRef.current();
                        return result === true;
                    }}
                    confirmClassName={CONFIRM_DANGER}
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
