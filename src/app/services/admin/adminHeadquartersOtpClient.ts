/**
 * Client helpers for Admin HQ OTP + trusted-device BFF.
 * Cookie session only — no WIFE sign (that path was rejecting the real admin).
 */
import { noteHqAuditRecorded } from '@/app/components/admin/hqAuditClient';
import { CSRF_META_NAME } from '@/app/security/csrfConstants';
import { setCsrfSessionTokenFromServer } from '@/app/security/csrfSession';
import { SecureFetchError } from '@/app/services/SecureFetchError';
import { DeviceTrustService } from '@/app/domain/admin/deviceTrust';
import { getWifeNativeFetch } from '@/app/security/wifeNativeFetch';

type AdminOtpRequestResult = {
    ok: boolean;
    expiresAt?: string;
    destinationHint?: string;
    delivered?: boolean;
    mailMode?: 'resend' | 'webhook' | 'smtp';
    error?: string;
    sessionRequired?: boolean;
};

type AdminOtpVerifyResult = {
    ok: boolean;
    deviceFingerprint?: string;
    expiresAt?: string;
    error?: string;
    sessionRequired?: boolean;
};

export type AdminDeviceTrustProbe = 'trusted' | 'untrusted' | 'session_required' | 'unavailable';

const OTP_FETCH_TIMEOUT_MS = 25_000;
const CSRF_RETRY_AR = 'فشل التحقق الأمني للطلب. حدّث الصفحة ثم أعد إرسال الرمز.';

type NativeOtpFetchOptions = {
    csrfToken?: string | null;
    skipCsrfHeader?: boolean;
};

let headquartersCsrfRefresh: Promise<string> | null = null;

function readOtpErrorStatus(err: unknown): number | undefined {
    if (err instanceof Error && 'status' in err) {
        const status = Number((err as { status?: number }).status);
        return Number.isFinite(status) ? status : undefined;
    }
    return undefined;
}

function isSessionAuthFailure(err: unknown, status?: number, bodyError?: string): boolean {
    const message = err instanceof Error ? err.message : '';
    const hay = `${message} ${bodyError ?? ''}`;
    if (/رمز غير صالح|رمز غير مكتمل|رمز التحقق غير صحيح/i.test(hay)) return false;
    if (status === 401) return true;
    return /unauthorized user/i.test(hay);
}

function isCsrfValidationFailure(err: unknown): boolean {
    const status = readOtpErrorStatus(err);
    const message = err instanceof Error ? err.message : '';
    const body = err instanceof SecureFetchError ? err.bodyText : '';
    return status === 403 && /csrf/i.test(`${message} ${body}`);
}

function humanizeAdminOtpError(err: unknown, fallback: string): string {
    const message = err instanceof Error ? err.message.trim() : '';
    const status = readOtpErrorStatus(err);
    if (err instanceof Error && err.name === 'AbortError') {
        return 'انتهت مهلة الاتصال بخادم المقر. حدّث الصفحة ثم أعد المحاولة.';
    }
    if (/forbidden origin/i.test(message)) {
        return 'عنوان الصفحة لا يطابق الخادم. افتح http://127.0.0.1:8080/admin ثم أعد إرسال الرمز.';
    }
    if (/unauthorized user/i.test(message)) {
        return 'انتهت جلسة الخادم. سجّل الدخول من http://127.0.0.1:8080 ثم أعد فتح /admin.';
    }
    if (isCsrfValidationFailure(err) || (status === 403 && /csrf/i.test(message))) {
        return CSRF_RETRY_AR;
    }
    if (status === 403 && /unauthorized access/i.test(message)) {
        return 'هذا الحساب ليس مدير المنصّة على الخادم. اخرج وادخل بـ hami.apps@proton.me.';
    }
    if (status === 504) {
        return 'انتهت مهلة الاتصال بخادم المقر. حدّث الصفحة ثم أعد المحاولة.';
    }
    if (status === 429) {
        if (/بريد|حد الإرسال|حد طلبات الرمز|حد محاولات/.test(message)) return message;
        return 'تجاوزت حد طلبات الرمز — انتظر قليلاً ثم أعد المحاولة.';
    }
    if (status === 503) {
        if (/security session|store unavailable/i.test(message)) {
            return 'تعذّر تهيئة جلسة الأمان. حدّث الصفحة ثم أعد إرسال الرمز.';
        }
        return /بريد/.test(message)
            ? message
            : 'تعذّر إرسال رمز التحقق إلى البريد الرسمي. حدّث الصفحة بعد ضبط بريد الخادم.';
    }
    if (err instanceof SecureFetchError) {
        if (err.message === 'api_unavailable') {
            return 'خادم المقر غير متصل من هذا المتصفح — حدّث الصفحة بعد تشغيل Vite ثم أعد المحاولة';
        }
        let bodyError = '';
        try {
            const parsed = JSON.parse(err.bodyText) as { error?: unknown };
            if (typeof parsed.error === 'string') bodyError = parsed.error.trim();
        } catch {
            /* ignore */
        }
        if (/forbidden origin/i.test(bodyError)) {
            return 'عنوان الصفحة لا يطابق الخادم. افتح http://127.0.0.1:8080/admin ثم أعد إرسال الرمز.';
        }
        if (/unauthorized user/i.test(bodyError) || err.status === 401) {
            return 'انتهت جلسة الخادم. سجّل الدخول من http://127.0.0.1:8080 ثم أعد فتح /admin.';
        }
        if (err.status === 403) {
            if (/csrf|cryptographic|signature/i.test(`${bodyError} ${err.bodyText}`)) {
                return CSRF_RETRY_AR;
            }
            if (/unauthorized access/i.test(bodyError)) {
                return 'هذا الحساب ليس مدير المنصّة على الخادم. اخرج وادخل بـ hami.apps@proton.me.';
            }
            return bodyError || 'مرفوض من الخادم (403). حدّث الصفحة وأعد المحاولة.';
        }
        if (err.status === 429) {
            if (/بريد|حد الإرسال|حد طلبات الرمز|حد محاولات/.test(bodyError)) {
                return bodyError;
            }
            return 'تجاوزت حد طلبات الرمز — انتظر قليلاً ثم أعد المحاولة.';
        }
        if (err.status === 503) {
            if (/security session|store unavailable/i.test(bodyError)) {
                return 'تعذّر تهيئة جلسة الأمان. حدّث الصفحة ثم أعد إرسال الرمز.';
            }
            return bodyError || 'تعذّر إرسال رمز التحقق إلى البريد الرسمي. حدّث الصفحة بعد ضبط بريد الخادم.';
        }
        return bodyError || err.message || fallback;
    }
    return message || fallback;
}

async function nativeOtpFetch<T extends { ok?: boolean; error?: string; csrfToken?: string }>(
    path: string,
    init: RequestInit,
    options?: NativeOtpFetchOptions,
): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    if (!options?.skipCsrfHeader && options?.csrfToken) {
        headers.set(CSRF_META_NAME, options.csrfToken);
    }
    const deviceId = DeviceTrustService.getDeviceFingerprint();
    if (deviceId) headers.set('x-wife-device-id', deviceId);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OTP_FETCH_TIMEOUT_MS);
    try {
        const res = await getWifeNativeFetch()(path, {
            ...init,
            credentials: 'include',
            cache: 'no-store',
            headers,
            signal: controller.signal,
        });
        const data = (await res.json().catch(() => ({}))) as T;
        if (!res.ok) {
            const err = new Error(
                typeof data.error === 'string' && data.error.trim() ? data.error : `otp_${res.status}`,
            ) as Error & { status: number };
            err.status = res.status;
            throw err;
        }
        return data;
    } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
            const timeoutErr = new Error('انتهت مهلة الاتصال بخادم المقر. حدّث الصفحة ثم أعد المحاولة.') as Error & {
                status: number;
            };
            timeoutErr.status = 504;
            timeoutErr.name = 'AbortError';
            throw timeoutErr;
        }
        throw err;
    } finally {
        clearTimeout(timer);
    }
}

async function loadHeadquartersCsrfToken(): Promise<string> {
    const data = await nativeOtpFetch<{ ok?: boolean; csrfToken?: string; error?: string }>(
        '/api/admin/otp/csrf',
        { method: 'GET' },
        { skipCsrfHeader: true },
    );
    const token = typeof data.csrfToken === 'string' ? data.csrfToken.trim() : '';
    if (!token) {
        const err = new Error('Security session store unavailable') as Error & { status: number };
        err.status = 503;
        throw err;
    }
    setCsrfSessionTokenFromServer(token);
    return token;
}

async function refreshHeadquartersCsrfToken(): Promise<string> {
    if (!headquartersCsrfRefresh) {
        headquartersCsrfRefresh = loadHeadquartersCsrfToken().finally(() => {
            headquartersCsrfRefresh = null;
        });
    }
    return headquartersCsrfRefresh;
}

async function nativeOtpMutatingFetch<T extends { ok?: boolean; error?: string }>(
    path: string,
    init: RequestInit,
): Promise<T> {
    const token = await refreshHeadquartersCsrfToken();
    try {
        return await nativeOtpFetch<T>(path, init, { csrfToken: token });
    } catch (err) {
        if (!isCsrfValidationFailure(err)) throw err;
        const retryToken = await refreshHeadquartersCsrfToken();
        return await nativeOtpFetch<T>(path, init, { csrfToken: retryToken });
    }
}

let otpRequestInflight: Promise<AdminOtpRequestResult> | null = null;

async function requestAdminHeadquartersOtpOnce(): Promise<AdminOtpRequestResult> {
    const deviceFingerprint = DeviceTrustService.getDeviceFingerprint();
    try {
        return await nativeOtpMutatingFetch<AdminOtpRequestResult>('/api/admin/otp/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceFingerprint }),
        });
    } catch (err) {
        const status = readOtpErrorStatus(err);
        return {
            ok: false,
            sessionRequired: isSessionAuthFailure(err, status),
            error: humanizeAdminOtpError(err, 'فشل طلب رمز التحقق'),
        };
    }
}

/** طلب واحد في اللحظة — يمنع إرسال رمزين عند إعادة تركيب StrictMode */
export async function requestAdminHeadquartersOtp(): Promise<AdminOtpRequestResult> {
    if (otpRequestInflight) return otpRequestInflight;
    otpRequestInflight = requestAdminHeadquartersOtpOnce().finally(() => {
        otpRequestInflight = null;
    });
    return otpRequestInflight;
}

export async function verifyAdminHeadquartersOtp(code: string): Promise<AdminOtpVerifyResult> {
    const deviceFingerprint = DeviceTrustService.getDeviceFingerprint();
    try {
        const data = await nativeOtpMutatingFetch<AdminOtpVerifyResult>('/api/admin/otp/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                deviceFingerprint,
                code: String(code ?? '').replace(/\D/g, '').slice(0, 6),
            }),
        });
        if (data.ok) {
            noteHqAuditRecorded(data);
            DeviceTrustService.trustThisDevice(data.deviceFingerprint ?? deviceFingerprint);
        }
        return data;
    } catch (err) {
        const status = readOtpErrorStatus(err);
        return {
            ok: false,
            sessionRequired: isSessionAuthFailure(err, status),
            error: humanizeAdminOtpError(err, 'فشل التحقق من الرمز'),
        };
    }
}

export async function fetchAdminDeviceTrustStatus(): Promise<AdminDeviceTrustProbe> {
    const deviceFingerprint = DeviceTrustService.getDeviceFingerprint();
    try {
        const data = await nativeOtpFetch<{ ok: boolean; trusted?: boolean; sessionRequired?: boolean }>(
            `/api/admin/otp/status?deviceFingerprint=${encodeURIComponent(deviceFingerprint)}`,
            { method: 'GET' },
            { skipCsrfHeader: true },
        );
        if (data.sessionRequired) return 'session_required';
        if (data.ok && data.trusted) {
            DeviceTrustService.trustThisDevice(deviceFingerprint);
            return 'trusted';
        }
        if (data.ok && data.trusted === false) {
            return 'untrusted';
        }
        return 'unavailable';
    } catch (err) {
        const status = readOtpErrorStatus(err);
        if (isSessionAuthFailure(err, status)) return 'session_required';
        return 'unavailable';
    }
}
