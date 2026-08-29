import SecureStoreService from '@/app/services/SecureStoreService';
import { lawyerCloudKv as kv, uuidv4 } from '@/app/services/cloud/lawyerCloudKv';
import { isLawyerWorkCloudLive } from '@/app/services/settings/lawyerWorkCloudGate';
import { isLiveCloudSyncBucketEnabled } from '@/app/services/settings/cloudSyncBucket';

const LAWYER_LOCAL_PREFIX = 'hami:lawyerdb:';

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object';
}

function localBagKey(userId: string, bag: 'profile' | 'cases' | 'notes' | 'deadlines'): string {
    return `${LAWYER_LOCAL_PREFIX}${userId}:${bag}`;
}

function parseJsonArray(raw: string | null): unknown[] {
    if (!raw) return [];
    try {
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function parseJsonObject(raw: string | null): Record<string, unknown> | null {
    if (!raw) return null;
    try {
        const parsed: unknown = JSON.parse(raw);
        return isRecord(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

function rowId(row: unknown): string | null {
    if (!isRecord(row) || typeof row.id !== 'string' || !row.id.trim()) return null;
    return row.id;
}

async function loadLocalBag(userId: string, bag: 'cases' | 'notes' | 'deadlines'): Promise<unknown[]> {
    return parseJsonArray(await SecureStoreService.getItem(localBagKey(userId, bag)));
}

async function saveLocalBag(
    userId: string,
    bag: 'cases' | 'notes' | 'deadlines',
    rows: unknown[],
): Promise<void> {
    await SecureStoreService.setItem(localBagKey(userId, bag), JSON.stringify(rows));
}

function upsertById(existing: unknown[], next: Record<string, unknown>): unknown[] {
    const id = String(next.id);
    return [...existing.filter((row) => rowId(row) !== id), next];
}

export const LawyerDB = {
    async saveUserProfile(userId: string, data: Record<string, unknown>) {
        try {
            await kv.set(`user:${userId}:profile`, data);
        } catch {
            await SecureStoreService.setItem(localBagKey(userId, 'profile'), JSON.stringify(data));
        }
    },

    async getUserProfile(userId: string) {
        try {
            return await kv.get(`user:${userId}:profile`);
        } catch {
            return parseJsonObject(await SecureStoreService.getItem(localBagKey(userId, 'profile')));
        }
    },

    async saveCase(userId: string, caseData: Record<string, unknown>) {
        const providedId = typeof caseData.id === 'string' ? caseData.id : undefined;
        const id = providedId ?? uuidv4();
        const payload = { ...caseData, id, updatedAt: new Date().toISOString() };
        if (isLiveCloudSyncBucketEnabled('files')) {
            try {
                await kv.set(`user:${userId}:cases:${id}`, payload);
                return id;
            } catch {
                /* محلي */
            }
        }
        const existing = await loadLocalBag(userId, 'cases');
        await saveLocalBag(userId, 'cases', upsertById(existing, payload));
        return id;
    },

    async getCases(userId: string) {
        if (isLiveCloudSyncBucketEnabled('files')) {
            try {
                const cases = await kv.getByPrefix(`user:${userId}:cases:`);
                return cases || [];
            } catch {
                /* محلي */
            }
        }
        return loadLocalBag(userId, 'cases');
    },

    async saveNote(userId: string, noteData: Record<string, unknown>) {
        const providedId = typeof noteData.id === 'string' ? noteData.id : undefined;
        const id = providedId ?? uuidv4();
        const payload = { ...noteData, id, createdAt: new Date().toISOString() };
        if (isLiveCloudSyncBucketEnabled('notes')) {
            try {
                await kv.set(`user:${userId}:notes:${id}`, payload);
                return id;
            } catch {
                /* محلي */
            }
        }
        const existing = await loadLocalBag(userId, 'notes');
        await saveLocalBag(userId, 'notes', upsertById(existing, payload));
        return id;
    },

    async getNotes(userId: string) {
        if (isLiveCloudSyncBucketEnabled('notes')) {
            try {
                const notes = await kv.getByPrefix(`user:${userId}:notes:`);
                return notes || [];
            } catch {
                /* محلي */
            }
        }
        return loadLocalBag(userId, 'notes');
    },

    async saveDeadline(userId: string, deadlineData: Record<string, unknown>) {
        const providedId = typeof deadlineData.id === 'string' ? deadlineData.id : undefined;
        const id = providedId ?? uuidv4();
        const payload = { ...deadlineData, id, status: 'pending' };
        if (isLawyerWorkCloudLive()) {
            try {
                await kv.set(`user:${userId}:deadlines:${id}`, payload);
                return id;
            } catch {
                /* محلي */
            }
        }
        const existing = await loadLocalBag(userId, 'deadlines');
        await saveLocalBag(userId, 'deadlines', upsertById(existing, payload));
        return id;
    },

    async checkUpcomingDeadlines(userId: string) {
        const deadlines = await this.getDeadlines(userId);
        const list = Array.isArray(deadlines) ? deadlines : [];
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        return list.filter((d) => {
            if (!isRecord(d) || typeof d.date !== 'string') return false;
            const date = new Date(d.date);
            const t = date.getTime();
            return t >= tomorrow.getTime() && t < tomorrow.getTime() + 86400000;
        });
    },

    async getDeadlines(userId: string) {
        if (isLawyerWorkCloudLive()) {
            try {
                return (await kv.getByPrefix(`user:${userId}:deadlines:`)) || [];
            } catch {
                /* محلي */
            }
        }
        return loadLocalBag(userId, 'deadlines');
    },
};
