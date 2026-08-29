/** علم إقلاع: الملف المحلي موجود على القرص وما زال يُفكّ — لا تُزرع بذرة جلسة قصيرة فوقه. */

export const BOOT_PROFILE_WARM_BUDGET_MS = 1_500;

let lawyerProfileBootWarmPending = false;
const listeners = new Set<() => void>();

function emitLawyerProfileBootWarmPending(): void {
    for (const listener of listeners) listener();
}

export function setLawyerProfileBootWarmPending(pending: boolean): void {
    lawyerProfileBootWarmPending = pending;
    emitLawyerProfileBootWarmPending();
}

export function isLawyerProfileBootWarmPending(): boolean {
    return lawyerProfileBootWarmPending;
}

export function subscribeLawyerProfileBootWarmPending(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function resetLawyerProfileBootWarmPendingForTests(): void {
    lawyerProfileBootWarmPending = false;
    listeners.clear();
}
