import type { ClientRequest, RequestStatus, RequestUrgency } from '@/app/types/common';
import {
    FOUNDATION_STORE_PERSIST_V1,
    unwrapPersistedSlice,
} from '@/app/infrastructure/persistence/zustandPersistFoundation';

export const LEGAL_MARKETPLACE_STORE_KEY = 'hami-legal-marketplace';
export const LEGAL_MARKETPLACE_PERSIST_VERSION = FOUNDATION_STORE_PERSIST_V1;

type RequestKind = NonNullable<ClientRequest['requestKind']>;

const STATUSES = new Set<string>(['new', 'contacting', 'accepted', 'rejected', 'archived']);
const URGENCIES = new Set<string>(['low', 'medium', 'high', 'urgent']);
const KINDS = new Set<string>(['SOS', 'Consultation', 'Service']);

export type LegalMarketplacePersistSlice = {
    escrowWallet: number;
    lawyerWallet: number;
    requests: ClientRequest[];
};

function finiteNumber(value: unknown, fallback = 0): number {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function normalizeRequest(raw: unknown): ClientRequest | null {
    if (!raw || typeof raw !== 'object') return null;
    const o = raw as Record<string, unknown>;
    const id = String(o.id ?? '').trim();
    if (!id) return null;
    const status = String(o.status ?? 'new') as RequestStatus;
    const urgency = String(o.urgency ?? 'medium') as RequestUrgency;
    const requestKind = String(o.requestKind ?? 'Service') as RequestKind;
    const lawyerId = String(o.lawyerId ?? '').trim();
    const priceRaw = o.price;
    const price =
        priceRaw === undefined || priceRaw === null
            ? undefined
            : Math.max(0, finiteNumber(priceRaw, 0));
    const createdAtMsRaw = o.createdAtMs;
    const createdAtMs =
        createdAtMsRaw === undefined || createdAtMsRaw === null
            ? undefined
            : finiteNumber(createdAtMsRaw, Date.now());
    return {
        id,
        clientName: String(o.clientName ?? '—').trim() || '—',
        type: String(o.type ?? '—').trim() || '—',
        description: String(o.description ?? '—').trim() || '—',
        urgency: URGENCIES.has(urgency) ? urgency : 'medium',
        status: STATUSES.has(status) ? (status as RequestStatus) : 'new',
        createdAt: String(o.createdAt ?? '').trim() || '—',
        ...(lawyerId ? { lawyerId } : {}),
        ...(price !== undefined ? { price } : {}),
        ...(KINDS.has(requestKind) ? { requestKind } : {}),
        ...(createdAtMs !== undefined ? { createdAtMs } : {}),
    };
}

export function normalizeLegalMarketplacePersistSlice(
    persisted: unknown,
): LegalMarketplacePersistSlice {
    const slice = unwrapPersistedSlice<LegalMarketplacePersistSlice>(persisted);
    const raw = Array.isArray(slice.requests) ? slice.requests : [];
    const requests = raw
        .map((item) => normalizeRequest(item))
        .filter((item): item is ClientRequest => Boolean(item));
    return {
        escrowWallet: Math.max(0, finiteNumber(slice.escrowWallet, 0)),
        lawyerWallet: Math.max(0, finiteNumber(slice.lawyerWallet, 0)),
        requests,
    };
}

export function migrateLegalMarketplacePersistState(
    persisted: unknown,
    _version: number,
): LegalMarketplacePersistSlice {
    void _version;
    return normalizeLegalMarketplacePersistSlice(persisted);
}
