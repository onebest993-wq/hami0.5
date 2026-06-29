/**
 * Serializes profile persistence so overlapping saves cannot drop fields (last-write-wins).
 */
export function createProfileSaveQueue() {
    let chain: Promise<void> = Promise.resolve();

    return function enqueueProfileSave(task: () => Promise<void>): Promise<void> {
        const run = chain.then(task);
        chain = run.catch(() => undefined);
        return run;
    };
}
