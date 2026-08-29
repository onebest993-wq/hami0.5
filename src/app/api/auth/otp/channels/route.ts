import { consumeRateLimitSlot } from '../../../security/wifeRateLimitStore.ts';
import { isAuthOtpEmailChannelReady, isAuthOtpWhatsAppChannelReady } from '../authOtpChannels.ts';
import { authOtpJson, readAuthOtpClientIp } from '../authOtpHttp.ts';

export const runtime = 'nodejs';

/**
 * GET /api/auth/otp/channels — جاهزية القنوات فقط، بلا أسرار وبلا كشف حساب.
 */
export async function GET(request: Request): Promise<Response> {
    const ip = readAuthOtpClientIp(request);
    if (
        !(await consumeRateLimitSlot(ip, {
            scope: 'auth-otp-channels-ip',
            maxRequests: 40,
            windowMs: 15 * 60_000,
            fallbackToMemory: true,
        }))
    ) {
        return authOtpJson(429, { ok: false, error: 'تجاوزت حد الطلبات — حاول لاحقاً' });
    }

    return authOtpJson(200, {
        ok: true,
        email: isAuthOtpEmailChannelReady(),
        whatsapp: isAuthOtpWhatsAppChannelReady(),
    });
}
