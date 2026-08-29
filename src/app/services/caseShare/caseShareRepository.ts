import type {
    CaseShareMaskedView,
    CaseShareRecord,
    CaseShareStatus,
    CaseShareVisibleFields,
    CaseShareDossierModule,
    DossierShareSource,
} from './caseShareTypes';
import { buildMaskedView } from './caseShareMasking';
import { applyShareAccessPolicy, canFetchShareDetail, toShareListSummary } from './caseShareAccessControl';
import { assertRecipientInNetwork } from './caseShareNetworkGuard';
import {
    assertShareSourceOwnedByUser,
} from './caseShareDossierOwnership';
import { loadCaseShareRecords, saveCaseShareRecords } from './caseShareLocalStore';
import {
    DEFAULT_CASE_SHARE_SESSION_MINUTES,
    dispatchCaseShareChanged,
    isCaseShareSessionExpired,
} from './caseShareSession';

function createId(): string {
    const c = globalThis.crypto as Crypto | undefined;
    if (c?.randomUUID) return c.randomUUID();
    return `cs_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

async function loadLocal(): Promise<CaseShareRecord[]> {
    return loadCaseShareRecords();
}

async function saveLocal(rows: CaseShareRecord[]): Promise<void> {
    await saveCaseShareRecords(rows);
}

async function serverKvSet(key: string, value: unknown): Promise<void> {
    if (typeof window !== 'undefined') return;
    try {
        const spec = '@/app/api/security/kvStoreAdmin.ts';
        const { kvSet } = await import(/* @vite-ignore */ spec);
        await kvSet(key, value);
    } catch {
        /* silent */
    }
}

async function serverKvGet(key: string): Promise<unknown> {
    if (typeof window !== 'undefined') return null;
    try {
        const spec = '@/app/api/security/kvStoreAdmin.ts';
        const { kvGet } = await import(/* @vite-ignore */ spec);
        return kvGet(key);
    } catch {
        return null;
    }
}

async function serverKvGetByPrefix(prefix: string): Promise<unknown[]> {
    if (typeof window !== 'undefined') return [];
    try {
        const spec = '@/app/api/security/kvStoreAdmin.ts';
        const { kvGetByPrefix } = await import(/* @vite-ignore */ spec);
        const res = await kvGetByPrefix(prefix);
        return Array.isArray(res) ? res : [];
    } catch {
        return [];
    }
}

export const CASE_SHARE_DOSSIER_DELETED_ENDED_BY = 'system:dossier-deleted';

const LAWSUIT_SHARE_MODULES: CaseShareDossierModule[] = ['lawsuit', 'personal'];

function isRevocableShareStatus(status: CaseShareStatus): boolean {
    return status === 'pending' || status === 'accepted';
}

function shouldRevokeShareForDossier(
    share: CaseShareRecord,
    ownerId: string,
    dossierId: string,
    modules: Set<CaseShareDossierModule>,
): boolean {
    if (share.ownerId !== ownerId) return false;
    if (String(share.dossierId) !== dossierId) return false;
    if (!modules.has(share.dossierModule)) return false;
    return isRevocableShareStatus(share.status);
}

function buildRevokedShareRecord(share: CaseShareRecord, now: string): CaseShareRecord {
    return {
        ...share,
        status: 'ended',
        sessionEndedAt: share.sessionEndedAt ?? now,
        endedByUserId: CASE_SHARE_DOSSIER_DELETED_ENDED_BY,
        ...(share.status === 'pending' ? { respondedAt: now } : {}),
    };
}

async function persistAllRecords(records: CaseShareRecord[]): Promise<void> {
    await saveLocal(records);
    for (const record of records) {
        await serverKvSet(`case_share:${record.id}`, record);
        await serverKvSet(`case_share:owner:${record.ownerId}:${record.id}`, record.id);
        await serverKvSet(`case_share:recipient:${record.recipientId}:${record.id}`, record.id);
    }
}

async function persistRecord(record: CaseShareRecord): Promise<void> {
    const rows = await loadLocal();
    const next = [record, ...rows.filter((r) => r.id !== record.id)];
    await persistAllRecords(next);
}

async function loadRecordById(id: string): Promise<CaseShareRecord | null> {
    const rows = await loadLocal();
    const localHit = rows.find((r) => r.id === id);
    if (localHit) return localHit;
    const raw = await serverKvGet(`case_share:${id}`);
    if (raw && typeof raw === 'object') return raw as CaseShareRecord;
    return null;
}

async function finalizeExpiredSession(record: CaseShareRecord): Promise<CaseShareRecord> {
    if (record.status !== 'accepted' || !isCaseShareSessionExpired(record)) return record;
    const ended: CaseShareRecord = {
        ...record,
        status: 'ended',
        sessionEndedAt: record.sessionEndedAt ?? new Date().toISOString(),
        endedByUserId: record.endedByUserId ?? 'system:expired',
    };
    await persistRecord(ended);
    return ended;
}

async function normalizeForViewer(record: CaseShareRecord, viewerId: string): Promise<CaseShareRecord> {
    const finalized = await finalizeExpiredSession(record);
    return applyShareAccessPolicy(finalized, viewerId);
}

async function loadAllFromKv(userId: string): Promise<CaseShareRecord[]> {
    const asOwner = await serverKvGetByPrefix(`case_share:owner:${userId}:`);
    const asRecipient = await serverKvGetByPrefix(`case_share:recipient:${userId}:`);
    const ids = new Set<string>();
    for (const row of [...asOwner, ...asRecipient]) {
        if (typeof row === 'string') ids.add(row);
    }
    const records: CaseShareRecord[] = [];
    for (const id of ids) {
        const raw = await serverKvGet(`case_share:${id}`);
        if (raw && typeof raw === 'object') records.push(raw as CaseShareRecord);
    }
    return records;
}

export const CaseShareRepository = {
    async createShare(params: {
        ownerId: string;
        ownerName: string;
        recipientId: string;
        recipientName: string;
        source: DossierShareSource;
        visibleFields: CaseShareVisibleFields;
        sessionDurationMinutes?: number;
    }): Promise<CaseShareRecord> {
        const inNetwork = await assertRecipientInNetwork(params.ownerId, params.recipientId);
        if (!inNetwork) {
            throw new Error('RECIPIENT_NOT_IN_NETWORK');
        }
        await assertShareSourceOwnedByUser(params.ownerId, params.source);
        const sessionDurationMinutes = params.sessionDurationMinutes ?? DEFAULT_CASE_SHARE_SESSION_MINUTES;
        const maskedView = buildMaskedView(params.source, params.visibleFields, params.ownerName, sessionDurationMinutes);
        const record: CaseShareRecord = {
            id: createId(),
            ownerId: params.ownerId,
            ownerName: params.ownerName,
            recipientId: params.recipientId,
            recipientName: params.recipientName,
            dossierModule: params.source.module,
            dossierId: params.source.dossierId,
            dossierTitle: params.source.title,
            visibleFields: params.visibleFields,
            maskedView,
            status: 'pending',
            createdAt: new Date().toISOString(),
            sessionDurationMinutes,
        };
        await persistRecord(record);
        dispatchCaseShareChanged();
        return record;
    },

    async listForUser(userId: string, options?: { summary?: boolean }): Promise<CaseShareRecord[]> {
        const local = await loadLocal();
        const kvRows = await loadAllFromKv(userId);
        const map = new Map<string, CaseShareRecord>();
        for (const r of [...local, ...kvRows]) {
            if (r.ownerId === userId || r.recipientId === userId) map.set(r.id, r);
        }
        const sorted = [...map.values()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
        const normalized = await Promise.all(sorted.map((r) => normalizeForViewer(r, userId)));
        if (options?.summary) {
            return normalized.map((r) => toShareListSummary(r, userId));
        }
        return normalized;
    },

    async listIncoming(userId: string): Promise<CaseShareRecord[]> {
        return (await this.listForUser(userId)).filter((r) => r.recipientId === userId);
    },

    async getById(id: string, requesterId: string): Promise<CaseShareRecord | null> {
        const existing = await loadRecordById(id);
        if (!existing) return null;
        if (existing.ownerId !== requesterId && existing.recipientId !== requesterId) return null;
        const normalized = await normalizeForViewer(existing, requesterId);
        if (!canFetchShareDetail(normalized, requesterId)) return null;
        return normalized;
    },

    async updateStatus(id: string, recipientId: string, status: CaseShareStatus): Promise<CaseShareRecord | null> {
        const existing = await loadRecordById(id);
        if (!existing || existing.recipientId !== recipientId) return null;
        const now = new Date().toISOString();
        const updated: CaseShareRecord = {
            ...existing,
            status,
            respondedAt: now,
            ...(status === 'accepted' ? { sessionStartedAt: now } : {}),
        };
        await persistRecord(updated);
        dispatchCaseShareChanged();
        return updated;
    },

    async endSession(id: string, userId: string): Promise<CaseShareRecord | null> {
        const existing = await loadRecordById(id);
        if (!existing) return null;
        if (existing.status !== 'accepted') return null;
        if (existing.ownerId !== userId && existing.recipientId !== userId) return null;
        const updated: CaseShareRecord = {
            ...existing,
            status: 'ended',
            sessionEndedAt: new Date().toISOString(),
            endedByUserId: userId,
        };
        await persistRecord(updated);
        dispatchCaseShareChanged();
        return updated;
    },

    /**
     * ينهي جلسات المشاركة المعلّقة/النشطة عند حذف الإضبارة نهائياً.
     * يُرجع عدد السجلات التي تغيّرت.
     */
    async revokeSharesForDossier(
        ownerId: string,
        dossierId: string,
        modules: CaseShareDossierModule[] = LAWSUIT_SHARE_MODULES,
    ): Promise<number> {
        const uid = String(ownerId ?? '').trim();
        const dossierKey = String(dossierId ?? '').trim();
        if (!uid || !dossierKey) return 0;

        const moduleSet = new Set(modules);
        const rows = await loadLocal();
        const now = new Date().toISOString();
        let revokedCount = 0;

        const next = rows.map((share) => {
            if (!shouldRevokeShareForDossier(share, uid, dossierKey, moduleSet)) {
                return share;
            }
            revokedCount += 1;
            return buildRevokedShareRecord(share, now);
        });

        if (revokedCount === 0) return 0;

        await persistAllRecords(next);
        dispatchCaseShareChanged();
        return revokedCount;
    },
};

export type { CaseShareMaskedView };
