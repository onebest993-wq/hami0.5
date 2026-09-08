const abortLitigationFilesHydrateAll = new AbortController();
const abortLitigationWorkspaceAll = new AbortController();
const abortCaseShareNetworkAll = new AbortController();

export {
    abortLitigationFilesHydrateAll,
    abortLitigationWorkspaceAll,
    abortCaseShareNetworkAll,
};

if (typeof window !== 'undefined') {
    try {
        const winAny = window as unknown as Record<string, unknown>;
        if (typeof winAny.__hamiLitAbortFiles === 'undefined') {
            winAny.__hamiLitAbortFiles = abortLitigationFilesHydrateAll;
        }
        if (typeof winAny.__hamiLitAbortWorkspace === 'undefined') {
            winAny.__hamiLitAbortWorkspace = abortLitigationWorkspaceAll;
        }
        if (typeof winAny.__hamiLitAbortCaseShare === 'undefined') {
            winAny.__hamiLitAbortCaseShare = abortCaseShareNetworkAll;
        }
    } catch {
        /* side-effect boot guard: SSR or frozen window never breaks */
    }
}
