import { requireHeadquartersCookieAuth } from '../../../security/requireHeadquartersCookieAuth.ts';
import { consumeRateLimitSlot } from '../../../security/wifeRateLimitStore.ts';
import { isJsonObjectRecord, sanitizePayload } from '../../../security/sanitizer.ts';
import { wifeJsonResponse } from '../../../security/wifeSecurityHeaders.ts';
import { readForwardedClientIp } from '../../../security/wifeSameOrigin.ts';
import {
    createAdminOtpChallenge,
    burnOpenAdminOtpChallenges,
    deviceFingerprintMatchesRequest,
    isValidDeviceFingerprint,
} from '../../../security/adminOtpStore.ts';
import {
    hqMailerBlockReason,
    isAdminMailerConfigured,
    maskAdminMailbox,
    resolveAdminMasterEmail,
    sendAdminMail,
} from '../../../security/adminMailer.ts';
import { mailboxDigitsFromConfirmCode } from '../../../security/hqOtpShift.ts';

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
    try {
        const authGate = await requireHeadquartersCookieAuth(request);
        if (!authGate.ok) return authGate.response;
        const { userId } = authGate;
        const ip = readForwardedClientIp(request);

        const allowedUser = await consumeRateLimitSlot(`admin-otp-request:${userId}`, {
            maxRequests: 5,
            windowMs: 15 * 60_000,
        });
        const allowedIp = await consumeRateLimitSlot(`admin-otp-request-ip:${ip}`, {
            maxRequests: 8,
            windowMs: 15 * 60_000,
        });
        if (!allowedUser || !allowedIp) {
            return wifeJsonResponse(429, { ok: false, error: 'تجاوزت حد طلبات الرمز — حاول لاحقاً' });
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
        if (!isValidDeviceFingerprint(deviceFingerprint)) {
            return wifeJsonResponse(400, { ok: false, error: 'deviceFingerprint غير صالح' });
        }
        if (!deviceFingerprintMatchesRequest(request, deviceFingerprint)) {
            return wifeJsonResponse(400, { ok: false, error: 'deviceFingerprint غير صالح' });
        }

        const to = resolveAdminMasterEmail();
        if (!to.includes('@')) {
            return wifeJsonResponse(503, {
                ok: false,
                error: 'ADMIN_MASTER_EMAIL غير مضبوط على الخادم',
            });
        }

        if (!isAdminMailerConfigured()) {
            return wifeJsonResponse(503, { ok: false, error: hqMailerBlockReason() });
        }

        const destinationHint = maskAdminMailbox(to);
        const challenge = await createAdminOtpChallenge({
            userId,
            deviceFingerprint,
            requestIp: ip === 'unknown' ? null : ip,
        });
        if ('error' in challenge) {
            return wifeJsonResponse(500, { ok: false, error: challenge.error });
        }

        let mailboxDigits: string;
        try {
            mailboxDigits = mailboxDigitsFromConfirmCode(challenge.code);
        } catch {
            await burnOpenAdminOtpChallenges({ userId, deviceFingerprint });
            return wifeJsonResponse(500, { ok: false, error: 'Failed to create OTP challenge' });
        }

        const mail = await sendAdminMail({
            to,
            subject: 'رمز دخول مقر قيادة حامي',
            text: `رمز التحقق لمقر القيادة: ${mailboxDigits}\nصالح لمدة 10 دقائق.\nإن لم تطلبه فتجاهل الرسالة.`,
            html: `<p>رمز التحقق لمقر القيادة:</p><p style="font-size:24px;letter-spacing:4px;"><strong>${mailboxDigits}</strong></p><p>صالح لمدة 10 دقائق.</p>`,
        });
        if (!mail.ok) {
            await burnOpenAdminOtpChallenges({ userId, deviceFingerprint });
            return wifeJsonResponse(503, { ok: false, error: mail.error });
        }

        return wifeJsonResponse(200, {
            ok: true,
            expiresAt: challenge.expiresAt,
            destinationHint,
            delivered: true,
            mailMode: mail.mode,
        });
    } catch {
        return wifeJsonResponse(500, { ok: false, error: 'Internal admin OTP request error' });
    }
}
