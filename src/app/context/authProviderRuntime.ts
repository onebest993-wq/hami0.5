/**
 * منطق المصادقة الثقيل — يُحمَّل ديناميكياً بعد أول paint (chunk auth-context).
 */
import type { Session, User } from '@supabase/supabase-js';
import { UserRole } from '@/app/types/admin-types';
import { logAction } from '@/app/utils/auditLog';
import {
    hasPersistedSupabaseSession,
    purgeClientAuthResidue,
    writeDevMockAuth,
} from '@/app/utils/authStorage';
import {
    attachSupabaseAuthListener,
    signInWithPassword,
    signOutSupabase,
    signUpWithPassword,
} from '@/app/utils/authSupabaseLazy';
import { getDevMockLawyerSession } from '@/app/services/auth/devMockLawyerAuth';
import { isShellAuthBypassed } from '@/app/services/auth/shellAuth';
import { probeSameOriginApi } from '@/app/runtime/sameOriginApiProbe';
import {
    bffLogin,
    bffLogout,
    bffSignup,
    bootstrapBffCsrfSession,
    fetchBffSession,
    HAMI_BFF_SESSION_LOST_EVENT,
    runBffLocalAuthMigration,
    startBffSessionKeeper,
    stopBffSessionKeeper,
} from '@/app/utils/bffAuthClient';
import { isBffAuthEnabled } from '@/app/utils/bffAuthFlags';
import { clearCsrfSessionToken } from '@/app/security/csrfSession';
import { shouldApplyGuestFallbackSession, shouldKeepStoredNonGuestDevMock } from '@/app/context/authBoot';
import {
    isCurrentBffAuthSyncGeneration,
    nextBffAuthSyncGeneration,
} from '@/app/context/bffAuthSyncGeneration';
import { resolveLiveAuthUserIdForStorage } from '@/app/utils/liveAuthUserId';
import { isPasswordRecoveryReturnUrl, isAuthCallbackReturnUrl } from '@/app/services/auth/passwordRecoveryGate';
import { publishAuthLogout } from '@/app/services/auth/authSessionBroadcast';

function prefetchLawyerDashboardIfPhoneProduct(): void {
    if (__HAMI_CLIENT_PRODUCT__ === 'hq') return;
    void import('@/app/runtime/lawyerDashboardLoader').then((m) => {
        m.prefetchLawyerDashboardEntry();
    });
}

export type AuthProviderRuntimeBindings = {
    setUser: (user: User | null) => void;
    setSession: (session: Session | null) => void;
    setIsLoading: (loading: boolean) => void;
    applyGuestSession: () => void;
    applySignedOutState: () => void;
    applyGuestOrSignedOut: () => void;
    restoreDevMockIfPresent: () => boolean;
};

function systemRoleForSignup(role: 'lawyer' | 'admin'): UserRole {
    if (role === 'admin') return UserRole.SUPER_ADMIN;
    return UserRole.LAWYER;
}

/** مزامنة الجلسة بعد mount — BFF أو Supabase listener */
export function startAuthSessionSync(bindings: AuthProviderRuntimeBindings): () => void {
    const {
        setUser,
        setSession,
        setIsLoading,
        applyGuestOrSignedOut,
        restoreDevMockIfPresent,
    } = bindings;

    let mounted = true;
    let detach: (() => void) | undefined;

    const applySession = (next: Session | null) => {
        if (!mounted) return;
        if (next) {
            setSession(next);
            setUser(next.user ?? null);
            setIsLoading(false);
            return;
        }
        /* null هنا يصل فقط من SIGNED_OUT — لا نمسح persist عند getSession العابر */
        if (!restoreDevMockIfPresent()) {
            applyGuestOrSignedOut();
        }
        setIsLoading(false);
    };

    if (isBffAuthEnabled()) {
        const recoveryBoot =
            typeof window !== 'undefined' &&
            (isPasswordRecoveryReturnUrl() || isAuthCallbackReturnUrl());
        if (recoveryBoot) {
            void import('@/app/services/auth/passwordRecoveryGate').then((m) => {
                m.markPasswordRecoveryPending();
            });
            setIsLoading(false);
            void import('@/app/utils/authSupabaseLazy')
                .then(async (m) => {
                    if (!mounted) return;
                    const supabase = await m.getAuthSupabase();
                    await supabase.auth.getSession();
                })
                .catch(() => undefined);
            return () => {
                mounted = false;
            };
        }

        if (typeof window !== 'undefined' && isPasswordRecoveryReturnUrl()) {
            void import('@/app/services/auth/passwordRecoveryGate').then((m) => {
                m.markPasswordRecoveryPending();
            });
        }

        const onSessionLost = () => {
            if (!mounted) return;
            stopBffSessionKeeper();
            if (!restoreDevMockIfPresent()) {
                applyGuestOrSignedOut();
            }
        };
        if (typeof window !== 'undefined') {
            window.addEventListener(HAMI_BFF_SESSION_LOST_EVENT, onSessionLost);
        }

        if (isShellAuthBypassed()) {
            if (!restoreDevMockIfPresent()) {
                /*
                 * لا تستبدل إقلاع E2E (محامٍ مزروع في التخزين) بضيف ثابت —
                 * restore قد يسبق اكتمال الكتابة؛ الإبقاء على حالة الإقلاع أأمن.
                 */
                if (!shouldKeepStoredNonGuestDevMock()) {
                    const mock = getDevMockLawyerSession();
                    setSession(mock.session);
                    setUser(mock.user);
                }
            }
            setIsLoading(false);
            return () => {
                mounted = false;
                if (typeof window !== 'undefined') {
                    window.removeEventListener(HAMI_BFF_SESSION_LOST_EVENT, onSessionLost);
                }
            };
        }

        setIsLoading(true);
        const bootGeneration = nextBffAuthSyncGeneration();
        let stopKeeper: (() => void) | undefined;
        void probeSameOriginApi()
            .then(async (apiState) => {
                if (!mounted || !isCurrentBffAuthSyncGeneration(bootGeneration)) return;
                if (apiState !== 'available') {
                    if (!restoreDevMockIfPresent()) {
                        applyGuestOrSignedOut();
                    }
                    setIsLoading(false);
                    return;
                }
                return runBffLocalAuthMigration()
                    .then(() => fetchBffSession())
                    .then(async (bffUser) => {
                        if (!mounted || !isCurrentBffAuthSyncGeneration(bootGeneration)) return;
                        if (bffUser) {
                            setUser(bffUser);
                            setSession(null);
                            stopKeeper = startBffSessionKeeper();
                            await bootstrapBffCsrfSession();
                        } else if (!restoreDevMockIfPresent()) {
                            applyGuestOrSignedOut();
                        }
                    });
            })
            .catch(() => {
                if (!mounted || !isCurrentBffAuthSyncGeneration(bootGeneration)) return;
                if (!restoreDevMockIfPresent()) {
                    applyGuestOrSignedOut();
                }
            })
            .finally(() => {
                if (mounted && isCurrentBffAuthSyncGeneration(bootGeneration)) setIsLoading(false);
            });
        return () => {
            mounted = false;
            stopKeeper?.();
            if (typeof window !== 'undefined') {
                window.removeEventListener(HAMI_BFF_SESSION_LOST_EVENT, onSessionLost);
            }
        };
    }

    const needsSupabaseListener = (() => {
        if (hasPersistedSupabaseSession()) return true;
        if (typeof window === 'undefined') return false;
        if (isAuthCallbackReturnUrl()) return true;
        return false;
    })();

    if (!needsSupabaseListener) {
        return () => {
            mounted = false;
            detach?.();
        };
    }

    const AUTH_BOOT_TIMEOUT_MS = 8_000;
    const timeoutId = window.setTimeout(() => {
        if (mounted) setIsLoading(false);
    }, AUTH_BOOT_TIMEOUT_MS);

    void (async () => {
        const { markPasswordRecoveryPending } = await import(
            '@/app/services/auth/passwordRecoveryGate'
        );
        if (isPasswordRecoveryReturnUrl()) {
            markPasswordRecoveryPending();
        }
        return attachSupabaseAuthListener({
            onSession: applySession,
            onAuthEvent: (event) => {
                if (event === 'PASSWORD_RECOVERY') {
                    markPasswordRecoveryPending();
                }
            },
            onReady: () => {
                window.clearTimeout(timeoutId);
                if (mounted) setIsLoading(false);
            },
        });
    })()
        .then((unsub) => {
            detach = unsub;
        })
        .catch(() => {
            window.clearTimeout(timeoutId);
            if (!mounted) return;
            if (!restoreDevMockIfPresent()) {
                applyGuestOrSignedOut();
            }
            setIsLoading(false);
        });

    return () => {
        mounted = false;
        window.clearTimeout(timeoutId);
        detach?.();
    };
}

export async function authLogin(
    email: string,
    password: string,
    bindings: Pick<AuthProviderRuntimeBindings, 'setUser' | 'setSession'> &
        Partial<Pick<AuthProviderRuntimeBindings, 'setIsLoading'>>,
): Promise<User> {
    const { assertLegalTermsAcceptedOrThrow } = await import('@/app/services/auth/legalTermsAcceptance');
    assertLegalTermsAcceptedOrThrow();
    const { setUser, setSession, setIsLoading } = bindings;
    const { clearExplicitLocalGuest } = await import('@/app/services/auth/localGuestSession');
    const { clearExplicitDevUnlock } = await import('@/app/services/auth/devUnlockSession');
    clearExplicitLocalGuest();
    clearExplicitDevUnlock();
    if (isBffAuthEnabled()) {
        nextBffAuthSyncGeneration();
        await runBffLocalAuthMigration();
        await signOutSupabase().catch(() => undefined);
        const bffUser = await bffLogin(email, password);
        setUser(bffUser);
        setSession(null);
        setIsLoading?.(false);
        await bootstrapBffCsrfSession();
        await logAction('login_success', {
            source: 'AuthContext',
            mode: 'bff',
        });
        return bffUser;
    }
    const { session, error } = await signInWithPassword(email, password);
    if (error) throw error;
    if (!session?.user) {
        throw new Error('تعذّر فتح الجلسة بعد تسجيل الدخول');
    }
    setSession(session);
    setUser(session.user);
    await logAction('login_success', {
        source: 'AuthContext',
        mode: 'supabase',
    });
    return session.user;
}

export async function authSignup(
    email: string,
    password: string,
    options?: {
        fullName?: string;
        accountType?: 'lawyer';
        phone?: string;
        familyName?: string;
        governorate?: string;
        lawyerBarRoom?: string;
        verificationStatus?: 'pending' | 'active';
        verification?: {
            hasIdFront: boolean;
            hasIdBack: boolean;
            hasFaceSelfie: boolean;
            faceAssistOptedIn: boolean;
            idFrontPreview: string | null;
            idBackPreview?: string | null;
            faceSelfiePreview?: string | null;
        };
    },
): Promise<{ sessionEstablished: boolean; userId: string | null }> {
    const meta = {
        fullName: options?.fullName ?? '',
        phone: options?.phone ?? '',
        accountType: 'lawyer' as const,
        familyName: options?.familyName ?? '',
        governorate: options?.governorate ?? '',
        lawyerBarRoom: options?.lawyerBarRoom ?? '',
        verificationStatus: options?.verificationStatus ?? 'pending',
    };

    if (isBffAuthEnabled()) {
        try {
            const result = await bffSignup(email, password, meta, options?.verification);
            const userId =
                result.userId ??
                (result.user && typeof result.user.id === 'string' ? result.user.id.trim() : null);
            return { sessionEstablished: result.sessionEstablished, userId };
        } catch (error) {
            const { humanizeAuthError } = await import('@/app/services/auth/humanizeAuthError');
            throw new Error(humanizeAuthError(error, 'فشل إنشاء الحساب', 'register'));
        }
    }

    const { error } = await signUpWithPassword(email, password, { data: meta });
    if (error) {
        const { humanizeAuthError } = await import('@/app/services/auth/humanizeAuthError');
        throw new Error(humanizeAuthError(error, 'فشل إنشاء الحساب', 'register'));
    }
    return { sessionEstablished: false, userId: null };
}

export async function authEnterLocalGuest(
    bindings: Pick<AuthProviderRuntimeBindings, 'applyGuestSession'>,
): Promise<void> {
    const { assertLegalTermsAcceptedOrThrow } = await import('@/app/services/auth/legalTermsAcceptance');
    assertLegalTermsAcceptedOrThrow();
    const { markExplicitLocalGuest } = await import('@/app/services/auth/localGuestSession');
    nextBffAuthSyncGeneration();
    markExplicitLocalGuest();
    bindings.applyGuestSession();
    await logAction('local_guest_enter', { source: 'AuthContext' });
}

export async function authRequestPasswordReset(email: string): Promise<string> {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes('@')) {
        throw new Error('أدخل بريداً إلكترونياً صالحاً');
    }
    const { isCapacitorNativePlatform } = await import('@/app/runtime/nativePlatform');
    const redirectTo =
        typeof window === 'undefined'
            ? undefined
            : isCapacitorNativePlatform()
              ? 'iq.hami.legal:///?hami_auth=recovery'
              : `${window.location.origin}/?hami_auth=recovery`;
    if (isBffAuthEnabled()) {
        const { bffRequestPasswordReset } = await import('@/app/utils/bffAuthClient');
        return bffRequestPasswordReset(trimmed, redirectTo);
    }
    const { requestPasswordResetEmail } = await import('@/app/utils/authSupabaseLazy');
    const { error } = await requestPasswordResetEmail(trimmed, redirectTo);
    if (error) throw error;
    return 'إن وُجد حساب بهذا البريد فستصلك رسالة لاستعادة كلمة المرور.';
}

export async function authResendEmailConfirmation(email: string): Promise<string> {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes('@')) {
        throw new Error('أدخل بريداً إلكترونياً صالحاً');
    }
    const { isCapacitorNativePlatform } = await import('@/app/runtime/nativePlatform');
    const redirectTo =
        typeof window === 'undefined'
            ? undefined
            : isCapacitorNativePlatform()
              ? 'iq.hami.legal:///'
              : `${window.location.origin}/`;
    if (isBffAuthEnabled()) {
        const { bffResendConfirmation } = await import('@/app/utils/bffAuthClient');
        return bffResendConfirmation(trimmed, redirectTo);
    }
    throw new Error('إعادة إرسال التأكيد متاحة عبر الخادم فقط');
}

export type AuthRegisterLawyerInput = {
    email: string;
    password: string;
    fullName: string;
    familyName: string;
    phone: string;
    governorate: string;
    lawyerBarRoom: string;
    idFrontDataUrl: string | null;
    idBackDataUrl: string | null;
    faceSelfieDataUrl: string | null;
    faceAssistOptedIn: boolean;
};

/** إنشاء حساب فقط (بريد + كلمة مرور) — بقية البيانات بعد التسجيل */
export async function authRegisterLawyerAccount(
    input: { email: string; password: string },
    bindings: Pick<AuthProviderRuntimeBindings, 'setUser' | 'setSession'>,
): Promise<{ userId: string; pendingMessage: string; emailConfirmRequired?: boolean }> {
    const { clearExplicitLocalGuest } = await import('@/app/services/auth/localGuestSession');
    const { clearExplicitDevUnlock } = await import('@/app/services/auth/devUnlockSession');
    const { setLiveAuthUserId } = await import('@/app/utils/liveAuthUserId');
    const { assertLegalTermsAcceptedOrThrow } = await import(
        '@/app/services/auth/legalTermsAcceptance'
    );
    const { validateLawyerSignupAccountOnly, normalizeRegistrationEmail } = await import(
        '@/app/services/auth/registrationCredentialsSecurity'
    );

    clearExplicitLocalGuest();
    clearExplicitDevUnlock();
    assertLegalTermsAcceptedOrThrow();

    const accountErr = validateLawyerSignupAccountOnly(input);
    if (accountErr) throw new Error(accountErr);

    const email = normalizeRegistrationEmail(input.email);
    const password = input.password;

    const signupResult = await authSignup(email, password, {
        accountType: 'lawyer',
        verificationStatus: 'pending',
    });

    let user: User | null = null;
    try {
        user = await authLogin(email, password, bindings);
    } catch (loginErr) {
        if (!signupResult.userId && !signupResult.sessionEstablished) {
            const { humanizeAuthError } = await import('@/app/services/auth/humanizeAuthError');
            throw new Error(humanizeAuthError(loginErr, 'فشل إنشاء الحساب', 'register'));
        }
    }

    const resolvedId = user?.id?.trim() || signupResult.userId;
    const emailConfirmRequired = !user && Boolean(signupResult.userId);
    if (!resolvedId) {
        throw new Error(
            'تم إنشاء الحساب لكن تعذّر فتح الجلسة تلقائياً — سجّل الدخول يدوياً بعد تأكيد البريد إن لزم.',
        );
    }
    setLiveAuthUserId(resolvedId);
    await logAction('lawyer_register_account', { source: 'AuthContext' });

    if (emailConfirmRequired) {
        const { markEmailConfirmationPending } = await import(
            '@/app/services/auth/emailConfirmationClient'
        );
        markEmailConfirmationPending(email);
    }

    return {
        userId: resolvedId,
        pendingMessage: emailConfirmRequired
            ? 'تم إنشاء الحساب. أكمل هوية النقابة إن لم تُرفع. تأكيد البريد آخر خطوة — الاعتماد من الإدارة حصراً.'
            : 'تم إنشاء الحساب — أكمل بياناتك ثم ارفع هوية النقابة للتدقيق الإداري.',
        emailConfirmRequired,
    };
}

/**
 * إكمال بيانات المحامي + رفع التوثيق بعد إنشاء الحساب.
 */
export async function authFinalizeLawyerOnboarding(
    input: Omit<AuthRegisterLawyerInput, 'password'> & { email: string; userId?: string },
): Promise<{ pendingMessage: string; hqReceived: boolean }> {
    const { writeLawyerVerificationPending } = await import(
        '@/app/services/auth/lawyerVerificationStore'
    );
    const { setLiveAuthUserId } = await import('@/app/utils/liveAuthUserId');
    const {
        validateLawyerProfileDetails,
        normalizeRegistrationEmail,
        normalizeIraqiPhoneInput,
    } = await import('@/app/services/auth/registrationCredentialsSecurity');

    const profileErr = validateLawyerProfileDetails(input);
    if (profileErr) throw new Error(profileErr);
    const { assertLawyerIdentityImagesReady } = await import(
        '@/app/services/auth/identityImageDataUrl'
    );
    const idErr = assertLawyerIdentityImagesReady(input.idFrontDataUrl, input.idBackDataUrl);
    if (idErr) throw new Error(idErr);

    const clean = {
        email: normalizeRegistrationEmail(input.email),
        phone: normalizeIraqiPhoneInput(input.phone),
        fullName: input.fullName.trim().replace(/\s+/g, ' '),
        familyName: input.familyName.trim().replace(/\s+/g, ' '),
        governorate: input.governorate.trim(),
        lawyerBarRoom: input.lawyerBarRoom.trim().replace(/\s+/g, ' '),
    };

    const userId = input.userId?.trim() || resolveLiveAuthUserIdForStorage()?.trim();
    if (!userId) {
        throw new Error('انتهت الجلسة — سجّل الدخول ثم أكمل بيانات التسجيل');
    }
    setLiveAuthUserId(userId);

    writeLawyerVerificationPending(userId, {
        email: normalizeRegistrationEmail(clean.email),
        fullName: clean.fullName,
        familyName: clean.familyName,
        phone: clean.phone,
        governorate: clean.governorate,
        lawyerBarRoom: clean.lawyerBarRoom,
        idFrontDataUrl: input.idFrontDataUrl,
        idBackDataUrl: input.idBackDataUrl,
        faceSelfieDataUrl: input.faceSelfieDataUrl,
        faceAssistOptedIn: input.faceAssistOptedIn,
    });

    const {
        submitLawyerVerificationToServer,
        LAWYER_VERIFICATION_HQ_RECEIVED_AR,
        LAWYER_VERIFICATION_HQ_UNREACHABLE_AR,
    } = await import('@/app/services/auth/lawyerVerificationRemote');

    let hqReceived = false;
    try {
        await submitLawyerVerificationToServer({
            email: clean.email,
            fullName: clean.fullName,
            familyName: clean.familyName,
            phone: clean.phone,
            governorate: clean.governorate,
            lawyerBarRoom: clean.lawyerBarRoom,
            faceAssistOptedIn: input.faceAssistOptedIn,
            idFrontDataUrl: input.idFrontDataUrl,
            idBackDataUrl: input.idBackDataUrl,
            faceSelfieDataUrl: input.faceSelfieDataUrl,
        });
        hqReceived = true;
    } catch {
        hqReceived = false;
    }

    await logAction('lawyer_register_pending', {
        source: 'AuthContext',
        faceAssist: input.faceAssistOptedIn,
        hqReceived,
    });

    return {
        pendingMessage: hqReceived
            ? LAWYER_VERIFICATION_HQ_RECEIVED_AR
            : LAWYER_VERIFICATION_HQ_UNREACHABLE_AR,
        hqReceived,
    };
}

/**
 * تسجيل محامٍ جديد → حساب قيد التدقيق (مسار واحد كامل — توافق خلفي).
 * ينشئ الحساب عبر Supabase ثم يسجّل الدخول (BFF إن وُجد).
 */
export async function authRegisterLawyer(
    input: AuthRegisterLawyerInput,
    bindings: Pick<AuthProviderRuntimeBindings, 'setUser' | 'setSession'>,
): Promise<{
    userId: string;
    pendingMessage: string;
    emailConfirmRequired?: boolean;
    hqReceived: boolean;
}> {
    const { clearExplicitLocalGuest } = await import('@/app/services/auth/localGuestSession');
    const { clearExplicitDevUnlock } = await import('@/app/services/auth/devUnlockSession');
    const { setLiveAuthUserId } = await import('@/app/utils/liveAuthUserId');
    const { assertLegalTermsAcceptedOrThrow } = await import(
        '@/app/services/auth/legalTermsAcceptance'
    );
    const {
        validateLawyerSignupAccountOnly,
        validateLawyerProfileDetails,
        normalizeRegistrationEmail,
    } = await import('@/app/services/auth/registrationCredentialsSecurity');

    clearExplicitLocalGuest();
    clearExplicitDevUnlock();
    assertLegalTermsAcceptedOrThrow();

    const accountErr = validateLawyerSignupAccountOnly(input);
    if (accountErr) throw new Error(accountErr);
    const profileErr = validateLawyerProfileDetails(input);
    if (profileErr) throw new Error(profileErr);
    const { assertLawyerIdentityImagesReady, compactIdentityPreviewForSignup } = await import(
        '@/app/services/auth/identityImageDataUrl'
    );
    const idErr = assertLawyerIdentityImagesReady(input.idFrontDataUrl, input.idBackDataUrl);
    if (idErr) throw new Error(idErr);

    const email = normalizeRegistrationEmail(input.email);
    const idFrontPreview = compactIdentityPreviewForSignup(input.idFrontDataUrl);
    const idBackPreview = compactIdentityPreviewForSignup(input.idBackDataUrl);
    if (!idFrontPreview || !idBackPreview) {
        throw new Error('تعذّر اعتماد صور الهوية — أعد رفع الوجه والظهر بصيغة JPG أو PNG');
    }
    const signupResult = await authSignup(email, input.password, {
        accountType: 'lawyer',
        verificationStatus: 'pending',
        fullName: input.fullName,
        familyName: input.familyName,
        phone: input.phone,
        governorate: input.governorate,
        lawyerBarRoom: input.lawyerBarRoom,
        verification: {
            hasIdFront: true,
            hasIdBack: true,
            hasFaceSelfie: Boolean(input.faceSelfieDataUrl),
            faceAssistOptedIn: input.faceAssistOptedIn,
            idFrontPreview,
            idBackPreview,
            faceSelfiePreview: compactIdentityPreviewForSignup(input.faceSelfieDataUrl),
        },
    });

    let user: User | null = null;
    try {
        user = await authLogin(email, input.password, bindings);
    } catch {
        /* تأكيد البريد قد يمنع الجلسة — نكمل الطلب للإدارة */
    }

    const resolvedId = user?.id?.trim() || signupResult.userId;
    const emailConfirmRequired = !user && Boolean(signupResult.userId);
    if (!resolvedId) {
        throw new Error(
            'تم إنشاء الحساب لكن تعذّر فتح الجلسة تلقائياً — سجّل الدخول يدوياً بعد تأكيد البريد إن لزم.',
        );
    }
    setLiveAuthUserId(resolvedId);
    if (emailConfirmRequired) {
        const { markEmailConfirmationPending } = await import(
            '@/app/services/auth/emailConfirmationClient'
        );
        markEmailConfirmationPending(email);
    }

    const finalized = await authFinalizeLawyerOnboarding({
        email: input.email,
        fullName: input.fullName,
        familyName: input.familyName,
        phone: input.phone,
        governorate: input.governorate,
        lawyerBarRoom: input.lawyerBarRoom,
        idFrontDataUrl: input.idFrontDataUrl,
        idBackDataUrl: input.idBackDataUrl,
        faceSelfieDataUrl: input.faceSelfieDataUrl,
        faceAssistOptedIn: input.faceAssistOptedIn,
        userId: resolvedId,
    });
    return {
        userId: resolvedId,
        pendingMessage: finalized.pendingMessage,
        emailConfirmRequired,
        hqReceived: finalized.hqReceived,
    };
}

export type AuthLogoutOptions = {
    skipLocalPurge?: boolean;
};

export async function authLogout(
    bindings: AuthProviderRuntimeBindings,
    options?: AuthLogoutOptions,
): Promise<{
    serverOk: boolean;
    purgeComplete: boolean;
}> {
    const { applyGuestSession, applySignedOutState } = bindings;
    const userId = resolveLiveAuthUserIdForStorage();
    nextBffAuthSyncGeneration();
    bindings.setIsLoading(false);
    stopBffSessionKeeper();

    const keepDevMock = shouldApplyGuestFallbackSession();
    /* واجهة الخروج فوراً — لا تنتظر شبكة الخادم ولا مسح المخزن المحلي */
    if (keepDevMock) {
        applyGuestSession();
    } else {
        purgeClientAuthResidue();
        applySignedOutState();
    }
    publishAuthLogout();

    try {
        const { clearExplicitLocalGuest } = await import('@/app/services/auth/localGuestSession');
        clearExplicitLocalGuest();
        const { clearExplicitDevUnlock } = await import('@/app/services/auth/devUnlockSession');
        clearExplicitDevUnlock();
    } catch {
        /* ignore */
    }
    try {
        if (__HAMI_CLIENT_PRODUCT__ !== 'hq') {
            const { invalidateProfileWarmCache } = await import('@/app/services/profile/profileWarmCache');
            invalidateProfileWarmCache();
        }
    } catch {
        /* best effort */
    }

    let purgeComplete = true;
    if (__HAMI_CLIENT_PRODUCT__ !== 'hq' && !options?.skipLocalPurge) {
        void import('@/app/services/settings/applicationWipe')
            .then(({ purgeLocalApplicationData }) =>
                purgeLocalApplicationData(userId, undefined, { preserveLegalTerms: true }),
            )
            .then((result) => {
                if (!result.complete) {
                    console.warn('[auth] local logout purge incomplete:', result.failedStages.join(', '));
                }
            })
            .catch(() => {
                /* واجهة الخروج ظهرت — المسح المحلي أفضل جهد */
            });
    }

    let serverOk = true;
    if (isBffAuthEnabled()) {
        /* بعد ظهور بوابة الدخول — لا تُحذف جلسة CSRF قبل POST الخروج */
        if (!(await bffLogout())) {
            serverOk = false;
        }
        clearCsrfSessionToken();
        try {
            const { invalidateCsrfSessionReady } = await import('@/app/security/ensureCsrfSessionReady');
            invalidateCsrfSessionReady();
        } catch {
            /* ignore */
        }
    } else {
        try {
            await signOutSupabase();
        } catch {
            serverOk = false;
        }
    }

    return { serverOk, purgeComplete };
}

async function applyMockSession(
    bindings: Pick<AuthProviderRuntimeBindings, 'setUser' | 'setSession' | 'setIsLoading'>,
    params: {
        id: string;
        email: string;
        role: 'lawyer' | 'admin';
        fullName: string;
        refreshToken: string;
    },
): Promise<void> {
    const { setUser, setSession, setIsLoading } = bindings;
    const nowIso = new Date().toISOString();
    const systemRole = systemRoleForSignup(params.role);
    const mockUser = {
        id: params.id,
        aud: 'authenticated',
        role: 'authenticated',
        email: params.email,
        phone: '',
        created_at: nowIso,
        updated_at: nowIso,
        app_metadata: {
            provider: 'email',
            providers: ['email'],
            systemRole,
            ...(params.role === 'admin' ? { role: UserRole.SUPER_ADMIN } : {}),
        },
        user_metadata: {
            role: params.role,
            accountType: params.role,
            fullName: params.fullName,
            systemRole,
            ...(params.role === 'lawyer' ? { verificationStatus: 'active' } : {}),
        },
    } as unknown as User;

    const mockSession = {
        access_token: `dev-access-token-${params.id}`,
        token_type: 'bearer',
        expires_in: 60 * 60,
        expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
        refresh_token: params.refreshToken,
        user: mockUser,
    } as unknown as Session;

    setSession(mockSession);
    setUser(mockUser);
    setIsLoading(false);
    writeDevMockAuth(mockSession);

    if (params.role === 'lawyer' && !import.meta.env.DEV) {
        prefetchLawyerDashboardIfPhoneProduct();
    }
}

export async function authDevBypassLogin(
    bindings: Pick<AuthProviderRuntimeBindings, 'setUser' | 'setSession' | 'setIsLoading'>,
): Promise<void> {
    if (!import.meta.env.DEV) {
        throw new Error('دخول المطوّر متاح في بيئة التطوير فقط');
    }
    const { clearExplicitLocalGuest } = await import('@/app/services/auth/localGuestSession');
    const { DEV_UNLOCK_LAWYER_ID, createDevUnlockLawyerSession, markExplicitDevUnlock } =
        await import('@/app/services/auth/devUnlockSession');
    const { markLegalTermsAccepted } = await import('@/app/services/auth/legalTermsAcceptance');
    const { applyLawyerVerificationStatusFromServer } = await import(
        '@/app/services/auth/lawyerVerificationStore'
    );

    clearExplicitLocalGuest();
    markExplicitDevUnlock();
    markLegalTermsAccepted();
    applyLawyerVerificationStatusFromServer(DEV_UNLOCK_LAWYER_ID, 'active');
    nextBffAuthSyncGeneration();

    const unlocked = createDevUnlockLawyerSession();
    bindings.setSession(unlocked.session);
    bindings.setUser(unlocked.user);
    bindings.setIsLoading(false);
    writeDevMockAuth(unlocked.session);
    prefetchLawyerDashboardIfPhoneProduct();
    await logAction('dev_unlock_enter', { source: 'AuthContext' });
}

export async function authAdminBypassLogin(
    bindings: Pick<AuthProviderRuntimeBindings, 'setUser' | 'setSession' | 'setIsLoading'>,
): Promise<void> {
    const isDev =
        typeof import.meta !== 'undefined' &&
        Boolean((import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV);
    if (!isDev && process.env.NODE_ENV === 'production') {
        throw new Error('admin bypass disabled outside development');
    }
    if (!isDev) {
        throw new Error('admin bypass requires development build');
    }
    const { HAMI_PLATFORM_ADMIN_UUID } = await import('@/app/constants/hamiPlatformAdminId');
    await applyMockSession(bindings, {
        id: HAMI_PLATFORM_ADMIN_UUID,
        email: 'hami.apps@proton.me',
        role: 'admin',
        fullName: 'Dev Super Admin',
        refreshToken: 'DEV_ADMIN_REFRESH_TOKEN',
    });
}

/** خروج لـ useAppRootAuth عند غياب Provider (HMR / تقسيم حزم) */
export async function performRootAuthLogout(): Promise<void> {
    if (shouldApplyGuestFallbackSession()) {
        writeDevMockAuth(getDevMockLawyerSession().session);
        return;
    }
    purgeClientAuthResidue();
    clearCsrfSessionToken();
    await signOutSupabase().catch(() => {});
    if (isBffAuthEnabled()) await bffLogout().catch(() => {});
    publishAuthLogout();
}
