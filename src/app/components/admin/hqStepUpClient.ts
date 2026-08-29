import { HQ_STEP_UP_CODE } from '@/app/domain/admin/hqStepUp';
import { SecureFetchError } from '@/app/services/SecureFetchError';

export { HQ_STEP_UP_CODE };

export class HqStepUpCancelledError extends Error {
    constructor() {
        super('أُلغي تأكيد رمز التحقق');
        this.name = 'HqStepUpCancelledError';
    }
}

export function isHqStepUpRequired(error: unknown): boolean {
    if (!(error instanceof SecureFetchError) || error.status !== 403) return false;
    try {
        const parsed = JSON.parse(error.bodyText) as { code?: unknown };
        return parsed.code === HQ_STEP_UP_CODE;
    } catch {
        return false;
    }
}

type StepUpWaiter = {
    resolve: () => void;
    reject: (error: Error) => void;
};

const waiters: StepUpWaiter[] = [];
let hostOpen: (() => void) | null = null;

export function bindHqStepUpHost(open: () => void): () => void {
    hostOpen = open;
    return () => {
        if (hostOpen === open) hostOpen = null;
    };
}

export function promptHqStepUp(): Promise<void> {
    if (!hostOpen) {
        return Promise.reject(new Error('تعذّر فتح تأكيد رمز المقر'));
    }
    return new Promise((resolve, reject) => {
        waiters.push({ resolve, reject });
        hostOpen?.();
    });
}

export function resolveHqStepUp(): void {
    const next = waiters.shift();
    next?.resolve();
    while (waiters.length > 0) {
        waiters.shift()?.resolve();
    }
}

export function rejectHqStepUp(error?: Error): void {
    const reason = error ?? new HqStepUpCancelledError();
    while (waiters.length > 0) {
        waiters.shift()?.reject(reason);
    }
}
