import { loadKvStoreAdmin } from '@/app/api/security/loadKvStoreAdmin';

export type FcmDeviceToken = {
    token: string;
    platform: 'android' | 'ios';
    updatedAt: string;
};

type FcmTokenRecord = {
    devices: FcmDeviceToken[];
};

const kvKey = (userId: string) => `hami:fcm:${userId}`;

async function readRecord(userId: string): Promise<FcmTokenRecord> {
    const kv = await loadKvStoreAdmin();
    if (!kv) return { devices: [] };
    const raw = await kv.kvGet(kvKey(userId));
    if (!raw || typeof raw !== 'object') return { devices: [] };
    const devices = (raw as FcmTokenRecord).devices;
    return { devices: Array.isArray(devices) ? devices : [] };
}

async function writeRecord(userId: string, record: FcmTokenRecord): Promise<void> {
    const kv = await loadKvStoreAdmin();
    if (!kv) throw new Error('KV admin unavailable');
    await kv.kvSet(kvKey(userId), record);
}

export async function saveFcmTokenServer(
    userId: string,
    token: string,
    platform: 'android' | 'ios',
): Promise<void> {
    const trimmed = token.trim();
    if (!userId.trim() || !trimmed || trimmed.length > 4096) return;

    const record = await readRecord(userId);
    const now = new Date().toISOString();
    const without = record.devices.filter((d) => d.token !== trimmed);
    without.unshift({ token: trimmed, platform, updatedAt: now });
    await writeRecord(userId, { devices: without.slice(0, 8) });
}

export async function listFcmTokensServer(userId: string): Promise<FcmDeviceToken[]> {
    const record = await readRecord(userId);
    return record.devices;
}

export async function removeFcmTokenServer(userId: string, token: string): Promise<void> {
    const record = await readRecord(userId);
    await writeRecord(userId, {
        devices: record.devices.filter((d) => d.token !== token),
    });
}
