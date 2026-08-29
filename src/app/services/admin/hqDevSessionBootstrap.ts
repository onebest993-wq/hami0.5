/**
 * إقلاع جلسة مقر التطوير بعد اختصار الباب — كوكي + جهاز موثّق كالمسار الشرعي.
 */
import { DeviceTrustService } from '@/app/domain/admin/deviceTrust';
import { getWifeNativeFetch } from '@/app/security/wifeNativeFetch';
import {
    invalidateCsrfSessionReady,
    markCsrfSessionReadyFromServer,
} from '@/app/security/ensureCsrfSessionReady';
import { setCsrfSessionTokenFromServer } from '@/app/security/csrfSession';
import { readDevMockAccessToken } from '@/app/utils/authStorage';
import { setBffCryptoWrapCredential } from '@/app/utils/bffCryptoSession';
import { clearWifeSignAuthCircuit } from '@/app/utils/bffWifeSign';
import { clearPrimedHeadquartersStatus } from '@/app/services/admin/hqDevSessionPrime';
import { warmLiveHeadquartersApis } from '@/app/services/admin/hqDevSessionWarm';

const BOOTSTRAP_TIMEOUT_MS = 4_000;

type DevUnlockResponse = {
    ok?: boolean;
    csrfToken?: string;
    cryptoWrapCredential?: string;
};

async function postDevUnlock(token: string, fingerprint: string, signal: AbortSignal): Promise<Response> {
    return getWifeNativeFetch()('/api/admin/otp/dev-unlock', {
        method: 'POST',
        credentials: 'include',
        signal,
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'x-wife-device-id': fingerprint,
        },
        body: JSON.stringify({ deviceFingerprint: fingerprint }),
    });
}

export async function bootstrapHeadquartersDevSession(): Promise<boolean> {
    if (!import.meta.env.DEV) return false;
    const token = readDevMockAccessToken();
    if (!token) return false;
    const fingerprint = DeviceTrustService.getDeviceFingerprint();
    if (!fingerprint) return false;

    clearPrimedHeadquartersStatus();
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), BOOTSTRAP_TIMEOUT_MS);
    try {
        const res = await postDevUnlock(token, fingerprint, controller.signal);
        if (!res.ok) return false;
        const data = (await res.json().catch(() => null)) as DevUnlockResponse | null;
        if (!data?.ok) return false;
        DeviceTrustService.trustThisDevice(fingerprint);
        if (data.csrfToken) setCsrfSessionTokenFromServer(data.csrfToken);
        if (data.cryptoWrapCredential) setBffCryptoWrapCredential(data.cryptoWrapCredential);
        if (!data.csrfToken || !markCsrfSessionReadyFromServer(data.csrfToken)) {
            invalidateCsrfSessionReady();
        }
        const { clearSecureApiAuthPause } = await import('@/app/services/SecureAPIClient');
        clearSecureApiAuthPause();
        clearWifeSignAuthCircuit();
        window.clearTimeout(timer);
        try {
            await warmLiveHeadquartersApis();
        } catch {
            /* الجلسة قائمة؛ النبض الحي يُكمل إن فشل التسخين */
        }
        return true;
    } catch {
        return false;
    } finally {
        window.clearTimeout(timer);
    }
}
