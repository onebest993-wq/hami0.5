import { HQ_STEP_UP_CODE } from '@/app/domain/admin/hqStepUp';
import { requireWifeUser, unwrapWifeUser } from './bffAuth.ts';
import { isAdminRequest } from './adminCheck.ts';
import {
    isAdminDeviceStepUpFresh,
    isAdminDeviceTrusted,
    isValidDeviceFingerprint,
} from './adminOtpStore.ts';
import { rejectHeadquartersPublicSurface } from './headquartersOriginGate.ts';
import { wifeJsonResponse } from './wifeSecurityHeaders.ts';

export type TrustedHeadquartersAdmin =
    | { ok: true; userId: string; deviceFingerprint: string }
    | { ok: false; response: Response };

export type HeadquartersAdminGateOptions = {
    /** إعادة رمز تحقق خلال نافذة قصيرة للتجميد/الدور/الاعتماد/مسح القوانين. */
    stepUp?: boolean;
};

/**
 * بوابة مقر القيادة عن بعد: جلسة WIFE + مدير منصّة + جهاز موثّق OTP.
 * أي عملية تحكم (حظر / دور / قائمة) تمر من هنا — لا RPC من المتصفح.
 */
export async function requireTrustedHeadquartersAdmin(
    request: Request,
    options?: HeadquartersAdminGateOptions,
): Promise<TrustedHeadquartersAdmin> {
    const surface = rejectHeadquartersPublicSurface(request);
    if (surface) return { ok: false, response: surface };

    const authGate = unwrapWifeUser(await requireWifeUser(request));
    if ('response' in authGate) return { ok: false, response: authGate.response };
    const { userId } = authGate;

    if (!(await isAdminRequest(request, userId))) {
        return {
            ok: false,
            response: wifeJsonResponse(403, { ok: false, error: 'Unauthorized Access' }),
        };
    }

    const deviceFingerprint = String(request.headers.get('x-wife-device-id') ?? '').trim();
    if (!isValidDeviceFingerprint(deviceFingerprint)) {
        return {
            ok: false,
            response: wifeJsonResponse(403, { ok: false, error: 'Trusted device required' }),
        };
    }
    if (!(await isAdminDeviceTrusted({ userId, deviceFingerprint }))) {
        return {
            ok: false,
            response: wifeJsonResponse(403, { ok: false, error: 'Trusted device required' }),
        };
    }
    if (options?.stepUp && !(await isAdminDeviceStepUpFresh({ userId, deviceFingerprint }))) {
        return {
            ok: false,
            response: wifeJsonResponse(403, {
                ok: false,
                error: 'أعد إدخال رمز التحقق لتأكيد هذا الإجراء',
                code: HQ_STEP_UP_CODE,
            }),
        };
    }

    return { ok: true, userId, deviceFingerprint };
}
