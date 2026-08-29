import { parseJsonResponse } from '@/app/utils/bffJsonResponse';
import { getOrCreateDeviceId } from '@/app/security/deviceId';
import { getWifeNativeFetch } from '@/app/security/wifeNativeFetch';
import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';

export type AuthOtpPurpose = 'password_reset' | 'email_confirm';
export type AuthOtpChannel = 'email' | 'whatsapp';
export type AuthOtpDelivery = 'otp' | 'link';

export type AuthOtpRequestResult = {
    delivery: AuthOtpDelivery;
    message: string;
    resendAfterSec: number;
    phoneTail: string | null;
};

export type AuthOtpChannelsStatus = {
    email: boolean;
    whatsapp: boolean;
};

export type AuthOtpAccountPreview = {
    phoneTail: string | null;
    hasWhatsAppNumber: boolean;
    emailReady: boolean;
    whatsappSendReady: boolean;
    adminWhatsappUrl: string | null;
};

function nativeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    return getWifeNativeFetch()(input, init);
}

function deviceHeaders(): Record<string, string> {
    const deviceId = typeof window === 'undefined' ? '' : getOrCreateDeviceId();
    return deviceId ? { 'x-wife-device-id': deviceId } : {};
}

function recoveryRedirect(): string | undefined {
    if (typeof window === 'undefined') return undefined;
    return isCapacitorNativePlatform()
        ? 'iq.hami.legal:///?hami_auth=recovery'
        : `${window.location.origin}/?hami_auth=recovery`;
}

function readPhoneTail(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const tail = value.replace(/\D/g, '');
    return tail.length === 2 ? tail : null;
}

export async function previewAuthOtpAccount(input: {
    email: string;
    purpose: AuthOtpPurpose;
}): Promise<AuthOtpAccountPreview> {
    const response = await nativeFetch('/api/auth/otp/preview', {
        method: 'POST',
        credentials: 'include',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...deviceHeaders(),
        },
        body: JSON.stringify({
            email: input.email.trim().toLowerCase(),
            purpose: input.purpose,
        }),
    });
    const payload = await parseJsonResponse<{
        ok?: boolean;
        phoneTail?: unknown;
        hasWhatsAppNumber?: boolean;
        emailReady?: boolean;
        whatsappSendReady?: boolean;
        adminWhatsappUrl?: unknown;
        error?: string;
    }>(response);
    if (!response.ok) {
        throw new Error(payload.error ?? 'تعذّر التحقق من البريد');
    }
    const adminUrl =
        typeof payload.adminWhatsappUrl === 'string' && payload.adminWhatsappUrl.startsWith('https://')
            ? payload.adminWhatsappUrl
            : null;
    return {
        phoneTail: readPhoneTail(payload.phoneTail),
        hasWhatsAppNumber: payload.hasWhatsAppNumber === true,
        emailReady: payload.emailReady === true,
        whatsappSendReady: payload.whatsappSendReady === true,
        adminWhatsappUrl: adminUrl,
    };
}

export async function requestAuthOtp(input: {
    email: string;
    channel: AuthOtpChannel;
    purpose: AuthOtpPurpose;
}): Promise<AuthOtpRequestResult> {
    const response = await nativeFetch('/api/auth/otp/request', {
        method: 'POST',
        credentials: 'include',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...deviceHeaders(),
        },
        body: JSON.stringify({
            email: input.email.trim().toLowerCase(),
            channel: input.channel,
            purpose: input.purpose,
            redirectTo: recoveryRedirect(),
        }),
    });
    const payload = await parseJsonResponse<{
        ok?: boolean;
        delivery?: AuthOtpDelivery;
        message?: string;
        resendAfterSec?: number;
        phoneTail?: unknown;
        error?: string;
    }>(response);
    if (!response.ok) {
        throw new Error(payload.error ?? 'تعذّر إرسال رمز التحقق');
    }
    return {
        delivery: payload.delivery === 'link' ? 'link' : 'otp',
        message: payload.message ?? 'أُرسل رمز التحقق.',
        resendAfterSec:
            typeof payload.resendAfterSec === 'number' && payload.resendAfterSec > 0
                ? payload.resendAfterSec
                : 60,
        phoneTail: readPhoneTail(payload.phoneTail),
    };
}

export async function completeAuthOtp(input: {
    email: string;
    code: string;
    purpose: AuthOtpPurpose;
    newPassword?: string;
}): Promise<string> {
    const response = await nativeFetch('/api/auth/otp/complete', {
        method: 'POST',
        credentials: 'include',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...deviceHeaders(),
        },
        body: JSON.stringify({
            email: input.email.trim().toLowerCase(),
            code: input.code.replace(/\D/g, ''),
            purpose: input.purpose,
            newPassword: input.newPassword,
        }),
    });
    const payload = await parseJsonResponse<{ ok?: boolean; message?: string; error?: string }>(
        response,
    );
    if (!response.ok) {
        throw new Error(payload.error ?? 'تعذّر إكمال التحقق');
    }
    return payload.message ?? 'تم بنجاح';
}

export async function fetchAuthOtpChannels(): Promise<AuthOtpChannelsStatus> {
    const response = await nativeFetch('/api/auth/otp/channels', {
        method: 'GET',
        credentials: 'include',
        headers: {
            Accept: 'application/json',
            ...deviceHeaders(),
        },
    });
    const payload = await parseJsonResponse<{
        ok?: boolean;
        email?: boolean;
        whatsapp?: boolean;
        error?: string;
    }>(response);
    if (!response.ok) {
        throw new Error(payload.error ?? 'تعذّر معرفة قنوات التحقق');
    }
    return {
        email: payload.email === true,
        whatsapp: payload.whatsapp === true,
    };
}
