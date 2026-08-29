import type { ChangeEvent, ReactElement } from 'react';
import { IdentityImageField } from '@/app/bootstrap/lawyerAuth/registerWizardIdentityField';
import {
    authGateCardClass,
    authGateErrorClass,
    authGateGhostBtnClass,
    authGatePrimaryBtnClass,
    authGateSecondaryBtnClass,
    authGateTitleClass,
} from '@/app/bootstrap/lawyerAuth/authGateStyles';

type LawyerRegisterFaceStepProps = {
    title: string;
    faceSelfieDataUrl: string | null;
    loading: boolean;
    error: string;
    onPick: (event: ChangeEvent<HTMLInputElement>) => void;
    onSubmitWithFace: () => void;
    onSkip: () => void;
    onBack: () => void;
};

export function LawyerRegisterFaceStep({
    title,
    faceSelfieDataUrl,
    loading,
    error,
    onPick,
    onSubmitWithFace,
    onSkip,
    onBack,
}: LawyerRegisterFaceStepProps): ReactElement {
    return (
        <div className={authGateCardClass} data-testid="lawyer-register-face">
            <h1 className={authGateTitleClass}>{title}</h1>
            <p className="text-sm text-white/70 leading-relaxed">
                خطوة اختيارية: أرسل صورة إضافية للمساعدة في التدقيق. القرار النهائي بشري من الإدارة —
                لا يُعتمد الحساب تلقائياً.
            </p>
            <IdentityImageField
                label="صورة إضافية (اختياري)"
                testId="lawyer-register-face"
                cameraTestId="lawyer-register-face-input"
                galleryTestId="lawyer-register-face-gallery"
                hasValue={Boolean(faceSelfieDataUrl)}
                previewUrl={faceSelfieDataUrl}
                captureMode="user"
                onPick={onPick}
            />
            {error ? (
                <p className={authGateErrorClass} role="alert">
                    {error}
                </p>
            ) : null}
            <button
                type="button"
                disabled={loading || !faceSelfieDataUrl}
                className={authGatePrimaryBtnClass}
                onClick={onSubmitWithFace}
                data-testid="lawyer-register-face-submit"
            >
                {loading ? 'جاري الإرسال…' : 'إتمام مع الصورة الإضافية'}
            </button>
            <button
                type="button"
                disabled={loading}
                className={authGateSecondaryBtnClass}
                onClick={onSkip}
                data-testid="lawyer-register-face-skip"
            >
                تخطّي والمتابعة
            </button>
            <button
                type="button"
                className={authGateGhostBtnClass}
                onClick={onBack}
                disabled={loading}
            >
                رجوع
            </button>
        </div>
    );
}
