import {
    buildAccessSetCookie,
    buildRefreshSetCookie,
    getSupabaseAuthConfigFromEnv,
    isSecureRequest,
} from '../../security/sessionCookie.ts';
import { applyWifeSecurityHeaders } from '../../security/wifeSecurityHeaders.ts';
import { deriveClientCryptoWrapCredential } from '../../security/cryptoWrapServer.ts';
import { consumeRateLimitSlot } from '../../security/wifeRateLimitStore.ts';
import {
    validateTrustedRegistrationEmail,
    validateRegistrationPasswordSecure,
} from '../../../services/auth/registrationCredentialsSecurity.ts';
import {
    compactIdentityPreviewForKv,
    compactIdentityPreviewForSignup,
} from '../../../services/auth/identityImageDataUrl.ts';
import { kvSet } from '../../security/kvStoreAdmin.ts';
import { readGoTrueUserId, resolveGoTrueUserId, revokeGoTrueSession } from '../goTrueSession.ts';
import { readTermsVersionFromBody, termsVersionRejectedResponse } from '../legalTermsRequest.ts';
import { stampLegalTermsAcceptance } from '../stampLegalTermsAcceptance.ts';
import { provisionLawyerGoTrueAccount } from '../provisionLawyerGoTrueAccount.ts';
import { recordHeadquartersConnectionSignal } from '../../security/headquartersConnectionSignal.ts';
import {
    extractDeviceIdFromRequest,
    registerTokenSessionServer,
} from '../../security/stolenTokenServer.ts';

const SIGNUP_WINDOW_MS = 10 * 60_000;
const SIGNUP_MAX_PER_IP = 12;
const SIGNUP_MAX_PER_EMAIL = 5;

function readClientIp(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const firstHop = forwarded?.split(',')[0]?.trim();
    return firstHop || request.headers.get('x-real-ip')?.trim() || 'unknown';
}

function tooManyAttempts(): Response {
    return applyWifeSecurityHeaders(
        new Response(JSON.stringify({ ok: false, error: 'Too many signup attempts' }), {
            status: 429,
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Retry-After': String(Math.ceil(SIGNUP_WINDOW_MS / 1000)),
            },
        }),
    );
}

type SignupBody = {
    email?: unknown;
    password?: unknown;
    data?: Record<string, unknown>;
    verification?: unknown;
};

const ID_FRONT_PREVIEW_RE =
    /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=\s]{64,}$/i;

type SignupVerificationPayload = {
    hasIdFront: true;
    hasIdBack: true;
    hasFaceSelfie: boolean;
    faceAssistOptedIn: boolean;
    idFrontPreview: string;
    idBackPreview: string;
    faceSelfiePreview: string | null;
};

function readSignupVerification(body: Record<string, unknown>): SignupVerificationPayload | null {
    const raw = body.verification;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const v = raw as Record<string, unknown>;
    const front = compactIdentityPreviewForSignup(
        typeof v.idFrontPreview === 'string' ? v.idFrontPreview : '',
    );
    const back = compactIdentityPreviewForSignup(
        typeof v.idBackPreview === 'string' ? v.idBackPreview : '',
    );
    if (!Boolean(v.hasIdFront) || !front || !back) {
        return null;
    }
    const face = compactIdentityPreviewForSignup(
        typeof v.faceSelfiePreview === 'string' ? v.faceSelfiePreview : '',
    );
    return {
        hasIdFront: true,
        hasIdBack: true,
        hasFaceSelfie: Boolean(v.hasFaceSelfie) || Boolean(face),
        faceAssistOptedIn: Boolean(v.faceAssistOptedIn),
        idFrontPreview: front,
        idBackPreview: back,
        faceSelfiePreview: face,
    };
}

type SupabaseSignupResponse = {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    user?: Record<string, unknown>;
    error_description?: string;
    msg?: string;
    message?: string;
};

/** POST /api/auth/signup — إنشاء حساب عبر GoTrue؛ يضبط الكوكيز إن وُجدت جلسة فورية. */
export async function POST(request: Request): Promise<Response> {
    const cfg = getSupabaseAuthConfigFromEnv();
    if (!cfg) {
        return applyWifeSecurityHeaders(
            new Response(JSON.stringify({ ok: false, error: 'Auth not configured' }), {
                status: 503,
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
            }),
        );
    }

    if (
        !(await consumeRateLimitSlot(readClientIp(request), {
            scope: 'auth-signup-ip',
            maxRequests: SIGNUP_MAX_PER_IP,
            windowMs: SIGNUP_WINDOW_MS,
            fallbackToMemory: true,
        }))
    ) {
        return tooManyAttempts();
    }

    let email = '';
    let password = '';
    let meta: Record<string, unknown> = {};
    let termsVersion = '';
    let verification: SignupVerificationPayload | null = null;
    let verificationObjectPresent = false;
    try {
        const body = (await request.json()) as SignupBody & Record<string, unknown>;
        email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        password = typeof body.password === 'string' ? body.password : '';
        if (body.data && typeof body.data === 'object') meta = body.data;
        termsVersion = readTermsVersionFromBody(body);
        verificationObjectPresent =
            body.verification != null && typeof body.verification === 'object';
        verification = readSignupVerification(body);
    } catch {
        return applyWifeSecurityHeaders(
            new Response(JSON.stringify({ ok: false, error: 'Invalid JSON body' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
            }),
        );
    }

    const termsRejected = termsVersionRejectedResponse(termsVersion);
    if (termsRejected) return termsRejected;

    if (verificationObjectPresent && !verification) {
        return applyWifeSecurityHeaders(
            new Response(
                JSON.stringify({
                    ok: false,
                    error: 'صورتا وجه وظهر هوية النقابة مطلوبتان لإكمال طلب التوثيق',
                    code: 'ID_FRONT_REQUIRED',
                }),
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/json; charset=utf-8' },
                },
            ),
        );
    }

    if (!email || !password) {
        return applyWifeSecurityHeaders(
            new Response(JSON.stringify({ ok: false, error: 'Email and password required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
            }),
        );
    }

    const emailErr = validateTrustedRegistrationEmail(email);
    if (emailErr) {
        return applyWifeSecurityHeaders(
            new Response(JSON.stringify({ ok: false, error: emailErr, code: 'EMAIL_REJECTED' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
            }),
        );
    }

    const passwordErr = validateRegistrationPasswordSecure(password);
    if (passwordErr) {
        return applyWifeSecurityHeaders(
            new Response(JSON.stringify({ ok: false, error: passwordErr, code: 'PASSWORD_REJECTED' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
            }),
        );
    }

    /* فرض قيد التدقيق + دور محامٍ فقط */
    meta = {
        ...meta,
        verificationStatus: 'pending',
        accountType: 'lawyer',
        role: 'lawyer',
    };

    if (
        !(await consumeRateLimitSlot(email.toLowerCase(), {
            scope: 'auth-signup-email',
            maxRequests: SIGNUP_MAX_PER_EMAIL,
            windowMs: SIGNUP_WINDOW_MS,
            fallbackToMemory: true,
        }))
    ) {
        return tooManyAttempts();
    }

    const provisioned = await provisionLawyerGoTrueAccount({
        url: cfg.url,
        anonKey: cfg.key,
        email,
        password,
        meta,
    });
    if (!provisioned.ok) {
        return applyWifeSecurityHeaders(
            new Response(
                JSON.stringify({
                    ok: false,
                    error: provisioned.error,
                    code: provisioned.code,
                }),
                {
                    status: provisioned.status,
                    headers: { 'Content-Type': 'application/json; charset=utf-8' },
                },
            ),
        );
    }
    const authData: SupabaseSignupResponse = {
        access_token: provisioned.access_token,
        refresh_token: provisioned.refresh_token,
        expires_in: provisioned.expires_in,
        user: provisioned.user,
    };

    const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8' });
    let cryptoWrapCredential: string | undefined;
    let sessionEstablished = false;

    const newUserId = await resolveGoTrueUserId(authData.access_token ?? '', authData.user);
    if (authData.access_token && authData.refresh_token) {
        if (!newUserId) {
            await revokeGoTrueSession(authData.access_token);
        } else {
            const secure = isSecureRequest(request);
            const maxAge =
                typeof authData.expires_in === 'number' && authData.expires_in > 0
                    ? authData.expires_in
                    : undefined;
            headers.append('Set-Cookie', buildAccessSetCookie(authData.access_token, secure, maxAge));
            headers.append('Set-Cookie', buildRefreshSetCookie(authData.refresh_token, secure));
            cryptoWrapCredential = await deriveClientCryptoWrapCredential(authData.access_token);
            sessionEstablished = true;
            if (!readGoTrueUserId(authData.user)) {
                authData.user = { ...(authData.user ?? {}), id: newUserId };
            }
            const deviceId = extractDeviceIdFromRequest(request);
            if (deviceId) {
                await registerTokenSessionServer(authData.access_token, deviceId).catch(() => false);
            }
        }
    }
    if (newUserId) {
        await stampLegalTermsAcceptance(newUserId);
        void recordHeadquartersConnectionSignal(newUserId, request, 'signup');
        const now = new Date().toISOString();
        try {
            const { ensureLawyerProfileRow } = await import('../../security/wifeUserStatus.ts');
            await ensureLawyerProfileRow(newUserId, 'lawyer');
        } catch {
            /* الزرع عند الدخول احتياط */
        }
        try {
            if (verification) {
                await kvSet(`lawyer-verification:${newUserId}`, {
                    userId: newUserId,
                    status: 'pending',
                    submittedAt: now,
                    updatedAt: now,
                    email: email.toLowerCase(),
                    fullName: String(meta.fullName ?? meta.full_name ?? '').trim(),
                    familyName: String(meta.familyName ?? meta.family_name ?? '').trim(),
                    phone: String(meta.phone ?? '').trim(),
                    governorate: String(meta.governorate ?? '').trim(),
                    lawyerBarRoom: String(meta.lawyerBarRoom ?? meta.lawyer_bar_room ?? '').trim(),
                    faceAssistOptedIn: Boolean(verification.faceAssistOptedIn ?? meta.faceAssistOptedIn),
                    hasIdFront: Boolean(verification.hasIdFront),
                    hasIdBack: Boolean(verification.hasIdBack),
                    hasFaceSelfie: Boolean(verification.hasFaceSelfie),
                    idFrontPreview: verification.idFrontPreview
                        ? compactIdentityPreviewForKv(verification.idFrontPreview)
                        : null,
                    idBackPreview: verification.idBackPreview
                        ? compactIdentityPreviewForKv(verification.idBackPreview)
                        : null,
                    faceSelfiePreview: verification.faceSelfiePreview
                        ? compactIdentityPreviewForKv(verification.faceSelfiePreview)
                        : null,
                    ocrNameMatch: null,
                });
            } else {
                const { ensurePendingLawyerVerificationKv } = await import(
                    '../lawyer-verification/ensurePendingLawyerVerificationKv.ts'
                );
                await ensurePendingLawyerVerificationKv({
                    userId: newUserId,
                    email: email.toLowerCase(),
                    fullName: String(meta.fullName ?? meta.full_name ?? '').trim(),
                    familyName: String(meta.familyName ?? meta.family_name ?? '').trim(),
                    phone: String(meta.phone ?? '').trim(),
                    governorate: String(meta.governorate ?? '').trim(),
                    lawyerBarRoom: String(meta.lawyerBarRoom ?? meta.lawyer_bar_room ?? '').trim(),
                    submittedAt: now,
                });
            }
        } catch {
            /* لا نُفشل التسجيل إن تعذّر KV — المنتدى fail-closed بلا سجل */
        }
    }

    return applyWifeSecurityHeaders(
        new Response(
            JSON.stringify({
                ok: true,
                user: authData.user ?? null,
                userId: newUserId,
                sessionEstablished,
                cryptoWrapCredential: cryptoWrapCredential ?? null,
                verificationStatus: 'pending',
            }),
            { status: 200, headers },
        ),
    );
}
