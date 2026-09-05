export type DialogKind = 'confirm' | 'prompt';

export type ConfirmPayload = {
    kind: 'confirm';
    message: string;
    title?: string;
    confirmText?: string;
    cancelText?: string;
    confirmDelayMs?: number;
};

export type PromptPayload = {
    kind: 'prompt';
    message: string;
    title?: string;
    confirmText?: string;
    cancelText?: string;
    defaultValue?: string;
    placeholder?: string;
    inputType?: 'text' | 'password';
    autoComplete?: string;
    ariaLabel?: string;
    maxLength?: number;
};

export type DialogPayload = ConfirmPayload | PromptPayload;

export type DialogEvent = {
    id: string;
    intent: 'show' | 'dismiss';
    payload?: DialogPayload;
};

const listeners = new Set<(ev: DialogEvent) => void>();
const pending = new Map<string, (value: boolean | string | null) => void>();
const queuedDialogs: Array<{ id: string; payload: DialogPayload }> = [];
const dialogOwner = new Map<string, string>();
let activeDialogId: string | null = null;
let activeScope: string | null = null;

export const SMART_DIALOG_SCOPE_SETTINGS = 'settings';
const SMART_DIALOG_SCOPE_APP = 'app';

export function enterSmartDialogScope(scope: string): void {
    activeScope = scope;
}

export function exitSmartDialogScope(scope: string): void {
    if (activeScope === scope) activeScope = null;
}

function ownerOf(id: string): string {
    return dialogOwner.get(id) ?? SMART_DIALOG_SCOPE_APP;
}

function emit(ev: DialogEvent) {
    if (ev.intent === 'show') {
        activeDialogId = ev.id;
    } else if (ev.intent === 'dismiss' && activeDialogId === ev.id) {
        activeDialogId = null;
    }
    listeners.forEach((listener) => listener(ev));
}

export function isSmartDialogOpen(): boolean {
    return activeDialogId !== null;
}

export function dismissActiveSmartDialog(): boolean {
    if (!activeDialogId) return false;
    const id = activeDialogId;
    SmartDialog.dismiss(id, null);
    return true;
}

/** يلغي الظاهر والمكدّس لمالك النطاق فقط — لا يمس حوارات المخزن/التنفيذ */
export function dismissSmartDialogsInScope(scope: string): void {
    const queuedScopedIds: string[] = [];
    for (let i = queuedDialogs.length - 1; i >= 0; i--) {
        const dialog = queuedDialogs[i]!;
        if (ownerOf(dialog.id) === scope) {
            queuedScopedIds.push(dialog.id);
            queuedDialogs.splice(i, 1);
        }
    }
    queuedScopedIds.reverse();
    const activeId = activeDialogId;
    if (activeId && ownerOf(activeId) === scope) {
        SmartDialog.dismiss(activeId, null);
    }
    for (const id of queuedScopedIds) {
        SmartDialog.dismiss(id, null);
    }
}

export function dismissSettingsSmartDialogs(): void {
    dismissSmartDialogsInScope(SMART_DIALOG_SCOPE_SETTINGS);
}

/** يلغي كل الحوارات — اختبارات أو إغلاق عملية كامل، ليس مسار صدفة الإعدادات */
export function dismissAllSmartDialogs(): void {
    const queuedIds = queuedDialogs.map((dialog) => dialog.id);
    queuedDialogs.length = 0;
    if (activeDialogId) {
        SmartDialog.dismiss(activeDialogId, null);
    }
    for (const id of queuedIds) {
        SmartDialog.dismiss(id, null);
    }
}

export function subscribeSmartDialog(listener: (ev: DialogEvent) => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function presentOrQueue(id: string, payload: DialogPayload): void {
    dialogOwner.set(id, activeScope ?? SMART_DIALOG_SCOPE_APP);
    if (activeDialogId) {
        queuedDialogs.push({ id, payload });
        return;
    }
    emit({ id, intent: 'show', payload });
}

function presentNextDialog(): void {
    if (activeDialogId) return;
    const next = queuedDialogs.shift();
    if (next) emit({ id: next.id, intent: 'show', payload: next.payload });
}

/** واجهة Dialog خفيفة — بدون motion */
export const SmartDialog = {
    confirm: (message: string, options: Omit<ConfirmPayload, 'kind' | 'message'> = {}) => {
        const id = `${Date.now().toString()}${Math.random().toString(16).slice(2)}`;
        const payload: ConfirmPayload = {
                kind: 'confirm',
                message: String(message ?? ''),
                ...options,
        };
        return new Promise<boolean>((resolve) => {
            pending.set(id, (v) => resolve(Boolean(v)));
            presentOrQueue(id, payload);
        });
    },
    prompt: (
        message: string,
        defaultValue?: string,
        options: Omit<PromptPayload, 'kind' | 'message' | 'defaultValue'> = {},
    ) => {
        const id = `${Date.now().toString()}${Math.random().toString(16).slice(2)}`;
        const payload: PromptPayload = {
                kind: 'prompt',
                message: String(message ?? ''),
                defaultValue: typeof defaultValue === 'string' ? defaultValue : '',
                ...options,
        };
        return new Promise<string | null>((resolve) => {
            pending.set(id, (v) => (typeof v === 'string' ? resolve(v) : resolve(null)));
            presentOrQueue(id, payload);
        });
    },
    dismiss: (id: string, value?: boolean | string | null) => {
        const resolve = pending.get(id);
        pending.delete(id);
        dialogOwner.delete(id);
        if (id !== activeDialogId) {
            const queuedIndex = queuedDialogs.findIndex((dialog) => dialog.id === id);
            if (queuedIndex >= 0) queuedDialogs.splice(queuedIndex, 1);
            resolve?.(value ?? null);
            return;
        }
        emit({ id, intent: 'dismiss' });
        resolve?.(value ?? null);
        presentNextDialog();
    },
};
