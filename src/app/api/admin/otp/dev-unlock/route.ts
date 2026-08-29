import { rejectHeadquartersPublicSurface } from '../../../security/headquartersOriginGate.ts';
import { assertSameOriginRequest } from '../../../security/wifeSameOrigin.ts';
import { isAdminUserId } from '../../../security/adminCheck.ts';
import { consumeRateLimitSlot } from '../../../security/wifeRateLimitStore.ts';
import { isJsonObjectRecord, sanitizePayload } from '../../../security/sanitizer.ts';
import { applyWifeSecurityHeaders, wifeJsonResponse } from '../../../security/wifeSecurityHeaders.ts';
import { getVerifiedTokenSubject } from '../../../security/wifeValidator.ts';
import {
    buildAccessSetCookie,
    buildRefreshSetCookie,
    isSecureRequest,
} from '../../../security/sessionCookie.ts';
import { buildCsrfSetCookie } from '../../../security/csrfCookie.ts';
import { issueCsrfTokenForSubject } from '../../../security/csrfServerStore.ts';
import { deriveClientCryptoWrapCredential } from '../../../security/cryptoWrapServer.ts';
import {
    deviceFingerprintMatchesRequest,
    grantDevHeadquartersDeviceTrust,
    isValidDeviceFingerprint,
    trustAdminDevice,
} from '../../../security/adminOtpStore.ts';
import {
    isHeadquartersDevUnlockEnabled,
    parseHeadquartersDevUnlockSubject,
    readBearerAuthorizationToken,
} from '../../../security/hqDevUnlock.ts';
import { HAMI_PLATFORM_ADMIN_UUID } from '../../../security/roleResolver.ts';

export const runtime = 'nodejs';

const DEV_REFRESH_TOKEN = 'DEV_ADMIN_REFRESH_TOKEN';

/**
 * إقلاع جلسة مقر تطوير: كوكي HttpOnly + ثقة الجهاز.
 * 404 في الإنتاج. لا يعتمد على تطابق Bearer/كوكي حتى لا تمنع جلسة قديمة الإقلاع.
 */
export async function POST(request: Request): Promise<Response> {
    try {
        const surface = rejectHeadquartersPublicSurface(request);
        if (surface) return surface;
        if (!isHeadquartersDevUnlockEnabled()) {
            return wifeJsonResponse(404, { ok: false, error: 'Not found' });
        }
        if (!assertSameOriginRequest(request)) {
            return wifeJsonResponse(403, { ok: false, error: 'Forbidden origin' });
        }

        const bearer = readBearerAuthorizationToken(request);
        const subjectFromToken = bearer ? parseHeadquartersDevUnlockSubject(bearer) : null;
        if (!bearer || !subjectFromToken) {
            return wifeJsonResponse(403, { ok: false, error: 'Unauthorized Access' });
        }

        const allowed = await consumeRateLimitSlot(`admin-hq-dev-unlock:${subjectFromToken}`, {
            maxRequests: 12,
            windowMs: 60_000,
        });
        if (!allowed) {
            return wifeJsonResponse(429, { ok: false, error: 'تجاوزت حد عمليات المقر — حاول لاحقاً' });
        }

        const verified = await getVerifiedTokenSubject(bearer);
        if (!verified || verified !== subjectFromToken) {
            return wifeJsonResponse(403, { ok: false, error: 'Unauthorized Access' });
        }
        if (!(await isAdminUserId(subjectFromToken, bearer))) {
            return wifeJsonResponse(403, { ok: false, error: 'Unauthorized Access' });
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

        await trustAdminDevice({
            userId: subjectFromToken,
            deviceFingerprint,
            label: 'hq-dev-shortcut',
        });
        const expiresAt = grantDevHeadquartersDeviceTrust(subjectFromToken, deviceFingerprint);

        const csrfToken = await issueCsrfTokenForSubject(subjectFromToken);
        const cryptoWrapCredential = await deriveClientCryptoWrapCredential(bearer);
        const secure = isSecureRequest(request);
        const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8' });
        headers.append('Set-Cookie', buildAccessSetCookie(bearer, secure));
        headers.append('Set-Cookie', buildRefreshSetCookie(DEV_REFRESH_TOKEN, secure));
        if (csrfToken) {
            headers.append('Set-Cookie', buildCsrfSetCookie(csrfToken, secure));
        }

        return applyWifeSecurityHeaders(
            new Response(
                JSON.stringify({
                    ok: true,
                    userId: subjectFromToken,
                    canonical: subjectFromToken.toLowerCase() === HAMI_PLATFORM_ADMIN_UUID.toLowerCase(),
                    deviceFingerprint,
                    expiresAt,
                    csrfToken: csrfToken ?? undefined,
                    cryptoWrapCredential: cryptoWrapCredential || undefined,
                }),
                { status: 200, headers },
            ),
        );
    } catch {
        return wifeJsonResponse(500, { ok: false, error: 'Internal admin dev unlock error' });
    }
}
