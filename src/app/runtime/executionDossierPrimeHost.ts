/** تسليح Host إضبارة التنفيذ قبل النقرة — مثل executionArchivePrimeHost */
export const EXECUTION_DOSSIER_PRIME_HOST_EVENT = 'hami:execution-dossier-prime-host';

export type ExecutionDossierPrimeHostDetail = {
    file: Record<string, unknown>;
};

export function dispatchExecutionDossierPrimeHost(file: Record<string, unknown>): void {
    if (typeof window === 'undefined') return;
    const id = file?.id;
    if (
        !(
            (typeof id === 'number' && Number.isFinite(id)) ||
            (typeof id === 'string' && String(id).trim().length > 0)
        )
    ) {
        return;
    }
    window.dispatchEvent(
        new CustomEvent<ExecutionDossierPrimeHostDetail>(EXECUTION_DOSSIER_PRIME_HOST_EVENT, {
            detail: { file },
        }),
    );
}
