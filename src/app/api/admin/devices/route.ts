import { isJsonObjectRecord, sanitizePayload } from '../../security/sanitizer.ts';
import { requireTrustedHeadquartersAdmin } from '../../security/requireTrustedHeadquartersAdmin.ts';
import { wifeJsonResponse } from '../../security/wifeSecurityHeaders.ts';
import { consumeRateLimitSlot } from '../../security/wifeRateLimitStore.ts';
import { recordHeadquartersAudit } from '../../security/headquartersAudit.ts';
import { isPostgresUuidSubject } from '../../security/postgresUuidSubject.ts';
import {
    listAdminTrustedDevices,
    revokeAdminTrustedDevice,
    revokeAdminTrustedDeviceByFingerprint,
} from '../../security/adminOtpStore.ts';

export const runtime = 'nodejs';

export async function GET(request: Request): Promise<Response> {
    try {
        const gate = await requireTrustedHeadquartersAdmin(request);
        if (!gate.ok) return gate.response;

        const allowed = await consumeRateLimitSlot(`admin-hq-devices:${gate.userId}`, {
            maxRequests: 40,
            windowMs: 60_000,
        });
        if (!allowed) {
            return wifeJsonResponse(429, { ok: false, error: 'تجاوزت حد عمليات المقر — حاول لاحقاً' });
        }

        const devices = await listAdminTrustedDevices({
            userId: gate.userId,
            currentFingerprint: gate.deviceFingerprint,
        });
        return wifeJsonResponse(200, { ok: true, devices });
    } catch {
        return wifeJsonResponse(500, { ok: false, error: 'Internal admin devices error' });
    }
}

export async function POST(request: Request): Promise<Response> {
    try {
        const gate = await requireTrustedHeadquartersAdmin(request);
        if (!gate.ok) return gate.response;

        const allowed = await consumeRateLimitSlot(`admin-hq-devices-mutate:${gate.userId}`, {
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
            return wifeJsonResponse(400, { ok: false, error: 'action غير صالح' });
        }

        const action = String(payload.action ?? '');
        if (action === 'revoke_current') {
            const result = await revokeAdminTrustedDeviceByFingerprint({
                userId: gate.userId,
                deviceFingerprint: gate.deviceFingerprint,
            });
            if (result === 'ok') {
                const auditRecorded = await recordHeadquartersAudit({
                    actorId: gate.userId,
                    action: 'device.revoke',
                });
                return wifeJsonResponse(200, { ok: true, action: 'revoked', auditRecorded });
            }
            return wifeJsonResponse(200, { ok: true, action: 'revoked', auditRecorded: false });
        }

        if (action !== 'revoke') {
            return wifeJsonResponse(400, { ok: false, error: 'action غير صالح' });
        }
        const deviceId = String(payload.deviceId ?? '').trim();
        if (!isPostgresUuidSubject(deviceId)) {
            return wifeJsonResponse(400, { ok: false, error: 'deviceId مطلوب' });
        }

        const result = await revokeAdminTrustedDevice({ userId: gate.userId, deviceId });
        if (result === 'missing') {
            return wifeJsonResponse(404, { ok: false, error: 'الجهاز غير موجود' });
        }
        const auditRecorded = await recordHeadquartersAudit({
            actorId: gate.userId,
            action: 'device.revoke',
            targetId: deviceId,
        });
        return wifeJsonResponse(200, { ok: true, action: 'revoked', deviceId, auditRecorded });
    } catch {
        return wifeJsonResponse(500, { ok: false, error: 'Internal admin devices error' });
    }
}
