import SecureStoreService from '@/app/services/SecureStoreService';
import { lawyerCloudKv as kv, uuidv4 } from '@/app/services/cloud/lawyerCloudKv';

const LAWYER_LOCAL_PREFIX = 'hami:lawyerdb:';

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object';
}

export const LawyerDB = {
    async saveUserProfile(userId: string, data: Record<string, unknown>) {
        try {
            await kv.set(`user:${userId}:profile`, data);
        } catch {
            const key = `${LAWYER_LOCAL_PREFIX}${userId}:profile`;
            await SecureStoreService.setItem(key, JSON.stringify(data));
        }
    },

    async getUserProfile(userId: string) {
        try {
            return await kv.get(`user:${userId}:profile`);
        } catch {
            const key = `${LAWYER_LOCAL_PREFIX}${userId}:profile`;
            const raw = await SecureStoreService.getItem(key);
            return raw ? JSON.parse(raw) : null;
        }
    },

    async saveCase(userId: string, caseData: Record<string, unknown>) {
        const providedId = typeof caseData.id === 'string' ? caseData.id : undefined;
        const id = providedId ?? uuidv4();
        const key = `user:${userId}:cases:${id}`;
        try {
            await kv.set(key, { ...caseData, id, updatedAt: new Date().toISOString() });
        } catch {
            const existing = await this.getCases(userId);
            const updated = [
                ...(Array.isArray(existing) ? existing : []).filter((c: any) => c.id !== id),
                { ...caseData, id, updatedAt: new Date().toISOString() },
            ];
            await SecureStoreService.setItem(`${LAWYER_LOCAL_PREFIX}${userId}:cases`, JSON.stringify(updated));
        }
        return id;
    },

    async getCases(userId: string) {
        try {
            const cases = await kv.getByPrefix(`user:${userId}:cases:`);
            return cases || [];
        } catch {
            const raw = await SecureStoreService.getItem(`${LAWYER_LOCAL_PREFIX}${userId}:cases`);
            return raw ? JSON.parse(raw) : [];
        }
    },

    async saveNote(userId: string, noteData: Record<string, unknown>) {
        const providedId = typeof noteData.id === 'string' ? noteData.id : undefined;
        const id = providedId ?? uuidv4();
        const key = `user:${userId}:notes:${id}`;
        try {
            await kv.set(key, { ...noteData, id, createdAt: new Date().toISOString() });
        } catch {
            const existing = await this.getNotes(userId);
            const updated = [
                ...(Array.isArray(existing) ? existing : []).filter((n: any) => n.id !== id),
                { ...noteData, id, createdAt: new Date().toISOString() },
            ];
            await SecureStoreService.setItem(`${LAWYER_LOCAL_PREFIX}${userId}:notes`, JSON.stringify(updated));
        }
        return id;
    },

    async getNotes(userId: string) {
        try {
            const notes = await kv.getByPrefix(`user:${userId}:notes:`);
            return notes || [];
        } catch {
            const raw = await SecureStoreService.getItem(`${LAWYER_LOCAL_PREFIX}${userId}:notes`);
            return raw ? JSON.parse(raw) : [];
        }
    },

    async saveDeadline(userId: string, deadlineData: Record<string, unknown>) {
        const providedId = typeof deadlineData.id === 'string' ? deadlineData.id : undefined;
        const id = providedId ?? uuidv4();
        const key = `user:${userId}:deadlines:${id}`;
        try {
            await kv.set(key, { ...deadlineData, id, status: 'pending' });
        } catch {
            const existing = await this.getDeadlines(userId);
            const updated = [
                ...(Array.isArray(existing) ? existing : []).filter((d: any) => d.id !== id),
                { ...deadlineData, id, status: 'pending' },
            ];
            await SecureStoreService.setItem(`${LAWYER_LOCAL_PREFIX}${userId}:deadlines`, JSON.stringify(updated));
        }
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
        try {
            return (await kv.getByPrefix(`user:${userId}:deadlines:`)) || [];
        } catch {
            const raw = await SecureStoreService.getItem(`${LAWYER_LOCAL_PREFIX}${userId}:deadlines`);
            return raw ? JSON.parse(raw) : [];
        }
    },
};
