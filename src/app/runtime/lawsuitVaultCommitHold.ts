import { useSyncExternalStore } from 'react';

/**
 * يمنع إخفاء مخزن الدعاوى / تفكيك الحوار أثناء تأكيد سلة أو حذف نهائي
 * حتى يعود COMMIT من القرص.
 */
let holdCount = 0;
const listeners = new Set<() => void>();

function emit(): void {
    for (const listener of listeners) listener();
}

export function beginLawsuitVaultCommitHold(): void {
    holdCount += 1;
    emit();
}

export function endLawsuitVaultCommitHold(): void {
    if (holdCount === 0) return;
    holdCount -= 1;
    emit();
}

export function isLawsuitVaultCommitHold(): boolean {
    return holdCount > 0;
}

export function subscribeLawsuitVaultCommitHold(onStoreChange: () => void): () => void {
    listeners.add(onStoreChange);
    return () => {
        listeners.delete(onStoreChange);
    };
}

export function useLawsuitVaultCommitHold(): boolean {
    return useSyncExternalStore(
        subscribeLawsuitVaultCommitHold,
        isLawsuitVaultCommitHold,
        () => false,
    );
}

export function resetLawsuitVaultCommitHoldForTests(): void {
    holdCount = 0;
    emit();
}
