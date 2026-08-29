/** بديل بناء المقر — قطع اتصال محامي الهاتف ليس سطح المقر. */
export class LocalOnlyNetworkError extends Error {
    constructor(message = 'local-only-mode') {
        super(message);
        this.name = 'LocalOnlyNetworkError';
    }
}

export function setLocalOnlyNetworkFlag(_enabled: boolean): void {
    /* HQ product excludes lawyer local-only isolation */
}

export function armLocalOnlyNetworkIsolation(_enabled: boolean): void {
    /* HQ product excludes lawyer local-only isolation */
}

export function syncLocalOnlyFlagFromSettings(_enabled: boolean): void {
    /* HQ product excludes lawyer local-only isolation */
}

export function installLocalOnlyNetworkIsolation(): void {
    /* HQ product excludes lawyer local-only isolation */
}

export function resetLocalOnlyNetworkIsolationForTests(): void {
    /* HQ product excludes lawyer local-only isolation */
}
