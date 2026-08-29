import crypto from 'node:crypto';
import { HAMI_NATIVE_CHANNEL_IDS } from '@/app/services/notifications/native/nativeNotificationChannels';
import {
    HAMI_ARRIVAL_SOUND_RAW,
    HAMI_LEGAL_ALARM_SOUND_RAW,
} from '@/app/services/notifications/native/hamiNativeSound';
import {
    isNotificationNavTarget,
    sanitizeNotificationCalendarDate,
    sanitizeNotificationEntityId,
} from '@/app/services/notifications/notificationNavigateSecurity';
import type { NotificationInboxChannelKey } from '@/app/services/settings/notificationSettings';
import { listFcmTokensServer, removeFcmTokenServer } from './fcmTokenStore.server';

type ServiceAccount = {
    project_id: string;
    client_email: string;
    private_key: string;
};

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

function parseServiceAccount(): ServiceAccount | null {
    const raw = process.env.FCM_SERVICE_ACCOUNT_JSON?.trim();
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as ServiceAccount;
        if (!parsed.project_id || !parsed.client_email || !parsed.private_key) return null;
        return parsed;
    } catch {
        return null;
    }
}

export function isFcmServerConfigured(): boolean {
    return parseServiceAccount() !== null;
}

function base64url(input: string | Buffer): string {
    return Buffer.from(input).toString('base64url');
}

async function getAccessToken(account: ServiceAccount): Promise<string | null> {
    const now = Date.now();
    if (cachedAccessToken && cachedAccessToken.expiresAt > now + 60_000) {
        return cachedAccessToken.token;
    }

    const iat = Math.floor(now / 1000);
    const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payload = base64url(
        JSON.stringify({
            iss: account.client_email,
            sub: account.client_email,
            aud: 'https://oauth2.googleapis.com/token',
            iat,
            exp: iat + 3600,
            scope: 'https://www.googleapis.com/auth/firebase.messaging',
        }),
    );
    const signInput = `${header}.${payload}`;
    const sign = crypto.createSign('RSA-SHA256').update(signInput).sign(account.private_key, 'base64url');
    const assertion = `${signInput}.${sign}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion,
        }),
    });

    if (!res.ok) return null;
    const json = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!json.access_token) return null;

    cachedAccessToken = {
        token: json.access_token,
        expiresAt: now + (json.expires_in ?? 3600) * 1000,
    };
    return json.access_token;
}

export type FcmInboxPushInput = {
    userId: string;
    title: string;
    body: string;
    channel: NotificationInboxChannelKey;
    data?: Record<string, string>;
};

const FCM_DATA_KEYS = new Set([
    'type',
    'notificationId',
    'postId',
    'path',
    'channel',
    'category',
    'eventId',
    'date',
    'caseId',
    'fileId',
    'caseNo',
    'forumType',
]);

function stringifyData(data?: Record<string, string>): Record<string, string> {
    const out: Record<string, string> = {};
    if (!data) return out;
    for (const [key, value] of Object.entries(data)) {
        if (!FCM_DATA_KEYS.has(key) || typeof value !== 'string' || !value.trim()) continue;
        if (key === 'path') {
            const path = value.trim();
            if (isNotificationNavTarget(path) || path === 'notifications') out.path = path;
            continue;
        }
        const safe =
            key === 'date' ? sanitizeNotificationCalendarDate(value) : sanitizeNotificationEntityId(value);
        if (safe) out[key] = safe;
    }
    return out;
}

async function sendToToken(
    projectId: string,
    accessToken: string,
    deviceToken: string,
    input: FcmInboxPushInput,
): Promise<'ok' | 'invalid' | 'failed'> {
    const channelId = HAMI_NATIVE_CHANNEL_IDS[input.channel];
    const data = stringifyData({
        channel: input.channel,
        ...(input.channel === 'community' ? { path: 'community', category: 'forum' } : { category: 'system' }),
        ...input.data,
    });

    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            message: {
                token: deviceToken,
                notification: {
                    title: input.title,
                    body: input.body,
                },
                data,
                android: {
                    priority: 'HIGH',
                    notification: {
                        channel_id: channelId,
                        sound: input.channel === 'calendar' ? HAMI_LEGAL_ALARM_SOUND_RAW : HAMI_ARRIVAL_SOUND_RAW,
                        default_vibrate_timings: true,
                        visibility: 'PRIVATE',
                    },
                },
            },
        }),
    });

    if (res.ok) return 'ok';
    if (res.status === 404 || res.status === 400) {
        const text = await res.text().catch(() => '');
        if (text.includes('UNREGISTERED') || text.includes('not a valid FCM')) return 'invalid';
    }
    return 'failed';
}

/** يُرسل FCM للمنتدى/النظام — no-op إن لم يُضبط FCM_SERVICE_ACCOUNT_JSON */
export async function sendFcmInboxPushServer(input: FcmInboxPushInput): Promise<void> {
    const account = parseServiceAccount();
    if (!account) return;

    const accessToken = await getAccessToken(account);
    if (!accessToken) return;

    const devices = await listFcmTokensServer(input.userId);
    if (devices.length === 0) return;

    await Promise.allSettled(
        devices.map(async (device) => {
            const result = await sendToToken(account.project_id, accessToken, device.token, input);
            if (result === 'invalid') {
                await removeFcmTokenServer(input.userId, device.token).catch(() => undefined);
            }
        }),
    );
}

export function resetFcmServerCacheForTests(): void {
    cachedAccessToken = null;
}
