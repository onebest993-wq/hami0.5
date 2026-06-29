export const PROFILE_SAVE_TIMEOUT_MS = 20_000;

export function withProfileSaveTimeout<T>(promise: Promise<T>, ms = PROFILE_SAVE_TIMEOUT_MS): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = window.setTimeout(() => reject(new Error('profile-save-timeout')), ms);
        promise
            .then((value) => {
                window.clearTimeout(timer);
                resolve(value);
            })
            .catch((err) => {
                window.clearTimeout(timer);
                reject(err);
            });
    });
}
