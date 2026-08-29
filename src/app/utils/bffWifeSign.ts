/**
 * توقيع WIFE من الخادم — ورقة معزولة عن `bffAuthClient`.
 *
 * لماذا انفصلت: `SecureAPIClient` كان يستورد هذه الدالّة من `bffAuthClient`، وذاك
 * يستورد `SecureAPIClient` لأجل `bootstrapBffCsrfSession` وحدها — فتُغلق دائرة
 * استيراد ثابتة على نواة الشبكة والمصادقة. والدالّة نفسها لا تحتاج `SecureAPIClient`
 * قطّ: تستعمل fetch الأصلي (getWifeNativeFetch) لأن نداء التوقيع يسبق طبقة الحارس.
 *
 * وخطر الدائرة هنا ليس نظرياً: عطل ترتيب تهيئة في هذه الحلقة يُسقط كل نداء API،
 * ونظيره وقع فعلاً في حلقة `executionDossierBlobPersistence` هذه الجلسة.
 */
import { parseJsonResponse } from '@/app/utils/bffJsonResponse';
import { getWifeNativeFetch } from '@/app/security/wifeNativeFetch';
import { SecureFetchError } from '@/app/services/SecureFetchError';

type WifeSignResponse = {
    ok?: boolean;
    headers?: Record<string, string>;
    error?: string;
};

export type WifeSignInput = {
    method: string;
    url: string;
    body: string;
    contentHash?: string;
    signal?: AbortSignal;
};

/** بعد 401 من wife-sign — امنع عاصفة POST متكررة (ضيف/جلسة منتهية). */
let wifeSignDeniedUntil = 0;
const WIFE_SIGN_DENY_MS = 30_000;

/** بعد إقلاع جلسة المقر — دائرة 401 السابقة لا تمنع التوقيع 30ث */
export function clearWifeSignAuthCircuit(): void {
    wifeSignDeniedUntil = 0;
}

/** للاختبارات فقط */
export function resetWifeSignCircuitForTests(): void {
    clearWifeSignAuthCircuit();
}

export function isWifeSignCircuitOpen(): boolean {
    return Date.now() < wifeSignDeniedUntil;
}

function openWifeSignCircuit(): void {
    wifeSignDeniedUntil = Date.now() + WIFE_SIGN_DENY_MS;
}

export async function fetchBffWifeSignedHeaders(
    input: WifeSignInput,
): Promise<Record<string, string>> {
    if (isWifeSignCircuitOpen()) {
        throw new SecureFetchError('unauthenticated', 401, '', '/api/security/wife-sign');
    }

    const response = await getWifeNativeFetch()('/api/security/wife-sign', {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
            method: input.method,
            url: input.url,
            body: input.body,
            ...(input.contentHash ? { contentHash: input.contentHash } : {}),
        }),
        signal: input.signal,
    });
    const data = await parseJsonResponse<WifeSignResponse>(response);
    if (!response.ok || !data.headers) {
        if (response.status === 401) {
            openWifeSignCircuit();
            throw new SecureFetchError(
                data.error ?? 'unauthenticated',
                401,
                typeof data.error === 'string' ? data.error : '',
                '/api/security/wife-sign',
            );
        }
        if (response.status === 429) {
            throw new Error('تم تجاوز حد الطلبات. انتظر قليلاً ثم أعد المحاولة.');
        }
        throw new Error(data.error ?? 'WIFE signing failed');
    }
    wifeSignDeniedUntil = 0;
    return data.headers;
}
