/**
 * تسليح قطع الاتصال من القرص قبل أي import ديناميكي في entry.
 * لا يستورد لقطة الإعدادات ولا عميل التوقيع الآمن.
 */
import { captureWifeNativeFetch, getWifeNativeFetch } from '@/app/security/wifeNativeFetch';
import {
    isUrlPermittedUnderLocalOnly,
    LocalOnlyNetworkError,
    persistLocalOnlyBootFlag,
    readLocalOnlyBootFlag,
    readPlaintextPersistedLocalOnlyMode,
    resolveAppOrigin,
    resetLocalOnlyPersistMemoForTests,
} from '@/app/services/settings/localOnlyUrlPolicy';

const EMPTY_BYPASS = new Map<string, number>();

let earlyInstalled = false;

function shouldArmFromDisk(): boolean {
    return readLocalOnlyBootFlag() || readPlaintextPersistedLocalOnlyMode();
}

function isLocalOnlyOnNow(): boolean {
    try {
        if (typeof document !== 'undefined' && document.documentElement.dataset.hamiLocalOnly === '1') {
            return true;
        }
    } catch {
        /* ignore */
    }
    return readLocalOnlyBootFlag();
}

function resolveFetchUrl(input: RequestInfo | URL): string {
    if (typeof input === 'string') return input;
    if (input instanceof URL) return input.href;
    if (typeof Request !== 'undefined' && input instanceof Request) return input.url;
    return String(input);
}

function installEarlyLocalOnlyFetchGuard(): void {
    if (earlyInstalled || typeof window === 'undefined') return;
    earlyInstalled = true;
    const native = captureWifeNativeFetch();
    globalThis.fetch = (input, init) => {
        if (isLocalOnlyOnNow()) {
            const url = resolveFetchUrl(input as RequestInfo | URL);
            if (!isUrlPermittedUnderLocalOnly(url, resolveAppOrigin(), EMPTY_BYPASS)) {
                return Promise.reject(new LocalOnlyNetworkError('قطع الاتصال مفعّل — العمل محلياً فقط'));
            }
        }
        return native(input as RequestInfo, init);
    };
}

/** يضبط العلم من القرص ويلفّ fetch قبل stem اللوحة */
export function armLocalOnlyIsolationAtBoot(): void {
    if (typeof window === 'undefined') return;
    if (shouldArmFromDisk()) {
        persistLocalOnlyBootFlag(true);
        try {
            document.documentElement.dataset.hamiLocalOnly = '1';
        } catch {
            /* ignore */
        }
    }
    installEarlyLocalOnlyFetchGuard();
}

export function resetLocalOnlyBootArmForTests(): void {
    if (earlyInstalled) {
        globalThis.fetch = getWifeNativeFetch();
    }
    earlyInstalled = false;
    persistLocalOnlyBootFlag(false);
    resetLocalOnlyPersistMemoForTests();
    try {
        delete document.documentElement.dataset.hamiLocalOnly;
    } catch {
        /* ignore */
    }
}
