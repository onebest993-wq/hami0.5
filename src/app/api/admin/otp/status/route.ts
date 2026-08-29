import { requireHeadquartersCookieAuth } from '../../../security/requireHeadquartersCookieAuth.ts';
import { wifeJsonResponse } from '../../../security/wifeSecurityHeaders.ts';
import {
    deviceFingerprintMatchesRequest,
    isAdminDeviceTrusted,
    isValidDeviceFingerprint,
} from '../../../security/adminOtpStore.ts';

export const runtime = 'nodejs';

export async function GET(request: Request): Promise<Response> {
    try {
        const authGate = await requireHeadquartersCookieAuth(request);
        if (!authGate.ok) {
            /* فحص وجود جلسة — مثل /api/auth/session: بلا كوكي نعيد 200 حتى لا يصبغ الكونسول بـ 401. */
            if (authGate.response.status === 401) {
                return wifeJsonResponse(200, { ok: true, trusted: false, sessionRequired: true });
            }
            return authGate.response;
        }
        const { userId } = authGate;

        const url = new URL(request.url);
        const deviceFingerprint = String(url.searchParams.get('deviceFingerprint') ?? '').trim();
        if (!isValidDeviceFingerprint(deviceFingerprint)) {
            return wifeJsonResponse(400, { ok: false, error: 'deviceFingerprint غير صالح' });
        }
        if (!deviceFingerprintMatchesRequest(request, deviceFingerprint)) {
            return wifeJsonResponse(400, { ok: false, error: 'deviceFingerprint غير صالح' });
        }

        const trusted = await isAdminDeviceTrusted({ userId, deviceFingerprint });
        return wifeJsonResponse(200, { ok: true, trusted });
    } catch {
        return wifeJsonResponse(500, { ok: false, error: 'Internal admin OTP status error' });
    }
}
