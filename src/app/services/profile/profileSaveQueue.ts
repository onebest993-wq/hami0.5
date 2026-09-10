/**
 * Serializes profile persistence so overlapping saves cannot drop fields (last-write-wins).
 * المهلة داخل حلقة الطابور — وإلا رفض الواجهة يترك السلسلة معلّقة على مهمة معلّقة.
 */
import { PROFILE_SAVE_TIMEOUT_MS, withProfileSaveTimeout } from '@/app/services/profile/profileSaveTimeout';

interface ProfileSaveQueueHandle {
    (task: () => Promise<void>): Promise<void>;
    <T>(task: () => Promise<T>): Promise<T>;
    dispose: () => void;
}

export function createProfileSaveQueue(options?: { timeoutMs?: number }): ProfileSaveQueueHandle {
    let chain: Promise<unknown> = Promise.resolve();
    let disposed = false;
    const timeoutMs = options?.timeoutMs ?? PROFILE_SAVE_TIMEOUT_MS;

    const enqueueProfileSave = function enqueueProfileSave<T = void>(task: () => Promise<T>): Promise<T> {
        if (disposed) return Promise.reject(new Error('[profile:save_queue_disposed]')) as Promise<T>;
        const run = chain.then(() => {
            if (disposed) return Promise.reject(new Error('[profile:save_queue_disposed]')) as Promise<T>;
            return withProfileSaveTimeout(Promise.resolve().then(task), timeoutMs);
        }) as Promise<T>;
        chain = run.catch(() => undefined);
        return run;
    } as ProfileSaveQueueHandle;

    enqueueProfileSave.dispose = function disposeProfileSaveQueue(): void {
        disposed = true;
        chain = Promise.reject(new Error('[profile:save_queue_disposed]')).catch(() => undefined);
    };

    return enqueueProfileSave;
}
