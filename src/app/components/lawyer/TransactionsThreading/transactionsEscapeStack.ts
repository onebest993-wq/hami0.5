/** لقطة طبقات المعاملات — الأعمق أولاً */
export type TransactionsDetailsEscapeSnapshot = {
    addTaskSheetOpen: boolean;
    reportOpen: boolean;
    completeOpen: boolean;
    saveTemplateOpen: boolean;
    templatesOpen: boolean;
    taskCompleteOpen?: boolean;
    taskEditOpen: boolean;
    taskDeleteOpen: boolean;
    shareProcedureOpen?: boolean;
};

export type TransactionsEscapeSnapshot = {
    view: 'list' | 'details';
    listAddSheetOpen: boolean;
    details: TransactionsDetailsEscapeSnapshot | null;
};

export type TransactionsEscapeAction =
    | 'close-report'
    | 'close-complete'
    | 'close-save-template'
    | 'close-templates'
    | 'close-add-task'
    | 'close-task-complete'
    | 'close-task-edit'
    | 'close-task-delete'
    | 'close-add-transaction'
    | 'back-to-list'
    | 'exit-hub';

const CLOSED_DETAILS: TransactionsDetailsEscapeSnapshot = {
    addTaskSheetOpen: false,
    reportOpen: false,
    completeOpen: false,
    saveTemplateOpen: false,
    templatesOpen: false,
    taskCompleteOpen: false,
    taskEditOpen: false,
    taskDeleteOpen: false,
};

export function emptyTransactionsDetailsEscape(): TransactionsDetailsEscapeSnapshot {
    return { ...CLOSED_DETAILS };
}

export type TransactionsEscapeHandlers = {
    onBack: () => void;
    onCloseListAddSheet: () => void;
    onBackToList: () => void;
    onCloseDetailsOverlay: (patch: Partial<TransactionsDetailsEscapeSnapshot>) => void;
};

export function applyTransactionsEscapeAction(
    action: TransactionsEscapeAction,
    handlers: TransactionsEscapeHandlers,
): void {
    switch (action) {
        case 'close-report':
            handlers.onCloseDetailsOverlay({ reportOpen: false });
            break;
        case 'close-complete':
            handlers.onCloseDetailsOverlay({ completeOpen: false });
            break;
        case 'close-save-template':
            handlers.onCloseDetailsOverlay({ saveTemplateOpen: false });
            break;
        case 'close-templates':
            handlers.onCloseDetailsOverlay({ templatesOpen: false });
            break;
        case 'close-add-task':
            handlers.onCloseDetailsOverlay({ addTaskSheetOpen: false });
            break;
        case 'close-task-complete':
            handlers.onCloseDetailsOverlay({ taskCompleteOpen: false });
            break;
        case 'close-task-edit':
            handlers.onCloseDetailsOverlay({ taskEditOpen: false });
            break;
        case 'close-task-delete':
            handlers.onCloseDetailsOverlay({ taskDeleteOpen: false });
            break;
        case 'close-add-transaction':
            handlers.onCloseListAddSheet();
            break;
        case 'back-to-list':
            handlers.onBackToList();
            break;
        case 'exit-hub':
            handlers.onBack();
            break;
        default:
            break;
    }
}

export function resolveTransactionsEscapeAction(
    snapshot: TransactionsEscapeSnapshot,
): TransactionsEscapeAction {
    const d = snapshot.details;
    if (d) {
        if (d.reportOpen) return 'close-report';
        if (d.completeOpen) return 'close-complete';
        if (d.saveTemplateOpen) return 'close-save-template';
        if (d.templatesOpen) return 'close-templates';
        if (d.taskDeleteOpen) return 'close-task-delete';
        if (d.taskEditOpen) return 'close-task-edit';
        if (d.taskCompleteOpen) return 'close-task-complete';
        if (d.addTaskSheetOpen) return 'close-add-task';
    }
    if (snapshot.listAddSheetOpen) return 'close-add-transaction';
    if (snapshot.view === 'details') return 'back-to-list';
    return 'exit-hub';
}
