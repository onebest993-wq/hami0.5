import {
    BUILTIN_NOTIFICATION_SOUND,
    BUILTIN_NOTIFICATION_VIBRATE,
    BUILTIN_NOTIFICATIONS_ENABLED,
    BUILTIN_QUIET_HOURS,
    BUILTIN_QUIET_HOURS_END,
    BUILTIN_QUIET_HOURS_START,
    BUILTIN_SMART_ALERTS,
} from './builtInBehavior';

export const NOTIFICATION_CHANNEL_KEYS = [
    'lawsuits',
    'execution',
    'calendar',
    'community',
    'financial',
    'secretary',
] as const;

export type NotificationChannelKey = (typeof NOTIFICATION_CHANNEL_KEYS)[number];

export interface NotificationChannelPrefs {
    enabled: boolean;
    sound: boolean;
    push: boolean;
    inApp: boolean;
}

export interface NotificationQuietHours {
    enabled: boolean;
    start: string;
    end: string;
}

export interface NotificationSettings {
    masterEnabled: boolean;
    soundMaster: boolean;
    vibrateMaster: boolean;
    secretaryEnabled: boolean;
    quietHours: NotificationQuietHours;
    channels: Record<NotificationChannelKey, NotificationChannelPrefs>;
    /** إيقاف سريع من لوحة الإشعارات — timestamp بالمللي */
    sessionMutedUntil: number | null;
}

export const NOTIFICATION_CHANNEL_LABELS: Record<NotificationChannelKey, string> = {
    lawsuits: 'الدعاوى',
    execution: 'التنفيذ',
    calendar: 'التقويم والمواعيد',
    community: 'المنتدى',
    financial: 'المعاملات',
    secretary: 'السكرتير الذكي',
};

function defaultChannelPrefs(): NotificationChannelPrefs {
    return {
        enabled: true,
        sound: true,
        push: true,
        inApp: true,
    };
}

export const NOTIFICATION_SETTINGS_DEFAULTS: NotificationSettings = {
    masterEnabled: BUILTIN_NOTIFICATIONS_ENABLED,
    soundMaster: BUILTIN_NOTIFICATION_SOUND,
    vibrateMaster: BUILTIN_NOTIFICATION_VIBRATE,
    secretaryEnabled: BUILTIN_SMART_ALERTS,
    quietHours: {
        enabled: BUILTIN_QUIET_HOURS,
        start: BUILTIN_QUIET_HOURS_START,
        end: BUILTIN_QUIET_HOURS_END,
    },
    channels: {
        lawsuits: defaultChannelPrefs(),
        execution: defaultChannelPrefs(),
        calendar: defaultChannelPrefs(),
        community: defaultChannelPrefs(),
        financial: defaultChannelPrefs(),
        secretary: defaultChannelPrefs(),
    },
    sessionMutedUntil: null,
};

function normalizeHm(value: unknown, fallback: string): string {
    if (typeof value !== 'string') return fallback;
    const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
    if (!m) return fallback;
    const h = Math.min(23, Math.max(0, Number(m[1])));
    const min = Math.min(59, Math.max(0, Number(m[2])));
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function normalizeChannelPrefs(raw: unknown): NotificationChannelPrefs {
    const base = defaultChannelPrefs();
    if (!raw || typeof raw !== 'object') return base;
    const o = raw as Partial<NotificationChannelPrefs>;
    return {
        enabled: o.enabled !== false,
        sound: o.sound !== false,
        push: o.push !== false,
        inApp: o.inApp !== false,
    };
}

export function normalizeNotificationSettings(raw: unknown): NotificationSettings {
    const base = NOTIFICATION_SETTINGS_DEFAULTS;
    if (!raw || typeof raw !== 'object') return { ...base, channels: { ...base.channels } };

    const o = raw as Partial<NotificationSettings>;
    const channels = { ...base.channels };
    const rawChannels = o.channels;
    if (rawChannels && typeof rawChannels === 'object') {
        for (const key of NOTIFICATION_CHANNEL_KEYS) {
            channels[key] = normalizeChannelPrefs(
                (rawChannels as Record<string, unknown>)[key],
            );
        }
    }

    const sessionMutedUntil =
        typeof o.sessionMutedUntil === 'number' && Number.isFinite(o.sessionMutedUntil)
            ? o.sessionMutedUntil
            : null;

    return {
        masterEnabled: o.masterEnabled !== false,
        soundMaster: o.soundMaster !== false,
        vibrateMaster: o.vibrateMaster !== false,
        secretaryEnabled: o.secretaryEnabled !== false,
        quietHours: {
            enabled: o.quietHours?.enabled === true,
            start: normalizeHm(o.quietHours?.start, base.quietHours.start),
            end: normalizeHm(o.quietHours?.end, base.quietHours.end),
        },
        channels,
        sessionMutedUntil,
    };
}

export function patchNotificationSettings(
    current: NotificationSettings,
    patch: Partial<NotificationSettings> & {
        channel?: NotificationChannelKey;
        channelPatch?: Partial<NotificationChannelPrefs>;
    },
): NotificationSettings {
    const next: NotificationSettings = {
        ...current,
        ...patch,
        quietHours: patch.quietHours
            ? { ...current.quietHours, ...patch.quietHours }
            : current.quietHours,
        channels: { ...current.channels },
    };

    if (patch.channels) {
        for (const key of NOTIFICATION_CHANNEL_KEYS) {
            const ch = patch.channels[key];
            if (ch) {
                next.channels[key] = { ...current.channels[key], ...ch };
            }
        }
    }

    if (patch.channel && patch.channelPatch) {
        next.channels[patch.channel] = {
            ...current.channels[patch.channel],
            ...patch.channelPatch,
        };
    }

    return normalizeNotificationSettings(next);
}

export function sessionMuteUntilMs(minutes: number): number {
    return Date.now() + minutes * 60_000;
}

export function sessionMuteUntilTomorrowMorning(): number {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(7, 0, 0, 0);
    return d.getTime();
}
