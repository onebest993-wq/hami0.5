import { useCallback, useEffect, useRef, useState } from 'react';
import type { TransactionsDetailsEscapeSnapshot } from '../transactionsEscapeStack';

type TaskEscapeSlice = Pick<
    TransactionsDetailsEscapeSnapshot,
    'taskCompleteOpen' | 'taskEditOpen' | 'taskDeleteOpen'
>;

type DocumentsEscapeSlice = Pick<
    TransactionsDetailsEscapeSnapshot,
    'addDocumentSheetOpen' | 'deleteDocumentOpen'
>;

export function useTransactionDetailsEscape({
    sheetOpen,
    reportOpen,
    completeOpen,
    saveTemplateOpen,
    templatesOpen,
    shareOpen,
    onEscapeSnapshotChange,
    registerEscapeCloser,
    closeLocalOverlays,
}: {
    sheetOpen: boolean;
    reportOpen: boolean;
    completeOpen: boolean;
    saveTemplateOpen: boolean;
    templatesOpen: boolean;
    shareOpen: boolean;
    onEscapeSnapshotChange?: (snapshot: TransactionsDetailsEscapeSnapshot) => void;
    registerEscapeCloser?: (
        closer: ((patch: Partial<TransactionsDetailsEscapeSnapshot>) => void) | null,
    ) => void;
    closeLocalOverlays: (patch: Partial<TransactionsDetailsEscapeSnapshot>) => void;
}) {
    const [taskEscape, setTaskEscape] = useState<TaskEscapeSlice>({
        taskCompleteOpen: false,
        taskEditOpen: false,
        taskDeleteOpen: false,
    });
    const closeTaskOverlayRef = useRef<(patch: Partial<TransactionsDetailsEscapeSnapshot>) => void>(
        () => undefined,
    );
    const [documentsEscape, setDocumentsEscape] = useState<DocumentsEscapeSlice>({
        addDocumentSheetOpen: false,
        deleteDocumentOpen: false,
    });
    const closeDocumentsOverlayRef = useRef<(patch: Partial<TransactionsDetailsEscapeSnapshot>) => void>(
        () => undefined,
    );

    const onTaskEscapeSnapshotChange = useCallback((next: TaskEscapeSlice) => {
        setTaskEscape((prev) =>
            prev.taskCompleteOpen === Boolean(next.taskCompleteOpen) &&
            prev.taskEditOpen === next.taskEditOpen &&
            prev.taskDeleteOpen === next.taskDeleteOpen
                ? prev
                : {
                      taskCompleteOpen: Boolean(next.taskCompleteOpen),
                      taskEditOpen: next.taskEditOpen,
                      taskDeleteOpen: next.taskDeleteOpen,
                  },
        );
    }, []);

    const closeOverlay = useCallback(
        (patch: Partial<TransactionsDetailsEscapeSnapshot>) => {
            closeLocalOverlays(patch);
            const taskPatch: Partial<TransactionsDetailsEscapeSnapshot> = {};
            if (patch.taskCompleteOpen === false) taskPatch.taskCompleteOpen = false;
            if (patch.taskEditOpen === false) taskPatch.taskEditOpen = false;
            if (patch.taskDeleteOpen === false) taskPatch.taskDeleteOpen = false;
            if (Object.keys(taskPatch).length > 0) {
                closeTaskOverlayRef.current(taskPatch);
            }
            const documentsPatch: Partial<TransactionsDetailsEscapeSnapshot> = {};
            if (patch.addDocumentSheetOpen === false) documentsPatch.addDocumentSheetOpen = false;
            if (patch.deleteDocumentOpen === false) documentsPatch.deleteDocumentOpen = false;
            if (Object.keys(documentsPatch).length > 0) {
                closeDocumentsOverlayRef.current(documentsPatch);
            }
        },
        [closeLocalOverlays],
    );

    useEffect(() => {
        registerEscapeCloser?.(closeOverlay);
        return () => registerEscapeCloser?.(null);
    }, [closeOverlay, registerEscapeCloser]);

    useEffect(() => {
        onEscapeSnapshotChange?.({
            addTaskSheetOpen: sheetOpen,
            reportOpen,
            completeOpen,
            saveTemplateOpen,
            templatesOpen,
            shareProcedureOpen: shareOpen,
            ...taskEscape,
            ...documentsEscape,
        });
    }, [
        sheetOpen,
        reportOpen,
        completeOpen,
        saveTemplateOpen,
        templatesOpen,
        shareOpen,
        taskEscape,
        documentsEscape,
        onEscapeSnapshotChange,
    ]);

    const registerTaskEscapeCloser = useCallback(
        (closer: ((patch: Partial<TransactionsDetailsEscapeSnapshot>) => void) | null) => {
            closeTaskOverlayRef.current = closer ?? (() => undefined);
        },
        [],
    );

    const onDocumentsEscapeSnapshotChange = useCallback((next: DocumentsEscapeSlice) => {
        setDocumentsEscape((prev) =>
            prev.addDocumentSheetOpen === Boolean(next.addDocumentSheetOpen) &&
            prev.deleteDocumentOpen === Boolean(next.deleteDocumentOpen)
                ? prev
                : {
                      addDocumentSheetOpen: Boolean(next.addDocumentSheetOpen),
                      deleteDocumentOpen: Boolean(next.deleteDocumentOpen),
                  },
        );
    }, []);

    const registerDocumentsEscapeCloser = useCallback(
        (closer: ((patch: Partial<TransactionsDetailsEscapeSnapshot>) => void) | null) => {
            closeDocumentsOverlayRef.current = closer ?? (() => undefined);
        },
        [],
    );

    return {
        onTaskEscapeSnapshotChange,
        registerTaskEscapeCloser,
        onDocumentsEscapeSnapshotChange,
        registerDocumentsEscapeCloser,
    };
}
