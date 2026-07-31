/**
 * Serializes profile persistence so overlapping saves cannot drop fields (last-write-wins).
 * المهلة داخل حلقة الطابور — وإلا رفض الواجهة يترك السلسلة معلّقة على مهمة معلّقة.
 */
import { PROFILE_SAVE_TIMEOUT_MS, withProfileSaveTimeout } from '@/app/services/profile/profileSaveTimeout';

export function createProfileSaveQueue(options?: { timeoutMs?: number }) {
    let chain: Promise<unknown> = Promise.resolve();
    const timeoutMs = options?.timeoutMs ?? PROFILE_SAVE_TIMEOUT_MS;

    return function enqueueProfileSave<T = void>(task: () => Promise<T>): Promise<T> {
        const run = chain.then(() => withProfileSaveTimeout(Promise.resolve().then(task), timeoutMs)) as Promise<T>;
        chain = run.catch(() => undefined);
        return run;
    };
}
