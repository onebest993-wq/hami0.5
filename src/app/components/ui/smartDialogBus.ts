export type DialogKind = 'confirm' | 'prompt';

export type ConfirmPayload = {
    kind: 'confirm';
    message: string;
    title?: string;
    confirmText?: string;
    cancelText?: string;
};

export type PromptPayload = {
    kind: 'prompt';
    message: string;
    title?: string;
    confirmText?: string;
    cancelText?: string;
    defaultValue?: string;
    placeholder?: string;
};

export type DialogPayload = ConfirmPayload | PromptPayload;

export type DialogEvent = {
    id: string;
    intent: 'show' | 'dismiss';
    payload?: DialogPayload;
};

const listeners = new Set<(ev: DialogEvent) => void>();
const pending = new Map<string, (value: boolean | string | null) => void>();
let activeDialogId: string | null = null;

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

export function subscribeSmartDialog(listener: (ev: DialogEvent) => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

/** واجهة Dialog خفيفة — بدون motion */
export const SmartDialog = {
    confirm: (message: string, options: Omit<ConfirmPayload, 'kind' | 'message'> = {}) => {
        const id = `${Date.now().toString()}${Math.random().toString(16).slice(2)}`;
        emit({
            id,
            intent: 'show',
            payload: {
                kind: 'confirm',
                message: String(message ?? ''),
                ...options,
            },
        });
        return new Promise<boolean>((resolve) => {
            pending.set(id, (v) => resolve(Boolean(v)));
        });
    },
    prompt: (
        message: string,
        defaultValue?: string,
        options: Omit<PromptPayload, 'kind' | 'message' | 'defaultValue'> = {},
    ) => {
        const id = `${Date.now().toString()}${Math.random().toString(16).slice(2)}`;
        emit({
            id,
            intent: 'show',
            payload: {
                kind: 'prompt',
                message: String(message ?? ''),
                defaultValue: typeof defaultValue === 'string' ? defaultValue : '',
                ...options,
            },
        });
        return new Promise<string | null>((resolve) => {
            pending.set(id, (v) => (typeof v === 'string' ? resolve(v) : resolve(null)));
        });
    },
    dismiss: (id: string, value?: boolean | string | null) => {
        const resolve = pending.get(id);
        pending.delete(id);
        emit({ id, intent: 'dismiss' });
        resolve?.(value ?? null);
    },
};
