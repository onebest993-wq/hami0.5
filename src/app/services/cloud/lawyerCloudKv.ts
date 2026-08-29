import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import { isKvProxyNetworkEnabled } from '@/app/services/kvProxyConfig';
import { canUseServerBackedNetworkFeatures } from '@/app/services/auth/lawyerAccountStatus';
import {
    isLawyerWorkCloudLive,
    isWorkLocalKvMaterial,
} from '@/app/services/settings/lawyerWorkCloudGate';
import { getLiveAuthUserId } from '@/app/utils/liveAuthUserId';

const CLOUD_KV_TIMEOUT_MS = 6_000;
const KV_PROXY_URL = '/api/kv-proxy';

function assertKvServerSession(material: string): void {
    if (!isKvProxyNetworkEnabled()) throw new KvLocalOnlyError();
    if (!canUseServerBackedNetworkFeatures(getLiveAuthUserId())) throw new KvLocalOnlyError();
    if (isWorkLocalKvMaterial(material) && !isLawyerWorkCloudLive()) {
        throw new KvLocalOnlyError();
    }
}

export class KvLocalOnlyError extends Error {
    constructor() {
        super('kv_local_only');
        this.name = 'KvLocalOnlyError';
    }
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`${label}: timeout`)), ms);
        promise
            .then((v) => {
                clearTimeout(timer);
                resolve(v);
            })
            .catch((e) => {
                clearTimeout(timer);
                reject(e);
            });
    });
}

type KvProxyGetResponse = { ok?: boolean; value?: unknown };
type KvProxyPrefixResponse = { ok?: boolean; values?: unknown[] };

/** KV BFF — طبقة سحابية منفصلة عن lawyer-cloud monolith */
export const lawyerCloudKv = {
    async set(key: string, value: unknown) {
        assertKvServerSession(key);
        await withTimeout(
            SecureAPIClient.fetchSecure(KV_PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'set', key, value }),
            }),
            CLOUD_KV_TIMEOUT_MS,
            'kv.set',
        );
    },
    async get(key: string) {
        assertKvServerSession(key);
        const res = await withTimeout(
            SecureAPIClient.fetchSecure<KvProxyGetResponse>(KV_PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get', key }),
            }),
            CLOUD_KV_TIMEOUT_MS,
            'kv.get',
        );
        return res?.value ?? null;
    },
    async getByPrefix(prefix: string) {
        assertKvServerSession(prefix);
        const res = await SecureAPIClient.fetchSecure<KvProxyPrefixResponse>(KV_PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getByPrefix', prefix }),
        });
        return Array.isArray(res?.values) ? res.values : [];
    },
    async del(key: string) {
        assertKvServerSession(key);
        await SecureAPIClient.fetchSecure(KV_PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'del', key }),
        });
    },
};

export function uuidv4(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}

const inFlightPrefixFetches = new Map<string, Promise<unknown[]>>();

/** dedup لـ getByPrefix داخل نفس tick — calendar sync */
export function fetchPrefixOnceInTick(prefix: string): Promise<unknown[]> {
    const existing = inFlightPrefixFetches.get(prefix);
    if (existing) return existing;
    const p = (async (): Promise<unknown[]> => {
        try {
            const res = await lawyerCloudKv.getByPrefix(prefix);
            return Array.isArray(res) ? res : [];
        } catch {
            return [];
        }
    })();
    inFlightPrefixFetches.set(prefix, p);
    p.finally(() => {
        if (inFlightPrefixFetches.get(prefix) === p) {
            inFlightPrefixFetches.delete(prefix);
        }
    });
    return p;
}
