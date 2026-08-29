import type { ChangeEvent, FormEvent, ReactElement } from 'react';
import { IdentityImageField } from '@/app/bootstrap/lawyerAuth/registerWizardIdentityField';
import {
    authGateCardClass,
    authGateErrorClass,
    authGateGhostBtnClass,
    authGatePrimaryBtnClass,
    authGateTitleClass,
} from '@/app/bootstrap/lawyerAuth/authGateStyles';

type LawyerRegisterIdentityStepProps = {
    title: string;
    idFrontDataUrl: string | null;
    idBackDataUrl: string | null;
    loading: boolean;
    error: string;
    onPickFront: (event: ChangeEvent<HTMLInputElement>) => void;
    onPickBack: (event: ChangeEvent<HTMLInputElement>) => void;
    onSubmit: (event: FormEvent) => void;
    onBack: () => void;
};

export function LawyerRegisterIdentityStep({
    title,
    idFrontDataUrl,
    idBackDataUrl,
    loading,
    error,
    onPickFront,
    onPickBack,
    onSubmit,
    onBack,
}: LawyerRegisterIdentityStepProps): ReactElement {
    const ready = Boolean(idFrontDataUrl && idBackDataUrl);
    return (
        <form
            onSubmit={onSubmit}
            className={authGateCardClass}
            data-testid="lawyer-register-identity"
            noValidate
        >
            <h1 className={authGateTitleClass}>{title}</h1>
            <p className="text-sm text-white/70">
                أرفق وجه وظهر هوية نقابة المحامين. لا يمكن المتابعة دون الصورتين.
            </p>
            <IdentityImageField
                label="وجه هوية النقابة"
                testId="lawyer-register-id-front"
                required
                hasValue={Boolean(idFrontDataUrl)}
                previewUrl={idFrontDataUrl}
                captureMode="environment"
                onPick={onPickFront}
            />
            <IdentityImageField
                label="ظهر هوية النقابة"
                testId="lawyer-register-id-back"
                required
                hasValue={Boolean(idBackDataUrl)}
                previewUrl={idBackDataUrl}
                captureMode="environment"
                onPick={onPickBack}
            />
            {error ? (
                <p className={authGateErrorClass} role="alert">
                    {error}
                </p>
            ) : null}
            <button
                type="submit"
                disabled={loading || !ready}
                className={authGatePrimaryBtnClass}
                data-testid="lawyer-register-identity-next"
            >
                {loading ? 'جاري فحص البطاقة…' : ready ? 'متابعة' : 'أرفق الوجه والظهر للمتابعة'}
            </button>
            <button type="button" className={authGateGhostBtnClass} onClick={onBack}>
                رجوع
            </button>
        </form>
    );
}
