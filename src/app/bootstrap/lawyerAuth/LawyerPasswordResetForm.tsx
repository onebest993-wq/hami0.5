import React, { useEffect, useRef, useState, type FormEvent, type ReactElement } from 'react';

import '@/app/bootstrap/lawyerAuth/authGateSurface.css';
import { useBootGateSurfaceReady } from '@/app/bootstrap/useBootGateSurfaceReady';
import { AuthPasswordField } from '@/app/bootstrap/lawyerAuth/AuthPasswordField';
import {
    authGateCardClass,
    authGateErrorClass,
    authGateGhostBtnClass,
    authGateHintClass,
    authGatePanelClass,
    authGatePrimaryBtnClass,
    authGateShellClass,
    authGateTitleClass,
} from '@/app/bootstrap/lawyerAuth/authGateStyles';
import { validateRegistrationPasswordSecure } from '@/app/services/auth/registrationCredentialsSecurity';
import {
    clearPasswordRecoveryPending,
    scrubPasswordRecoveryUrlMarkers,
} from '@/app/services/auth/passwordRecoveryGate';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { isAppForeground, subscribeAppForeground } from '@/app/runtime/appForegroundGate';

type Props = {
    onCompleted: () => void;
    onCancelToLogin: () => void;
};

const RECOVERY_PROBE_START_MS = 1_500;
const RECOVERY_PROBE_MAX_MS = 15_000;
const RECOVERY_PROBE_BACKOFF = 1.6;
const RECOVERY_PROBE_GIVE_UP_MS = 120_000;

export function LawyerPasswordResetForm({ onCompleted, onCancelToLogin }: Props): ReactElement {
    useBootGateSurfaceReady();
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [sessionReady, setSessionReady] = useState<boolean | null>(null);
    const submittingRef = useRef(false);

    /*
     * جلسة رابط الاستعادة تصل بعد لحظات من فتح الرابط. الاستقصاء يتوقف نهائياً عند
     * أول جلسة، ويتباطأ تدريجياً قبلها، ويُلغى في الخلفية، وله سقف زمني كلّي —
     * مؤقّت يتخطّى الخفاء ثم يعيد الجدولة يوقظ JS بلا عمل.
     */
    useEffect(() => {
        let cancelled = false;
        let timer = 0;
        let delay = RECOVERY_PROBE_START_MS;
        let suspended = false;
        const startedAt = Date.now();

        const clearTimer = () => {
            if (timer) {
                window.clearTimeout(timer);
                timer = 0;
            }
        };

        const schedule = () => {
            if (cancelled || suspended) return;
            if (Date.now() - startedAt >= RECOVERY_PROBE_GIVE_UP_MS) return;
            timer = window.setTimeout(run, delay);
            delay = Math.min(Math.round(delay * RECOVERY_PROBE_BACKOFF), RECOVERY_PROBE_MAX_MS);
        };

        const run = async () => {
            if (cancelled || suspended) return;
            if (Date.now() - startedAt >= RECOVERY_PROBE_GIVE_UP_MS) {
                setSessionReady(false);
                return;
            }
            try {
                const { getAuthSupabase } = await import('@/app/utils/authSupabaseLazy');
                const supabase = await getAuthSupabase();
                const { data } = await supabase.auth.getSession();
                if (cancelled || suspended) return;
                if (data.session) {
                    setSessionReady(true);
                    return;
                }
                setSessionReady(false);
            } catch {
                if (cancelled || suspended) return;
                setSessionReady(false);
            }
            schedule();
        };

        const unsub = subscribeAppForeground({
            onSuspend: () => {
                suspended = true;
                clearTimer();
            },
            onResume: () => {
                if (cancelled) return;
                suspended = false;
                delay = RECOVERY_PROBE_START_MS;
                void run();
            },
        });

        if (isAppForeground()) void run();
        else suspended = true;

        return () => {
            cancelled = true;
            clearTimer();
            unsub();
        };
    }, []);

    const onSubmit = async (event: FormEvent) => {
        event.preventDefault();
        if (submittingRef.current || loading || done) return;
        setError('');
        if (!sessionReady) {
            setError('لم يتم تفعيل رابط الاستعادة بعد. افتح الرابط من البريد في هذه النافذة.');
            return;
        }
        const policy = validateRegistrationPasswordSecure(password);
        if (policy) {
            setError(policy);
            return;
        }
        if (password !== confirm) {
            setError('تأكيد كلمة المرور غير متطابق');
            return;
        }
        submittingRef.current = true;
        setLoading(true);
        try {
            const { updateAuthPassword } = await import('@/app/utils/authSupabaseLazy');
            const { error: updateError } = await updateAuthPassword(password);
            if (updateError) throw updateError;
            const { isBffAuthEnabled } = await import('@/app/utils/bffAuthFlags');
            if (isBffAuthEnabled()) {
                const { signOutSupabase } = await import('@/app/utils/authSupabaseLazy');
                await signOutSupabase().catch(() => undefined);
            }
            clearPasswordRecoveryPending();
            scrubPasswordRecoveryUrlMarkers();
            setDone(true);
            SmartToast.success('تم تحديث كلمة المرور بنجاح');
            onCompleted();
        } catch (e) {
            const { humanizeAuthError } = await import('@/app/services/auth/humanizeAuthError');
            const msg = humanizeAuthError(e, 'تعذّر تحديث كلمة المرور', 'generic');
            const lower = msg.toLowerCase();
            if (lower.includes('session') || lower.includes('auth') || /جلسة|صلاحية/.test(msg)) {
                setError('انتهت صلاحية رابط الاستعادة. اطلب رابطاً جديداً من «نسيت كلمة المرور؟».');
            } else {
                setError(msg);
            }
        } finally {
            submittingRef.current = false;
            setLoading(false);
        }
    };

    return (
        <div
            className={authGateShellClass}
            data-testid="lawyer-password-reset-gate"
            data-hami-auth-gate=""
            role="main"
            aria-label="تعيين كلمة مرور جديدة"
        >
            <div className={authGatePanelClass}>
                <form
                    onSubmit={(e) => void onSubmit(e)}
                    className={authGateCardClass}
                    data-testid="lawyer-password-reset-form"
                    aria-label="نموذج كلمة المرور الجديدة"
                >
                    <h1 className={authGateTitleClass}>كلمة مرور جديدة</h1>
                    <p className={authGateHintClass}>
                        أدخل كلمة مرور قوية بالإنجليزية (٨ أحرف على الأقل، حرف + رقم)، ثم أكّدها. بعد
                        الحفظ يمكنك الدخول فوراً.
                    </p>
                    {sessionReady === false ? (
                        <p
                            className={authGateHintClass}
                            role="status"
                            data-testid="lawyer-password-reset-waiting"
                            style={{ color: 'rgba(251, 191, 36, 0.95)' }}
                        >
                            بانتظار تفعيل رابط البريد… إن فتحت الصفحة يدوياً دون الرابط، اطلب استعادة
                            جديدة.
                        </p>
                    ) : null}
                    <AuthPasswordField
                        label="كلمة المرور الجديدة"
                        testId="lawyer-password-reset-new"
                        autoComplete="new-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <AuthPasswordField
                        label="تأكيد كلمة المرور"
                        testId="lawyer-password-reset-confirm"
                        autoComplete="new-password"
                        required
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                    />
                    {error ? (
                        <p
                            className={authGateErrorClass}
                            role="alert"
                            data-testid="lawyer-password-reset-error"
                        >
                            {error}
                        </p>
                    ) : null}
                    {done ? (
                        <p
                            className={authGateHintClass}
                            role="status"
                            data-testid="lawyer-password-reset-success"
                            style={{ color: 'rgba(52, 211, 153, 0.95)' }}
                        >
                            تم التحديث. جاري فتح التطبيق…
                        </p>
                    ) : null}
                    <button
                        type="submit"
                        disabled={loading || done || sessionReady === false}
                        className={authGatePrimaryBtnClass}
                        data-testid="lawyer-password-reset-submit"
                    >
                        {loading ? 'جاري الحفظ…' : 'حفظ كلمة المرور'}
                    </button>
                    <button
                        type="button"
                        className={authGateGhostBtnClass}
                        disabled={loading}
                        onClick={() => {
                            clearPasswordRecoveryPending();
                            scrubPasswordRecoveryUrlMarkers();
                            onCancelToLogin();
                        }}
                        data-testid="lawyer-password-reset-cancel"
                    >
                        العودة لتسجيل الدخول
                    </button>
                </form>
            </div>
        </div>
    );
}
