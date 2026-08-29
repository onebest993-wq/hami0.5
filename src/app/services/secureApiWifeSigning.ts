import { RequestSigningService } from './RequestSigningService';
import { getOrCreateDeviceId } from '@/app/security/deviceId';
import { fetchBffWifeSignedHeaders, isWifeSignCircuitOpen } from '@/app/utils/bffWifeSign';
import { SecureFetchError } from '@/app/services/SecureFetchError';
import { isDevMockAccessToken, shouldUseServerSignedAuth } from '@/app/utils/authStorage';

function formDataToStableString(body: FormData): string {
    const rows: Array<{ key: string; value: string }> = [];
    body.forEach((value, key) => {
        if (typeof value === 'string') {
            rows.push({ key, value });
            return;
        }
        rows.push({
            key,
            value: `[File:${value.name}:${value.size}:${value.type}]`,
        });
    });
    rows.sort((a, b) => (a.key === b.key ? a.value.localeCompare(b.value) : a.key.localeCompare(b.key)));
    return JSON.stringify(rows);
}

async function bodyToSign(body: BodyInit | null | undefined): Promise<string> {
    if (typeof body === 'string') return body;
    if (body === null || body === undefined) return '';
    if (body instanceof URLSearchParams) return body.toString();
    if (body instanceof FormData) return formDataToStableString(body);
    if (body instanceof Blob) return await body.text();
    if (body instanceof ArrayBuffer) return new TextDecoder().decode(body);
    if (ArrayBuffer.isView(body)) {
        return new TextDecoder().decode(body);
    }
    return '';
}

function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

function pickFormDataFile(body: FormData): File | null {
    const direct = body.get('file');
    if (direct instanceof File) return direct;
    for (const value of body.values()) {
        if (value instanceof File) return value;
    }
    return null;
}

async function sha256HexFromFile(file: File): Promise<string> {
    const data = await file.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', data);
    return bytesToHex(new Uint8Array(digest));
}

async function sha256HexFromString(input: string): Promise<string> {
    const bytes = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return bytesToHex(new Uint8Array(digest));
}

async function resolveSigningPayload(
    wireBody: BodyInit | null | undefined,
): Promise<{ signingPayload: string; contentHash?: string }> {
    if (wireBody instanceof FormData) {
        const file = pickFormDataFile(wireBody);
        if (file) {
            const contentHash = await sha256HexFromFile(file);
            return { signingPayload: contentHash, contentHash };
        }
        const stable = await bodyToSign(wireBody);
        const contentHash = await sha256HexFromString(stable);
        return { signingPayload: contentHash, contentHash };
    }
    return { signingPayload: await bodyToSign(wireBody) };
}

export async function attachWifeClientHeaders(input: {
    resolvedUrl: string;
    method: string;
    wireBody: BodyInit | null | undefined;
    nextHeaders: HeadersInit;
    token: string | null;
    bffMode: boolean;
    authPaused: boolean;
    signal?: AbortSignal;
}): Promise<HeadersInit> {
    const hasClientToken = Boolean(input.token?.trim());
    const useBffServerSigning =
        input.bffMode &&
        !isDevMockAccessToken(input.token ?? '') &&
        (shouldUseServerSignedAuth(input.token) || !hasClientToken);

    if (!input.bffMode && !hasClientToken) {
        throw new SecureFetchError('unauthenticated', 401, '', input.resolvedUrl);
    }
    if (input.bffMode && !useBffServerSigning && !hasClientToken) {
        throw new SecureFetchError('unauthenticated', 401, '', input.resolvedUrl);
    }
    /*
     * توقف المصادقة بعد 401 يخص fetchSecure (منع عاصفة إعادة المحاولة).
     * في وضع BFF التوقيع الخادمي يعتمد على كوكي HttpOnly — لا على توكن العميل؛
     * جلسات dev mock تستخدم توقيع العميل مباشرة دون wife-sign.
     */
    if (input.bffMode && useBffServerSigning && (input.authPaused || isWifeSignCircuitOpen())) {
        throw new SecureFetchError('unauthenticated', 401, '', input.resolvedUrl);
    }

    const { signingPayload, contentHash } = await resolveSigningPayload(input.wireBody);

    let signedHeaders: Record<string, string>;
    if (useBffServerSigning) {
        signedHeaders = await fetchBffWifeSignedHeaders({
            method: input.method,
            url: input.resolvedUrl,
            body: signingPayload,
            contentHash,
            signal: input.signal,
        });
    } else {
        signedHeaders = await RequestSigningService.createSignedHeaders(
            input.method,
            input.resolvedUrl,
            signingPayload,
            input.token!,
            contentHash,
        );
    }

    const merged = new Headers(input.nextHeaders);
    if (hasClientToken && !useBffServerSigning && !merged.has('Authorization') && !merged.has('authorization')) {
        merged.set('Authorization', `Bearer ${input.token}`);
    }
    Object.entries(signedHeaders).forEach(([k, v]) => merged.set(k, v));
    merged.set('x-wife-device-id', getOrCreateDeviceId());
    return merged;
}
