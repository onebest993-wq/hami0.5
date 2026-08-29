import type { JurisdictionId } from '@/app/components/lawyer/LawyerNewCase/wordLists';

/**
 * حالة اختصاص معلّقة قبل فتح نموذج الإضبارة — وحدة خفيفة بلا سحب LawyerNewCase chunk.
 */
let pendingJurisdiction: JurisdictionId | null = null;

const listeners = new Set<() => void>();

function notify(): void {
    listeners.forEach((listener) => listener());
}

export function subscribeLawyerNewCaseJurisdiction(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function setPendingLawyerNewCaseJurisdiction(id: JurisdictionId | null): void {
    pendingJurisdiction = id;
    notify();
}

export function getPendingLawyerNewCaseJurisdiction(): JurisdictionId | null {
    return pendingJurisdiction;
}

export function consumePendingLawyerNewCaseJurisdiction(): JurisdictionId | null {
    const value = pendingJurisdiction;
    pendingJurisdiction = null;
    return value;
}

export function resetLawyerNewCasePendingJurisdictionForTests(): void {
    pendingJurisdiction = null;
    notify();
}
