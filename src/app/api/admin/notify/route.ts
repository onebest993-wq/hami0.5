import { isJsonObjectRecord, sanitizePayload } from '../../security/sanitizer.ts';
import { requireTrustedHeadquartersAdmin } from '../../security/requireTrustedHeadquartersAdmin.ts';
import { getSupabaseAdminClient } from '../../security/supabaseAdminClient.ts';
import { wifeJsonResponse } from '../../security/wifeSecurityHeaders.ts';
import { consumeRateLimitSlot } from '../../security/wifeRateLimitStore.ts';
import { recordHeadquartersAudit } from '../../security/headquartersAudit.ts';
import { isPostgresUuidSubject } from '../../security/postgresUuidSubject.ts';
import {
    isHeadquartersAdminRole,
    isHeadquartersProtectedAdminId,
} from '../../security/headquartersUserMap.ts';
import { listHeadquartersNotifyRecipientIds } from '../../security/headquartersUsers.ts';
import { notifyHeadquartersSystemMessage } from '../../security/headquartersAccountNotify.ts';
import {
    clampNotificationInboxText,
    MAX_NOTIFICATION_MESSAGE_LEN,
    MAX_NOTIFICATION_TITLE_LEN,
} from '@/app/services/notifications/notificationInboxSanitize';

export const runtime = 'nodejs';

const SELECTED_CAP = 100;
const BROADCAST_CONCURRENCY = 6;

function uniqueUuids(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of raw) {
        const id = String(item ?? '').trim();
        if (!isPostgresUuidSubject(id) || seen.has(id.toLowerCase())) continue;
        seen.add(id.toLowerCase());
        out.push(id);
        if (out.length >= SELECTED_CAP) break;
    }
    return out;
}

async function mapPool(ids: string[], fn: (id: string) => Promise<boolean>): Promise<{ sent: number; failed: number }> {
    let cursor = 0;
    let sent = 0;
    let failed = 0;
    const worker = async () => {
        while (cursor < ids.length) {
            const index = cursor;
            cursor += 1;
            const id = ids[index];
            if (!id) continue;
            const ok = await fn(id);
            if (ok) sent += 1;
            else failed += 1;
        }
    };
    const pool = Math.min(BROADCAST_CONCURRENCY, Math.max(1, ids.length));
    await Promise.all(Array.from({ length: pool }, () => worker()));
    return { sent, failed };
}

export async function POST(request: Request): Promise<Response> {
    try {
        const gate = await requireTrustedHeadquartersAdmin(request, { stepUp: true });
        if (!gate.ok) return gate.response;

        const allowed = await consumeRateLimitSlot(`admin-hq-notify:${gate.userId}`, {
            maxRequests: 12,
            windowMs: 15 * 60_000,
        });
        if (!allowed) {
            return wifeJsonResponse(429, { ok: false, error: 'تجاوزت حد عمليات المقر — حاول لاحقاً' });
        }

        let payload: unknown = null;
        try {
            payload = sanitizePayload(await request.json());
        } catch {
            payload = null;
        }
        if (!isJsonObjectRecord(payload)) {
            return wifeJsonResponse(400, { ok: false, error: 'Invalid payload' });
        }

        const title = clampNotificationInboxText(payload.title, MAX_NOTIFICATION_TITLE_LEN);
        const message = clampNotificationInboxText(payload.message, MAX_NOTIFICATION_MESSAGE_LEN);
        if (!title || !message) {
            return wifeJsonResponse(400, { ok: false, error: 'العنوان والنص مطلوبان' });
        }

        const scope = String(payload.scope ?? '').trim();
        if (scope !== 'all' && scope !== 'users') {
            return wifeJsonResponse(400, { ok: false, error: 'scope يجب أن يكون all أو users' });
        }

        const admin = getSupabaseAdminClient();
        if (!admin) {
            return wifeJsonResponse(503, { ok: false, error: 'Database client not configured' });
        }

        let recipientIds: string[] = [];
        let capped = false;
        if (scope === 'all') {
            const listed = await listHeadquartersNotifyRecipientIds(admin);
            recipientIds = listed.ids;
            capped = listed.capped;
        } else {
            recipientIds = uniqueUuids(payload.userIds);
            if (recipientIds.length === 0) {
                return wifeJsonResponse(400, { ok: false, error: 'اختر مستخدمين صالحين' });
            }
            if (recipientIds.some((id) => isHeadquartersProtectedAdminId(id))) {
                return wifeJsonResponse(403, { ok: false, error: 'لا يمكن إرسال إشعار لمدير المنصّة بهذا المسار' });
            }
            const { data: roleRows, error: roleError } = await admin
                .from('profiles')
                .select('id, role')
                .in('id', recipientIds);
            if (roleError || !Array.isArray(roleRows)) {
                return wifeJsonResponse(500, { ok: false, error: 'تعذّر التحقق من المستلمين' });
            }
            const roleById = new Map(
                roleRows.map((row) => {
                    const id = String((row as { id?: unknown }).id ?? '')
                        .trim()
                        .toLowerCase();
                    return [id, (row as { role?: unknown }).role] as const;
                }),
            );
            for (const id of recipientIds) {
                const role = roleById.get(id.toLowerCase());
                if (role === undefined) {
                    return wifeJsonResponse(404, { ok: false, error: 'أحد المستلمين غير موجود' });
                }
                if (isHeadquartersAdminRole(role)) {
                    return wifeJsonResponse(403, { ok: false, error: 'لا يمكن إرسال إشعار لحساب إدارة بهذا المسار' });
                }
            }
        }

        const batchId =
            typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                ? crypto.randomUUID()
                : `b${Date.now()}`;

        const { sent, failed } = await mapPool(recipientIds, (userId) =>
            notifyHeadquartersSystemMessage({
                userId,
                title,
                message,
                dedupeKey: `hq:sys:${batchId}:${userId}`,
            }),
        );

        const auditRecorded = await recordHeadquartersAudit({
            actorId: gate.userId,
            action: scope === 'all' ? 'notify.system_all' : 'notify.system_users',
            details: { sent, failed, capped, count: recipientIds.length },
        });

        if (sent === 0) {
            return wifeJsonResponse(502, {
                ok: false,
                error: 'تعذّر حفظ إشعار النظام للمستلمين',
                sent,
                failed,
                capped,
                count: recipientIds.length,
                auditRecorded,
            });
        }

        return wifeJsonResponse(200, {
            ok: true,
            sent,
            failed,
            capped,
            count: recipientIds.length,
            auditRecorded,
        });
    } catch {
        return wifeJsonResponse(500, { ok: false, error: 'Internal admin notify error' });
    }
}
