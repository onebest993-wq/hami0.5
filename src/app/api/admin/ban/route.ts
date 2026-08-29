import { isJsonObjectRecord, sanitizePayload } from '../../security/sanitizer.ts';
import { getSupabaseAdminClient } from '../../security/supabaseAdminClient.ts';
import { wifeJsonResponse } from '../../security/wifeSecurityHeaders.ts';
import { requireTrustedHeadquartersAdmin } from '../../security/requireTrustedHeadquartersAdmin.ts';
import { resolveHeadquartersControlTarget, rejectHeadquartersTargetId } from '../../security/headquartersControlTarget.ts';
import { fetchHeadquartersUser, readHeadquartersBanFlags } from '../../security/headquartersUsers.ts';
import { invalidateProfileRoleCache } from '../../security/roleResolver.ts';
import { invalidateWifeUserStatusCache } from '../../security/wifeUserStatus.ts';
import { consumeRateLimitSlot } from '../../security/wifeRateLimitStore.ts';
import { recordHeadquartersAudit } from '../../security/headquartersAudit.ts';
import { notifyHeadquartersAccountStatus } from '../../security/headquartersAccountNotify.ts';
import {
    freezeProfileUpdates,
    isHqProfileLoginLocked,
    liftGoTrueLoginBan,
    unfreezeProfileUpdates,
    updateHeadquartersProfile,
} from '../../security/headquartersAccountControl.ts';

export const runtime = 'nodejs';

const ALLOWED_BAN_UPDATE_KEYS = new Set(['is_banned', 'is_active', 'status']);

function pickBanUpdates(raw: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(raw)) {
        if (!ALLOWED_BAN_UPDATE_KEYS.has(key)) continue;
        if (key === 'is_banned' || key === 'is_active') {
            if (typeof value !== 'boolean') continue;
            out[key] = value;
            continue;
        }
        if (key === 'status') {
            const status = String(value ?? '').trim().toLowerCase();
            if (status !== 'active' && status !== 'suspended') continue;
            out.status = status;
        }
    }
    if (Object.keys(out).length === 0) {
        return freezeProfileUpdates(0);
    }
    if (out.is_banned === true && out.is_active === undefined) {
        out.is_active = false;
    }
    if (out.is_banned === false && out.is_active === undefined) {
        out.is_active = true;
    }
    if (out.is_banned === true && out.status === undefined) {
        out.status = 'suspended';
    }
    if (out.is_banned === false && out.status === undefined) {
        out.status = 'active';
    }
    if (out.is_banned === true || out.is_banned === false) {
        out.freeze_until = null;
    }
    return out;
}

function freezeUpdates(): Record<string, unknown> {
    return freezeProfileUpdates(0);
}

function unfreezeUpdates(): Record<string, unknown> {
    return unfreezeProfileUpdates();
}

function invalidateSubjectCaches(userId: string): void {
    invalidateProfileRoleCache(userId);
    invalidateWifeUserStatusCache(userId);
}

export async function POST(request: Request): Promise<Response> {
    try {
        const gate = await requireTrustedHeadquartersAdmin(request);
        if (!gate.ok) return gate.response;
        const { userId } = gate;

        const allowed = await consumeRateLimitSlot(`admin-hq-ban:${userId}`, {
            maxRequests: 20,
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

        const requesterId = typeof payload.requesterId === 'string' ? payload.requesterId.trim() : '';
        if (requesterId && requesterId !== userId) {
            return wifeJsonResponse(403, { ok: false, error: 'requesterId mismatch' });
        }

        const targetUserId = typeof payload.targetUserId === 'string' ? payload.targetUserId.trim() : '';
        const blocked = rejectHeadquartersTargetId(targetUserId, userId);
        if (blocked) {
            return wifeJsonResponse(blocked.status, { ok: false, error: blocked.error });
        }

        const admin = getSupabaseAdminClient();
        if (!admin) {
            return wifeJsonResponse(503, { ok: false, error: 'Database client not configured' });
        }

        const target = await resolveHeadquartersControlTarget(admin, targetUserId, userId);
        if (!target.ok) {
            return wifeJsonResponse(target.status, { ok: false, error: target.error });
        }

        let updates: Record<string, unknown>;
        if (payload.toggle === true) {
            const flags = await readHeadquartersBanFlags(admin, targetUserId);
            if (!flags) {
                return wifeJsonResponse(404, { ok: false, error: 'المستخدم غير موجود' });
            }
            updates = flags.frozen ? unfreezeUpdates() : freezeUpdates();
        } else {
            updates = pickBanUpdates(isJsonObjectRecord(payload.updates) ? payload.updates : { is_banned: true });
        }
        if (updates.updated_at === undefined) {
            updates.updated_at = new Date().toISOString();
        }

        const { error } = await updateHeadquartersProfile(admin, targetUserId, updates);
        if (error) {
            return wifeJsonResponse(500, { ok: false, error: 'Ban update failed' });
        }

        invalidateSubjectCaches(targetUserId);

        const shouldFreeze = updates.is_banned === true || updates.is_active === false;
        const shouldUnfreeze = updates.is_banned === false;
        const user = await fetchHeadquartersUser(admin, targetUserId);
        if ((shouldFreeze || shouldUnfreeze) && !isHqProfileLoginLocked(user ?? {})) {
            await liftGoTrueLoginBan(targetUserId);
        }
        const auditRecorded = await recordHeadquartersAudit({
            actorId: userId,
            action: shouldFreeze ? 'user.freeze' : shouldUnfreeze ? 'user.unfreeze' : 'user.ban_update',
            targetId: targetUserId,
        });
        if (shouldFreeze) {
            void notifyHeadquartersAccountStatus({
                userId: targetUserId,
                kind: 'frozen',
                durationHours: 0,
                freezeUntil: user?.freezeUntil ?? null,
            });
        } else if (shouldUnfreeze) {
            void notifyHeadquartersAccountStatus({
                userId: targetUserId,
                kind: 'unfrozen',
            });
        }
        return wifeJsonResponse(200, { ok: true, auditRecorded, updates, ...(user ? { user } : {}) });
    } catch {
        return wifeJsonResponse(500, { ok: false, error: 'Internal admin ban error' });
    }
}
