import { useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactElement } from 'react';
import { useAuth } from '@/app/context/authHooks';
import { SmartToast } from '@/app/components/ui/SmartToast';
import {
    sanitizeRegistrationCredentialsForSubmit,
    validateLawyerProfileDetails,
    validateLawyerSignupAccountOnly,
} from '@/app/services/auth/registrationCredentialsSecurity';
import { assertLawyerIdentityImagesReady } from '@/app/services/auth/identityImageDataUrl';
import {
    clearRegistrationReviewHold,
    markRegistrationReviewHold,
} from '@/app/services/auth/registrationReviewHold';
import { fileToDataUrl } from '@/app/bootstrap/lawyerAuth/registerWizardIdentityField';
import { LawyerRegisterCredentialsStep } from '@/app/bootstrap/lawyerAuth/LawyerRegisterCredentialsStep';
import { LawyerRegisterProfileStep } from '@/app/bootstrap/lawyerAuth/LawyerRegisterProfileStep';
import { LawyerRegisterIdentityStep } from '@/app/bootstrap/lawyerAuth/LawyerRegisterIdentityStep';
import { LawyerRegisterFaceStep } from '@/app/bootstrap/lawyerAuth/LawyerRegisterFaceStep';
import { LawyerRegisterCompleteStep } from '@/app/bootstrap/lawyerAuth/LawyerRegisterCompleteStep';
import { LawyerAuthOtpPanel } from '@/app/bootstrap/lawyerAuth/LawyerAuthOtpPanel';

type Step = 'credentials' | 'profile' | 'identity' | 'face' | 'complete';

type Props = {
    onBack: () => void;
};

export function LawyerRegisterWizard({ onBack }: Props): ReactElement {
    const { registerLawyer, finalizeLawyerOnboarding, resendEmailConfirmation, enterLocalGuest, user } =
        useAuth();
    const [step, setStep] = useState<Step>('credentials');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [retryHqLoading, setRetryHqLoading] = useState(false);
    const [emailConfirmRequired, setEmailConfirmRequired] = useState(false);
    const [hqReceived, setHqReceived] = useState(true);
    const [otpConfirm, setOtpConfirm] = useState(false);
    const submittingRef = useRef(false);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [fullName, setFullName] = useState('');
    const [familyName, setFamilyName] = useState('');
    const [governorate, setGovernorate] = useState('');
    const [lawyerBarRoom, setLawyerBarRoom] = useState('');
    const [idFrontDataUrl, setIdFrontDataUrl] = useState<string | null>(null);
    const [idBackDataUrl, setIdBackDataUrl] = useState<string | null>(null);
    const [faceSelfieDataUrl, setFaceSelfieDataUrl] = useState<string | null>(null);

    const stepTitle = useMemo(() => {
        if (step === 'credentials') return 'إنشاء حساب محامٍ';
        if (step === 'profile') return 'أكمل بياناتك';
        if (step === 'identity') return 'هوية النقابة';
        if (step === 'complete') return 'طلبك عند الإدارة';
        return 'صورة إضافية (اختياري)';
    }, [step]);

    const onPickImage = async (
        event: ChangeEvent<HTMLInputElement>,
        setter: (v: string | null) => void,
    ) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            const dataUrl = await fileToDataUrl(file);
            setter(dataUrl);
            setError('');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'تعذّر رفع الصورة');
        }
    };

    const goProfile = async (event: FormEvent) => {
        event.preventDefault();
        if (submittingRef.current || loading) return;
        const err = validateLawyerSignupAccountOnly({ email, password, confirmPassword });
        if (err) {
            setError(err);
            return;
        }
        const { hasAcceptedCurrentLegalTerms } = await import(
            '@/app/services/auth/legalTermsAcceptance'
        );
        if (!hasAcceptedCurrentLegalTerms()) {
            setError('يلزم الموافقة على الشروط والأحكام قبل إنشاء الحساب');
            return;
        }
        const sanitized = sanitizeRegistrationCredentialsForSubmit({
            email,
            password,
            confirmPassword,
            phone,
            fullName,
            familyName,
            governorate,
            lawyerBarRoom,
        });
        setEmail(sanitized.email);
        setError('');
        setStep('profile');
    };

    const onResendConfirm = async () => {
        if (resendLoading || submittingRef.current) return;
        const trimmed = email.trim().toLowerCase();
        if (!trimmed.includes('@')) {
            setError('أدخل بريدك الإلكتروني أولاً ثم اضغط «إعادة إرسال التأكيد»');
            return;
        }
        setResendLoading(true);
        setError('');
        try {
            const message = await resendEmailConfirmation(trimmed);
            SmartToast.success(message);
        } catch (e) {
            const { humanizeAuthError } = await import('@/app/services/auth/humanizeAuthError');
            setError(humanizeAuthError(e, 'تعذّر إعادة الإرسال', 'register'));
        } finally {
            setResendLoading(false);
        }
    };

    const goIdentity = (event: FormEvent) => {
        event.preventDefault();
        const err = validateLawyerProfileDetails({
            phone,
            fullName,
            familyName,
            governorate,
            lawyerBarRoom,
        });
        if (err) {
            setError(err);
            return;
        }
        const sanitized = sanitizeRegistrationCredentialsForSubmit({
            email,
            password,
            confirmPassword,
            phone,
            fullName,
            familyName,
            governorate,
            lawyerBarRoom,
        });
        setPhone(sanitized.phone);
        setFullName(sanitized.fullName);
        setFamilyName(sanitized.familyName);
        setGovernorate(sanitized.governorate);
        setLawyerBarRoom(sanitized.lawyerBarRoom);
        setError('');
        setStep('identity');
    };

    const goFaceOrSubmit = async (event: FormEvent) => {
        event.preventDefault();
        const profileErr = validateLawyerProfileDetails({
            phone,
            fullName,
            familyName,
            governorate,
            lawyerBarRoom,
        });
        if (profileErr) {
            setError(profileErr);
            setStep('profile');
            return;
        }
        const idErr = assertLawyerIdentityImagesReady(idFrontDataUrl, idBackDataUrl);
        if (idErr) {
            setError(idErr);
            return;
        }
        setError('');
        setStep('face');
    };

    const submitOnboarding = async (withFace: boolean) => {
        if (submittingRef.current || loading) return;
        submittingRef.current = true;
        setLoading(true);
        setError('');
        try {
            const idErr = assertLawyerIdentityImagesReady(idFrontDataUrl, idBackDataUrl);
            if (idErr) {
                setError(idErr);
                setStep('identity');
                return;
            }
            if (withFace && !faceSelfieDataUrl) {
                setError('أرفق الصورة الإضافية أو تخطَّ الخطوة');
                return;
            }
            if (withFace) {
                const { assessFaceAssistPresence } = await import(
                    '@/app/services/auth/lawyerIdentityAssist'
                );
                const face = assessFaceAssistPresence({
                    idFrontDataUrl,
                    faceSelfieDataUrl,
                });
                if (!face.ready) {
                    setError(face.note);
                    return;
                }
                SmartToast.info(face.note);
            }
            const sanitized = sanitizeRegistrationCredentialsForSubmit({
                email,
                password,
                confirmPassword,
                phone,
                fullName,
                familyName,
                governorate,
                lawyerBarRoom,
            });
            const result = await registerLawyer({
                email: sanitized.email,
                password: sanitized.password,
                fullName: sanitized.fullName,
                familyName: sanitized.familyName,
                phone: sanitized.phone,
                governorate: sanitized.governorate,
                lawyerBarRoom: sanitized.lawyerBarRoom,
                idFrontDataUrl,
                idBackDataUrl,
                faceSelfieDataUrl: withFace ? faceSelfieDataUrl : null,
                faceAssistOptedIn: withFace,
            });
            setEmailConfirmRequired(Boolean(result.emailConfirmRequired));
            markRegistrationReviewHold(Boolean(result.emailConfirmRequired));
            setHqReceived(result.hqReceived);
            if (result.hqReceived) {
                SmartToast.success(result.pendingMessage);
            } else {
                SmartToast.error(result.pendingMessage);
            }
            setStep('complete');
        } catch (e) {
            const { humanizeAuthError, isDuplicateSignupErrorMessage } = await import(
                '@/app/services/auth/humanizeAuthError'
            );
            const msg = humanizeAuthError(e, 'فشل إكمال التسجيل', 'register');
            setError(msg);
            if (isDuplicateSignupErrorMessage(msg) || isDuplicateSignupErrorMessage(String(e))) {
                SmartToast.info('الحساب موجود مسبقاً — يمكنك الرجوع وتسجيل الدخول');
                setStep('credentials');
            }
        } finally {
            submittingRef.current = false;
            setLoading(false);
        }
    };

    const retryHqSubmit = async () => {
        if (submittingRef.current || retryHqLoading || hqReceived) return;
        submittingRef.current = true;
        setRetryHqLoading(true);
        setError('');
        try {
            const idErr = assertLawyerIdentityImagesReady(idFrontDataUrl, idBackDataUrl);
            if (idErr) {
                setError(idErr);
                setStep('identity');
                return;
            }
            const sanitized = sanitizeRegistrationCredentialsForSubmit({
                email,
                password,
                confirmPassword,
                phone,
                fullName,
                familyName,
                governorate,
                lawyerBarRoom,
            });
            const result = await finalizeLawyerOnboarding({
                email: sanitized.email,
                fullName: sanitized.fullName,
                familyName: sanitized.familyName,
                phone: sanitized.phone,
                governorate: sanitized.governorate,
                lawyerBarRoom: sanitized.lawyerBarRoom,
                idFrontDataUrl,
                idBackDataUrl,
                faceSelfieDataUrl,
                faceAssistOptedIn: Boolean(faceSelfieDataUrl),
            });
            setHqReceived(result.hqReceived);
            if (result.hqReceived) {
                SmartToast.success(result.pendingMessage);
            } else {
                SmartToast.error(result.pendingMessage);
            }
        } catch (e) {
            const { humanizeAuthError } = await import('@/app/services/auth/humanizeAuthError');
            setError(humanizeAuthError(e, 'تعذّر إرسال الطلب للإدارة', 'register'));
        } finally {
            submittingRef.current = false;
            setRetryHqLoading(false);
        }
    };

    if (step === 'complete' && otpConfirm) {
        return (
            <LawyerAuthOtpPanel
                purpose="email_confirm"
                initialEmail={email}
                onBack={() => setOtpConfirm(false)}
            />
        );
    }

    if (step === 'complete') {
        return (
            <LawyerRegisterCompleteStep
                hqReceived={hqReceived}
                emailConfirmRequired={emailConfirmRequired}
                loading={loading}
                resendLoading={resendLoading}
                retryHqLoading={retryHqLoading}
                error={error}
                onRetryHqSubmit={!hqReceived ? () => void retryHqSubmit() : undefined}
                onResendConfirm={() => void onResendConfirm()}
                onConfirmOtp={() => setOtpConfirm(true)}
                onEnterWithoutWaiting={() => {
                    clearRegistrationReviewHold();
                    if (!user) {
                        void enterLocalGuest().catch((e) => {
                            setError(e instanceof Error ? e.message : 'تعذّر الدخول');
                        });
                    }
                }}
                onGoLogin={onBack}
            />
        );
    }

    if (step === 'face') {
        return (
            <LawyerRegisterFaceStep
                title={stepTitle}
                faceSelfieDataUrl={faceSelfieDataUrl}
                loading={loading}
                error={error}
                onPick={(e) => void onPickImage(e, setFaceSelfieDataUrl)}
                onSubmitWithFace={() => void submitOnboarding(true)}
                onSkip={() => {
                    if (loading) return;
                    setError('');
                    setFaceSelfieDataUrl(null);
                    void submitOnboarding(false);
                }}
                onBack={() => setStep('identity')}
            />
        );
    }

    if (step === 'identity') {
        return (
            <LawyerRegisterIdentityStep
                title={stepTitle}
                idFrontDataUrl={idFrontDataUrl}
                idBackDataUrl={idBackDataUrl}
                loading={loading}
                error={error}
                onPickFront={(e) => void onPickImage(e, setIdFrontDataUrl)}
                onPickBack={(e) => void onPickImage(e, setIdBackDataUrl)}
                onSubmit={(e) => void goFaceOrSubmit(e)}
                onBack={() => setStep('profile')}
            />
        );
    }

    if (step === 'profile') {
        return (
            <LawyerRegisterProfileStep
                title={stepTitle}
                phone={phone}
                fullName={fullName}
                familyName={familyName}
                governorate={governorate}
                lawyerBarRoom={lawyerBarRoom}
                loading={loading}
                error={error}
                onPhone={setPhone}
                onFullName={setFullName}
                onFamilyName={setFamilyName}
                onGovernorate={setGovernorate}
                onLawyerBarRoom={setLawyerBarRoom}
                onSubmit={goIdentity}
                onBack={() => setStep('credentials')}
            />
        );
    }

    return (
        <LawyerRegisterCredentialsStep
            title={stepTitle}
            email={email}
            password={password}
            confirmPassword={confirmPassword}
            loading={loading}
            error={error}
            onEmail={setEmail}
            onPassword={setPassword}
            onConfirmPassword={setConfirmPassword}
            onSubmit={(e) => void goProfile(e)}
            onBack={onBack}
        />
    );
}
