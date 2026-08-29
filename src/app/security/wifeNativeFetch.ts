/**
 * أصل fetch الحقيقي — وحدة مغلقة، ليس Symbol على globalThis.
 * الصفحة لا تستعيد الأصل عبر Symbol.for.
 */

type NativeFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

let nativeFetchImpl: NativeFetch | null = null;

export function captureWifeNativeFetch(): NativeFetch {
    if (nativeFetchImpl) return nativeFetchImpl;
    nativeFetchImpl = globalThis.fetch.bind(globalThis) as NativeFetch;
    return nativeFetchImpl;
}

export function getWifeNativeFetch(): NativeFetch {
    return nativeFetchImpl ?? (globalThis.fetch.bind(globalThis) as NativeFetch);
}

export function peekWifeNativeFetch(): NativeFetch | null {
    return nativeFetchImpl;
}

export function setWifeNativeFetchForTests(fn: NativeFetch | null): void {
    nativeFetchImpl = fn;
}

export function resetWifeNativeFetchForTests(): void {
    nativeFetchImpl = null;
}
