import React, { useCallback, useEffect, useId, useState, type FormEvent } from 'react';
import { cn } from '@/app/components/ui/utils';
import {
    bindHqStepUpHost,
    rejectHqStepUp,
    resolveHqStepUp,
} from '@/app/components/admin/hqStepUpClient';
import {
    requestAdminHeadquartersOtp,
    verifyAdminHeadquartersOtp,
} from '@/app/services/admin/adminHeadquartersOtpClient';

/**
 * غطاء إعادة رمز التحقق للفعل الخطير — نفس حقول بوابة الدخول دون إعادة تصميم المقر.
 */
export function HqStepUpHost() {
    const otpFieldId = useId();
    const [open, setOpen] = useState(false);
    const [otp, setOtp] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [sent, setSent] = useState(false);

    const closeCancel = useCallback(() => {
        setOpen(false);
        setOtp('');
        setError(null);
        setSent(false);
        rejectHqStepUp();
    }, []);

    const requestCode = useCallback(async () => {
        setBusy(true);
        setError(null);
        try {
            const result = await requestAdminHeadquartersOtp();
            if (!result.ok || result.delivered !== true) {
                setError(result.error || 'تعذّر إرسال رمز التحقق');
                return;
            }
            setSent(true);
            setOtp('');
        } finally {
            setBusy(false);
        }
    }, []);

    useEffect(() => {
        return bindHqStepUpHost(() => {
            setOpen(true);
            setOtp('');
            setError(null);
            setSent(false);
            void requestCode();
        });
    }, [requestCode]);

    const onVerify = useCallback(
        async (event?: FormEvent) => {
            event?.preventDefault();
            const code = otp.replace(/\D/g, '').slice(0, 6);
            if (code.length !== 6) {
                setError('أدخل رمزاً مكوّناً من 6 أرقام');
                return;
            }
            setBusy(true);
            setError(null);
            try {
                const result = await verifyAdminHeadquartersOtp(code);
                if (!result.ok) {
                    setError(result.error || 'رمز التحقق غير صحيح');
                    return;
                }
                setOpen(false);
                setOtp('');
                resolveHqStepUp();
            } finally {
                setBusy(false);
            }
        },
        [otp],
    );

    if (!open) return null;

    return (
        <div
            className="hq-stepup-root"
            role="dialog"
            aria-modal="true"
            aria-labelledby="hq-stepup-title"
            data-testid="hq-stepup-host"
        >
            <div className="hq-stepup-card">
                <p className="hq-kicker">تأكيد الإجراء</p>
                <h2 id="hq-stepup-title" className="hq-title">
                    رمز تحقق جديد
                </h2>
                <p className="hq-stepup-hint">
                    هذا الإجراء يغيّر حساباً أو مكتبة القوانين. أدخل الرمز المرسل إلى بريد المدير.
                </p>
                {sent ? (
                    <p className="hq-ops-stamp" role="status">
                        تم إرسال الرمز. صالح لدقائق معدودة.
                    </p>
                ) : null}
                <form className="hq-stepup-form" onSubmit={(event) => void onVerify(event)} noValidate>
                    <label htmlFor={otpFieldId} className="hq-stepup-label">
                        رمز التحقق (6 أرقام)
                    </label>
                    <input
                        id={otpFieldId}
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        autoFocus
                        maxLength={6}
                        value={otp}
                        disabled={busy}
                        onChange={(event) => {
                            setError(null);
                            setOtp(event.target.value.replace(/\D/g, '').slice(0, 6));
                        }}
                        placeholder="••••••"
                        className="hq-stepup-input"
                        dir="ltr"
                        data-testid="hq-stepup-input"
                    />
                    {error ? (
                        <p role="alert" className="hq-stepup-error">
                            {error}
                        </p>
                    ) : null}
                    <div className="hq-stepup-actions">
                        <button
                            type="submit"
                            disabled={busy || otp.replace(/\D/g, '').length !== 6}
                            className={cn('hq-btn hq-verify-approve')}
                            data-testid="hq-stepup-verify"
                        >
                            {busy ? 'جاري التحقق…' : 'تأكيد ثم تنفيذ'}
                        </button>
                        <button
                            type="button"
                            disabled={busy}
                            className="hq-btn hq-btn-ghost"
                            onClick={closeCancel}
                            data-testid="hq-stepup-cancel"
                        >
                            إلغاء
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
