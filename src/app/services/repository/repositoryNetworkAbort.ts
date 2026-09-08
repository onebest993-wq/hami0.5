const repoVaultTextExtractionAbort = new AbortController();
const repoDossierSyncAbort = new AbortController();
const repoStorageOpsAbort = new AbortController();

export {
    repoVaultTextExtractionAbort,
    repoDossierSyncAbort,
    repoStorageOpsAbort,
};

export function getRepoVaultExtractionSignal(): AbortSignal {
    return repoVaultTextExtractionAbort.signal;
}
export function getRepoDossierSyncSignal(): AbortSignal {
    return repoDossierSyncAbort.signal;
}
export function getRepoStorageOpsSignal(): AbortSignal {
    return repoStorageOpsAbort.signal;
}

function abortRepoVaultTextExtraction(): void {
    try { repoVaultTextExtractionAbort.abort(); } catch { /* noop */ }
}
function abortRepoDossierSync(): void {
    try { repoDossierSyncAbort.abort(); } catch { /* noop */ }
}
function abortRepoStorageOps(): void {
    try { repoStorageOpsAbort.abort(); } catch { /* noop */ }
}
export function abortRepositoryNetworkAll(): void {
    abortRepoVaultTextExtraction();
    abortRepoDossierSync();
    abortRepoStorageOps();
}

if (typeof window !== 'undefined') {
    try {
        const winAny = window as unknown as Record<string, unknown>;
        if (typeof winAny.__hamiRepoAbortVault === 'undefined') {
            winAny.__hamiRepoAbortVault = abortRepoVaultTextExtraction;
        }
        if (typeof winAny.__hamiRepoAbortSync === 'undefined') {
            winAny.__hamiRepoAbortSync = abortRepoDossierSync;
        }
        if (typeof winAny.__hamiRepoAbortStorage === 'undefined') {
            winAny.__hamiRepoAbortStorage = abortRepoStorageOps;
        }
        if (typeof winAny.__hamiRepoAbortNetworkAll === 'undefined') {
            winAny.__hamiRepoAbortNetworkAll = abortRepositoryNetworkAll;
        }
    } catch {
        /* side-effect boot guard: SSR or frozen window never breaks */
    }
}
