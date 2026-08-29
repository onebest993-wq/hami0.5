import { requireHeadquartersCookieAuth } from '../../../security/requireHeadquartersCookieAuth.ts';
import { consumeRateLimitSlot } from '../../../security/wifeRateLimitStore.ts';
import { isJsonObjectRecord, sanitizePayload } from '../../../security/sanitizer.ts';
import { wifeJsonResponse } from '../../../security/wifeSecurityHeaders.ts';
import { readForwardedClientIp } from '../../../security/wifeSameOrigin.ts';
import {
    burnOpenAdminOtpChallenges,
    consumeAdminOtpChallenge,
    deviceFingerprintMatchesRequest,
    isValidDeviceFingerprint,
    trustAdminDevice,
} from '../../../security/adminOtpStore.ts';
import { recordHeadquartersAudit } from '../../../security/headquartersAudit.ts';

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
    try {
        const authGate = await requireHeadquartersCookieAuth(request);
        if (!authGate.ok) return authGate.response;
        const { userId } = authGate;
        const ip = readForwardedClientIp(request);

        const allowedUser = await consumeRateLimitSlot(`admin-otp-verify:${userId}`, {
            maxRequests: 12,
            windowMs: 15 * 60_000,
        });
        const allowedIp = await consumeRateLimitSlot(`admin-otp-verify-ip:${ip}`, {
            maxRequests: 20,
            windowMs: 15 * 60_000,
        });
        if (!allowedUser || !allowedIp) {
            return wifeJsonResponse(429, { ok: false, error: 'تجاوزت حد محاولات التحقق' });
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

        const deviceFingerprint = String(payload.deviceFingerprint ?? '').trim();
        const code = String(payload.code ?? '').replace(/\D/g, '').slice(0, 6);
        if (!isValidDeviceFingerprint(deviceFingerprint)) {
            return wifeJsonResponse(400, { ok: false, error: 'deviceFingerprint غير صالح' });
        }
        if (!deviceFingerprintMatchesRequest(request, deviceFingerprint)) {
            return wifeJsonResponse(400, { ok: false, error: 'deviceFingerprint غير صالح' });
        }
        if (code.length !== 6) {
            return wifeJsonResponse(400, { ok: false, error: 'رمز غير مكتمل' });
        }

        const consumed = await consumeAdminOtpChallenge({
            userId,
            deviceFingerprint,
            code,
        });
        if (!consumed.ok) {
            const failBudget = await consumeRateLimitSlot(`admin-otp-fail:${userId}:${deviceFingerprint}`, {
                maxRequests: 5,
                windowMs: 15 * 60_000,
            });
            if (!failBudget) {
                await burnOpenAdminOtpChallenges({ userId, deviceFingerprint });
            }
            return wifeJsonResponse(400, { ok: false, error: consumed.error });
        }

        const trusted = await trustAdminDevice({
            userId,
            deviceFingerprint,
            label: 'hq-browser',
        });
        if (!trusted.ok) {
            return wifeJsonResponse(500, { ok: false, error: trusted.error });
        }

        const auditRecorded = await recordHeadquartersAudit({
            actorId: userId,
            action: 'otp.device_trusted',
        });

        return wifeJsonResponse(200, {
            ok: true,
            deviceFingerprint,
            expiresAt: trusted.expiresAt,
            auditRecorded,
        });
    } catch {
        return wifeJsonResponse(500, { ok: false, error: 'Internal admin OTP verify error' });
    }
}
