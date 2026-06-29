import type { NotificationModel } from '@/app/infrastructure/NotificationRepository';
import { capNotificationList } from '@/app/services/notifications/notificationLimits';
import { getForumSupabaseAdmin } from '@/app/services/forum/supabaseAdmin';
import {
    isShellNotificationSupabaseEnabled,
} from '@/app/services/notifications/notificationStoragePolicy';

const INBOX_TABLE = 'lawyer_shell_notifications';
const INBOX_VIEW = 'lawyer_shell_notification_inbox_v';
const EVENTS_TABLE = 'lawyer_shell_notification_events';
const REBUILD_RPC = 'rebuild_lawyer_shell_inbox_from_events';
const DEFAULT_LIST_LIMIT = 400;

type ShellNotificationRow = {
    user_id: string;
    id: string;
    title: string;
    message: string;
    notification_type: string;
    category: string | null;
    direction: string | null;
    is_read: boolean;
    dedupe_key: string | null;
    action_payload: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
};

export type ShellNotificationEventType = 'created' | 'updated' | 'read' | 'read_all' | 'merged';

export { isShellNotificationSupabaseEnabled } from '@/app/services/notifications/notificationStoragePolicy';

function dedupeKeyFromModel(n: NotificationModel): string | null {
    const payload = n.actionPayload;
    if (!payload || typeof payload !== 'object') return null;
    const key = String((payload as Record<string, unknown>).dedupeKey ?? '').trim();
    return key || null;
}

export function mapRowToNotificationModel(row: ShellNotificationRow): NotificationModel {
    return {
        id: row.id,
        title: row.title,
        message: row.message,
        type: row.notification_type as NotificationModel['type'],
        category: (row.category ?? undefined) as NotificationModel['category'],
        direction: (row.direction ?? undefined) as NotificationModel['direction'],
        isRead: row.is_read,
        actionPayload:
            row.action_payload && typeof row.action_payload === 'object' ? row.action_payload : {},
        createdAt: row.created_at,
    };
}

function mapModelToRow(userId: string, n: NotificationModel): ShellNotificationRow {
    const now = new Date().toISOString();
    return {
        user_id: userId,
        id: n.id,
        title: n.title,
        message: n.message,
        notification_type: n.type,
        category: n.category ?? null,
        direction: n.direction ?? 'incoming',
        is_read: n.isRead,
        dedupe_key: dedupeKeyFromModel(n),
        action_payload:
            n.actionPayload && typeof n.actionPayload === 'object' ? n.actionPayload : {},
        created_at: n.createdAt || now,
        updated_at: now,
    };
}

async function appendEvent(
    userId: string,
    notificationId: string,
    eventType: ShellNotificationEventType,
    payload: Record<string, unknown>,
    dedupeKey?: string | null,
): Promise<void> {
    const admin = getForumSupabaseAdmin();
    if (!admin) return;
    await admin.from(EVENTS_TABLE).insert({
        user_id: userId,
        notification_id: notificationId,
        event_type: eventType,
        dedupe_key: dedupeKey ?? null,
        payload,
    });
}

export async function listShellNotificationsSupabase(
    userId: string,
    limit = DEFAULT_LIST_LIMIT,
): Promise<NotificationModel[]> {
    const admin = getForumSupabaseAdmin();
    if (!admin) return [];

    const { data, error } = await admin
        .from(INBOX_VIEW)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error || !Array.isArray(data)) return [];
    return (data as ShellNotificationRow[]).map(mapRowToNotificationModel);
}

export type ShellNotificationSchemaStatus = {
    ok: boolean;
    inbox: boolean;
    events: boolean;
    inboxView: boolean;
};

/** تحقق من وجود جداول/view بعد migration 027. */
export async function verifyShellNotificationSchema(): Promise<ShellNotificationSchemaStatus> {
    const admin = getForumSupabaseAdmin();
    if (!admin) {
        return { ok: false, inbox: false, events: false, inboxView: false };
    }

    const [inbox, events, view] = await Promise.all([
        admin.from(INBOX_TABLE).select('user_id').limit(0),
        admin.from(EVENTS_TABLE).select('user_id').limit(0),
        admin.from(INBOX_VIEW).select('user_id').limit(0),
    ]);

    const inboxOk = !inbox.error;
    const eventsOk = !events.error;
    const viewOk = !view.error;

    return {
        ok: inboxOk && eventsOk && viewOk,
        inbox: inboxOk,
        events: eventsOk,
        inboxView: viewOk,
    };
}

/** إعادة بناء inbox من event log — صيانة/تعافي. */
export async function rebuildInboxFromEventsSupabase(userId: string): Promise<number> {
    const admin = getForumSupabaseAdmin();
    if (!admin) return -1;

    const { data, error } = await admin.rpc(REBUILD_RPC, { p_user_id: userId });
    if (error) return -1;
    return typeof data === 'number' ? data : 0;
}

export async function upsertShellNotificationSupabase(
    userId: string,
    model: NotificationModel,
    eventType: ShellNotificationEventType = 'updated',
): Promise<NotificationModel | null> {
    const admin = getForumSupabaseAdmin();
    if (!admin) return null;

    const row = mapModelToRow(userId, model);
    const { error } = await admin.from(INBOX_TABLE).upsert(row, { onConflict: 'user_id,id' });
    if (error) return null;

    await appendEvent(
        userId,
        model.id,
        eventType,
        { notification: model },
        row.dedupe_key,
    ).catch(() => undefined);

    return model;
}

export async function upsertShellNotificationsSupabase(
    userId: string,
    models: NotificationModel[],
    eventType: ShellNotificationEventType = 'merged',
): Promise<NotificationModel[]> {
    const capped = capNotificationList(models);
    if (capped.length === 0) return [];

    const admin = getForumSupabaseAdmin();
    if (!admin) return [];

    const rows = capped.map((n) => mapModelToRow(userId, n));
    const { error } = await admin.from(INBOX_TABLE).upsert(rows, { onConflict: 'user_id,id' });
    if (error) return [];

    await appendEvent(userId, '*', eventType, { count: capped.length }).catch(() => undefined);
    return capped;
}

export async function markShellNotificationReadSupabase(
    userId: string,
    notificationId: string,
): Promise<NotificationModel[]> {
    const admin = getForumSupabaseAdmin();
    if (!admin) return [];

    const now = new Date().toISOString();
    const { data: existing, error: readErr } = await admin
        .from(INBOX_TABLE)
        .select('*')
        .eq('user_id', userId)
        .eq('id', notificationId)
        .maybeSingle();

    if (readErr || !existing) return listShellNotificationsSupabase(userId);

    const row = existing as ShellNotificationRow;
    const payload = {
        ...(row.action_payload && typeof row.action_payload === 'object' ? row.action_payload : {}),
        readSyncedBy: 'server',
        readSyncedAt: now,
    };

    await admin
        .from(INBOX_TABLE)
        .update({ is_read: true, action_payload: payload, updated_at: now })
        .eq('user_id', userId)
        .eq('id', notificationId);

    await appendEvent(userId, notificationId, 'read', { notificationId }, row.dedupe_key).catch(
        () => undefined,
    );

    return listShellNotificationsSupabase(userId);
}

export async function markAllShellNotificationsReadSupabase(userId: string): Promise<NotificationModel[]> {
    const admin = getForumSupabaseAdmin();
    if (!admin) return [];

    const now = new Date().toISOString();
    await admin
        .from(INBOX_TABLE)
        .update({ is_read: true, updated_at: now })
        .eq('user_id', userId)
        .eq('is_read', false);

    await appendEvent(userId, '*', 'read_all', { at: now }).catch(() => undefined);
    return listShellNotificationsSupabase(userId);
}

export async function findShellNotificationByDedupeSupabase(
    userId: string,
    dedupeKey: string,
): Promise<NotificationModel | null> {
    const admin = getForumSupabaseAdmin();
    if (!admin || !dedupeKey.trim()) return null;

    const { data, error } = await admin
        .from(INBOX_TABLE)
        .select('*')
        .eq('user_id', userId)
        .eq('dedupe_key', dedupeKey)
        .maybeSingle();

    if (error || !data) return null;
    return mapRowToNotificationModel(data as ShellNotificationRow);
}

/** مسح inbox + event log للمستخدم (wipe / GDPR). */
export async function deleteAllShellNotificationsSupabase(userId: string): Promise<boolean> {
    const admin = getForumSupabaseAdmin();
    if (!admin) return false;

    const { error: eventsErr } = await admin.from(EVENTS_TABLE).delete().eq('user_id', userId);
    const { error: inboxErr } = await admin.from(INBOX_TABLE).delete().eq('user_id', userId);

    return !eventsErr && !inboxErr;
}
