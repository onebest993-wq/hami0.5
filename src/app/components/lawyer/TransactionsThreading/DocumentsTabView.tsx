import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from '@/app/components/ui/icons/Plus';
import { useTransactionsThreadingStore } from '@/app/modules/transactionsThreading/store';
import type { Transaction, TransactionDocument } from '@/app/modules/transactionsThreading/types';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { DocumentCard } from './DocumentCard';
import { DocumentsAddSheet } from './DocumentsAddSheet';
import { DocumentsDeleteDialog } from './DocumentsDeleteDialog';
import { TX_GOLD_BTN, TX_TEXT_MUTED } from './transactionsGlassTheme';
import type { TransactionsDetailsEscapeSnapshot } from './transactionsEscapeStack';

const EMPTY_DOCS: TransactionDocument[] = [];

export function DocumentsTabView({
    transaction,
    readOnly,
    detailsActive = true,
    onDocumentsEscapeSnapshotChange,
    registerDocumentsEscapeCloser,
}: {
    transaction: Transaction;
    readOnly?: boolean;
    detailsActive?: boolean;
    onDocumentsEscapeSnapshotChange?: (
        snapshot: Pick<TransactionsDetailsEscapeSnapshot, 'addDocumentSheetOpen' | 'deleteDocumentOpen'>,
    ) => void;
    registerDocumentsEscapeCloser?: (
        closer: ((patch: Partial<TransactionsDetailsEscapeSnapshot>) => void) | null,
    ) => void;
}) {
    const documents = useTransactionsThreadingStore((s) => s.documentsByTransactionId[transaction.id] ?? EMPTY_DOCS);
    const addDocument = useTransactionsThreadingStore((s) => s.addDocument);
    const deleteDocument = useTransactionsThreadingStore((s) => s.deleteDocument);

    const [open, setOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<TransactionDocument | null>(null);

    const sorted = useMemo(
        () => documents.slice().sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)),
        [documents],
    );

    const closeDocumentsOverlay = useCallback((patch: Partial<TransactionsDetailsEscapeSnapshot>) => {
        if (patch.addDocumentSheetOpen === false) setOpen(false);
        if (patch.deleteDocumentOpen === false) {
            setDeleteOpen(false);
            setDeleteTarget(null);
        }
    }, []);

    useEffect(() => {
        registerDocumentsEscapeCloser?.(closeDocumentsOverlay);
        return () => registerDocumentsEscapeCloser?.(null);
    }, [closeDocumentsOverlay, registerDocumentsEscapeCloser]);

    useEffect(() => {
        onDocumentsEscapeSnapshotChange?.({
            addDocumentSheetOpen: open,
            deleteDocumentOpen: deleteOpen,
        });
    }, [open, deleteOpen, onDocumentsEscapeSnapshotChange]);

    useEffect(() => {
        if (detailsActive) return;
        setOpen(false);
        setDeleteOpen(false);
        setDeleteTarget(null);
    }, [detailsActive]);

    return (
        <div dir="rtl" className="pt-2 pb-8">
            <div className="flex items-center justify-end">
                <button
                    type="button"
                    disabled={!!readOnly}
                    onClick={() => setOpen(true)}
                    className={`${TX_GOLD_BTN} !px-4 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    <span className="inline-flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        إضافة مرفق
                    </span>
                </button>
            </div>

            {sorted.length === 0 ? (
                <div className="pt-8 text-center">
                    <div className={`${TX_TEXT_MUTED} text-sm font-medium`}>لا توجد مرفقات بعد.</div>
                </div>
            ) : (
                <div className="mt-2 space-y-2">
                    {sorted.map((doc) => (
                        <DocumentCard
                            key={doc.id}
                            doc={doc}
                            onDelete={(item) => {
                                if (readOnly) return;
                                setDeleteTarget(item);
                                setDeleteOpen(true);
                            }}
                            readOnly={readOnly}
                        />
                    ))}
                </div>
            )}

            {deleteOpen ? (
                <DocumentsDeleteDialog
                    open
                    onOpenChange={(next) => {
                        setDeleteOpen(next);
                        if (!next) setDeleteTarget(null);
                    }}
                    target={deleteTarget}
                    onConfirm={async () => {
                        if (!deleteTarget) return;
                        try {
                            await deleteDocument(deleteTarget.id);
                            setDeleteOpen(false);
                            setDeleteTarget(null);
                        } catch {
                            SmartToast.error('تعذر حذف المستمسك — حاول مرة أخرى');
                        }
                    }}
                />
            ) : null}

            {open ? (
                <DocumentsAddSheet
                    open
                    onOpenChange={setOpen}
                    readOnly={readOnly}
                    onSubmit={async ({ title, ownerTag }) => {
                        try {
                            await addDocument({ transactionId: transaction.id, title, ownerTag });
                            return true;
                        } catch {
                            SmartToast.error('تعذر إضافة المستمسك — حاول مرة أخرى');
                            return false;
                        }
                    }}
                />
            ) : null}
        </div>
    );
}
