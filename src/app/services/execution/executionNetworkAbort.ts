const execFilesHydrateAbortCtl = new AbortController();
const execFinancialSyncAbortCtl = new AbortController();
const execSummonsFollowupAbortCtl = new AbortController();

export {
    execFilesHydrateAbortCtl,
    execFinancialSyncAbortCtl,
    execSummonsFollowupAbortCtl,
};

export function getExecFilesHydrateSignal(): AbortSignal {
    return execFilesHydrateAbortCtl.signal;
}
export function getExecFinancialSyncSignal(): AbortSignal {
    return execFinancialSyncAbortCtl.signal;
}
export function getExecSummonsFollowupSignal(): AbortSignal {
    return execSummonsFollowupAbortCtl.signal;
}

function abortExecFilesHydrateAll(): void {
    try { execFilesHydrateAbortCtl.abort(); } catch { /* noop */ }
}
function abortExecFinancialSyncAll(): void {
    try { execFinancialSyncAbortCtl.abort(); } catch { /* noop */ }
}
function abortExecSummonsFollowupAll(): void {
    try { execSummonsFollowupAbortCtl.abort(); } catch { /* noop */ }
}
export function abortExecutionNetworkAll(): void {
    abortExecFilesHydrateAll();
    abortExecFinancialSyncAll();
    abortExecSummonsFollowupAll();
}

if (typeof window !== 'undefined') {
    try {
        const winAny = window as unknown as Record<string, unknown>;
        if (typeof winAny.__hamiExecAbortFiles === 'undefined') {
            winAny.__hamiExecAbortFiles = abortExecFilesHydrateAll;
        }
        if (typeof winAny.__hamiExecAbortSync === 'undefined') {
            winAny.__hamiExecAbortSync = abortExecFinancialSyncAll;
        }
        if (typeof winAny.__hamiExecAbortSummons === 'undefined') {
            winAny.__hamiExecAbortSummons = abortExecSummonsFollowupAll;
        }
        if (typeof winAny.__hamiExecAbortNetworkAll === 'undefined') {
            winAny.__hamiExecAbortNetworkAll = abortExecutionNetworkAll;
        }
    } catch {
        /* side-effect boot guard: SSR or frozen window never breaks */
    }
}
