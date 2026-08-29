import type { HqAccountActivity, HqAccountTimelineItem } from '@/app/domain/admin/HqAccountActivity';
import type { SupabaseClient } from '@supabase/supabase-js';
import { hqAuditActionLabel, hqAuditFactsCaption } from '@/app/domain/admin/hqAuditLabels';
import { stripHqControlChars } from '@/app/domain/admin/hqSafeText';
import {
    formatHqConnectionDetail,
    formatHqNetworkPlace,
    parseHqDeviceFromUserAgent,
    sanitizeHqIp,
    type HqConnectionFact,
} from '@/app/domain/admin/hqConnectionSignal';
import { listHeadquartersConnectionSignals } from './headquartersConnectionSignal.ts';
import { getGoTrueAdminApi } from './supabaseAdminClient.ts';

export type { HqAccountActivity, HqAccountTimelineItem };

const TIMELINE_CAP = 40;
const EXCERPT_MAX = 80;

function asIso(raw: unknown): string | null {
    if (raw == null || String(raw).trim() === '') return null;
    const iso = raw instanceof Date ? raw.toISOString() : String(raw).trim();
    return Number.isNaN(Date.parse(iso)) ? null : iso;
}

function excerpt(raw: unknown): string | null {
    const text = stripHqControlChars(raw, EXCERPT_MAX);
    return text || null;
}

function pushItem(
    items: HqAccountTimelineItem[],
    at: string | null,
    kind: string,
    label: string,
    detail: string | null,
): void {
    if (!at) return;
    items.push({ at, kind, label, detail });
}

function ingestHqAuditRows(
    data: unknown,
    into: Map<string, { action: string; created_at: unknown; details: unknown }>,
): void {
    for (const row of Array.isArray(data) ? data : []) {
        const rec = row as { id?: unknown; action?: unknown; created_at?: unknown; details?: unknown };
        const action = String(rec.action ?? '').trim();
        if (!action.startsWith('hq:')) continue;
        const key = String(rec.id ?? '').trim() || `${action}:${String(rec.created_at)}`;
        if (!into.has(key)) {
            into.set(key, { action, created_at: rec.created_at, details: rec.details });
        }
    }
}

export async function loadHeadquartersAccountActivity(
    admin: SupabaseClient,
    userId: string,
    profileCreatedAt: string | null,
): Promise<HqAccountActivity> {
    const gaps: string[] = [];
    const timeline: HqAccountTimelineItem[] = [];
    pushItem(timeline, profileCreatedAt, 'account', 'إنشاء الحساب', null);

    let lastSignInAt: string | null = null;
    let emailConfirmedAt: string | null = null;
    let bannedUntil: string | null = null;
    try {
        const { data, error } = await getGoTrueAdminApi(admin).getUserById(userId);
        if (error || !data?.user) {
            gaps.push('auth');
        } else {
            lastSignInAt = asIso(data.user.last_sign_in_at);
            emailConfirmedAt = asIso(data.user.email_confirmed_at);
            bannedUntil = asIso(data.user.banned_until);
            pushItem(timeline, asIso(data.user.created_at), 'auth', 'إنشاء جلسة التوثيق', null);
            pushItem(timeline, lastSignInAt, 'auth', 'آخر دخول مسجّل', null);
            pushItem(timeline, emailConfirmedAt, 'auth', 'تأكيد البريد', null);
        }
    } catch {
        gaps.push('auth');
    }

    let sessionCount: number | null = null;
    let lastDevice: string | null = null;
    let lastIp: string | null = null;
    let lastPlace: string | null = null;
    const connections: HqConnectionFact[] = [];
    try {
        const withIp = await admin
            .from('hq_account_sessions')
            .select('created_at, updated_at, not_after, user_agent, ip', { count: 'exact' })
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20);
        const missingIp =
            Boolean(withIp.error) &&
            /ip/i.test(String(withIp.error?.message ?? '')) &&
            /does not exist|schema cache/i.test(String(withIp.error?.message ?? ''));
        const sessionResult = missingIp
            ? await admin
                  .from('hq_account_sessions')
                  .select('created_at, updated_at, not_after, user_agent', { count: 'exact' })
                  .eq('user_id', userId)
                  .order('created_at', { ascending: false })
                  .limit(20)
            : withIp;
        const { data, error, count } = sessionResult;
        if (error) {
            gaps.push('sessions');
        } else {
            sessionCount = typeof count === 'number' ? count : Array.isArray(data) ? data.length : 0;
            for (const row of Array.isArray(data) ? data : []) {
                const rec = row as {
                    created_at?: unknown;
                    updated_at?: unknown;
                    not_after?: unknown;
                    user_agent?: unknown;
                    ip?: unknown;
                };
                const device = parseHqDeviceFromUserAgent(rec.user_agent);
                const ip = sanitizeHqIp(rec.ip);
                const place = formatHqNetworkPlace({ ip });
                const detail = formatHqConnectionDetail({
                    deviceLabel: device.deviceLabel,
                    ip,
                    place,
                });
                if (!lastDevice && (ip || String(rec.user_agent ?? '').trim())) {
                    lastDevice = device.deviceLabel;
                    lastIp = ip;
                    lastPlace = place;
                }
                pushItem(timeline, asIso(rec.created_at), 'session', 'جلسة', detail);
                const last = asIso(rec.updated_at) ?? asIso(rec.not_after);
                if (last && last !== asIso(rec.created_at)) {
                    pushItem(timeline, last, 'session', 'آخر نشاط للجلسة', detail);
                }
            }
        }
    } catch {
        gaps.push('sessions');
    }

    const signalPack = await listHeadquartersConnectionSignals(admin, userId);
    if (signalPack.failed) {
        gaps.push('connections');
    } else if (signalPack.rows.length > 0) {
        connections.push(...signalPack.rows);
        lastDevice = signalPack.rows[0].deviceLabel;
        lastIp = signalPack.rows[0].ip;
        lastPlace = signalPack.rows[0].place;
    }

    let forumPosts: number | null = null;
    try {
        const { data, error, count } = await admin
            .from('forum_posts')
            .select('content, created_at', { count: 'exact' })
            .eq('author_id', userId)
            .order('created_at', { ascending: false })
            .limit(8);
        if (error) {
            gaps.push('forum_posts');
        } else {
            forumPosts = typeof count === 'number' ? count : Array.isArray(data) ? data.length : 0;
            for (const row of Array.isArray(data) ? data : []) {
                const rec = row as { content?: unknown; created_at?: unknown };
                pushItem(timeline, asIso(rec.created_at), 'forum_post', 'منشور منتدى', excerpt(rec.content));
            }
        }
    } catch {
        gaps.push('forum_posts');
    }

    let forumComments: number | null = null;
    try {
        const { data, error, count } = await admin
            .from('forum_comments')
            .select('content, created_at', { count: 'exact' })
            .eq('author_id', userId)
            .order('created_at', { ascending: false })
            .limit(8);
        if (error) {
            gaps.push('forum_comments');
        } else {
            forumComments = typeof count === 'number' ? count : Array.isArray(data) ? data.length : 0;
            for (const row of Array.isArray(data) ? data : []) {
                const rec = row as { content?: unknown; created_at?: unknown };
                pushItem(timeline, asIso(rec.created_at), 'forum_comment', 'تعليق منتدى', excerpt(rec.content));
            }
        }
    } catch {
        gaps.push('forum_comments');
    }

    let forumBanned: boolean | null = null;
    let forumBanReason: string | null = null;
    let forumBanExpiresAt: string | null = null;
    try {
        const { data, error } = await admin.from('forum_bans').select('reason, expires_at, banned_at').eq('user_id', userId).maybeSingle();
        if (error) {
            gaps.push('forum_bans');
        } else if (data) {
            const expires = asIso((data as { expires_at?: unknown }).expires_at);
            const active = !expires || Date.parse(expires) > Date.now();
            forumBanned = active;
            forumBanReason = active ? excerpt((data as { reason?: unknown }).reason) : null;
            forumBanExpiresAt = active ? expires : null;
            pushItem(
                timeline,
                asIso((data as { banned_at?: unknown }).banned_at),
                'forum_ban',
                active ? 'حظر منتدى ساري' : 'حظر منتدى سابق',
                forumBanReason,
            );
        } else {
            forumBanned = false;
        }
    } catch {
        gaps.push('forum_bans');
    }

    const auditMap = new Map<string, { action: string; created_at: unknown; details: unknown }>();
    let auditFailed = false;
    try {
        const byTarget = await admin
            .from('audit_logs')
            .select('id, action, details, created_at')
            .eq('details->>targetId', userId)
            .order('created_at', { ascending: false })
            .limit(30);
        if (byTarget.error) {
            auditFailed = true;
        } else {
            ingestHqAuditRows(byTarget.data, auditMap);
        }
    } catch {
        auditFailed = true;
    }
    try {
        const byActor = await admin
            .from('audit_logs')
            .select('id, action, details, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(30);
        if (byActor.error) {
            auditFailed = true;
        } else {
            ingestHqAuditRows(byActor.data, auditMap);
        }
    } catch {
        auditFailed = true;
    }
    if (auditFailed && auditMap.size === 0) {
        gaps.push('audit');
    } else {
        for (const rec of auditMap.values()) {
            pushItem(
                timeline,
                asIso(rec.created_at),
                'audit',
                hqAuditActionLabel(rec.action),
                hqAuditFactsCaption(rec.details) || null,
            );
        }
    }

    timeline.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
    return {
        createdAt: profileCreatedAt,
        lastSignInAt,
        emailConfirmedAt,
        bannedUntil,
        sessionCount,
        lastDevice,
        lastIp,
        lastPlace,
        connections,
        forumPosts,
        forumComments,
        forumBanned,
        forumBanReason,
        forumBanExpiresAt,
        timeline: timeline.slice(0, TIMELINE_CAP),
        gaps,
    };
}
