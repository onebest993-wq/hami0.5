import type { FormEvent, ReactElement } from 'react';
import { IRAQ_REGISTRATION_GOVERNORATES } from '@/app/services/auth/iraqiLawyerRegistrationCatalog';
import { normalizeIraqiPhoneInput } from '@/app/services/auth/registrationCredentialsSecurity';
import {
    authGateCardClass,
    authGateErrorClass,
    authGateGhostBtnClass,
    authGateHintClass,
    authGateInputClass,
    authGateLabelClass,
    authGateLabelTextClass,
    authGatePrimaryBtnClass,
    authGateTitleClass,
} from '@/app/bootstrap/lawyerAuth/authGateStyles';
import { DISPLAY_NAME_REGISTER_NOTE } from '@/app/domain/profile/displayNameCorrection';

type LawyerRegisterProfileStepProps = {
    title: string;
    phone: string;
    fullName: string;
    familyName: string;
    governorate: string;
    lawyerBarRoom: string;
    loading: boolean;
    error: string;
    onPhone: (value: string) => void;
    onFullName: (value: string) => void;
    onFamilyName: (value: string) => void;
    onGovernorate: (value: string) => void;
    onLawyerBarRoom: (value: string) => void;
    onSubmit: (event: FormEvent) => void;
    onBack: () => void;
};

export function LawyerRegisterProfileStep({
    title,
    phone,
    fullName,
    familyName,
    governorate,
    lawyerBarRoom,
    loading,
    error,
    onPhone,
    onFullName,
    onFamilyName,
    onGovernorate,
    onLawyerBarRoom,
    onSubmit,
    onBack,
}: LawyerRegisterProfileStepProps): ReactElement {
    return (
        <form
            onSubmit={onSubmit}
            className={authGateCardClass}
            data-testid="lawyer-register-profile"
        >
            <h1 className={authGateTitleClass}>{title}</h1>
            <p className="text-sm text-white/70 leading-relaxed">
                أكمل بياناتك المهنية ثم ارفع هوية النقابة. الاعتماد من الإدارة حصراً.
            </p>
            <label className={authGateLabelClass}>
                <span className={authGateLabelTextClass}>رقم الهاتف</span>
                <input
                    type="tel"
                    inputMode="numeric"
                    required
                    value={phone}
                    onChange={(e) => onPhone(normalizeIraqiPhoneInput(e.target.value).slice(0, 11))}
                    className={authGateInputClass}
                    placeholder="07xxxxxxxx"
                    maxLength={11}
                    data-testid="lawyer-register-phone"
                />
            </label>
            <label className={authGateLabelClass}>
                <span className={authGateLabelTextClass}>الاسم الثلاثي</span>
                <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => onFullName(e.target.value)}
                    className={authGateInputClass}
                    data-testid="lawyer-register-fullname-name"
                />
                <p className={authGateHintClass} data-testid="lawyer-register-fullname-note">
                    {DISPLAY_NAME_REGISTER_NOTE}
                </p>
            </label>
            <label className={authGateLabelClass}>
                <span className={authGateLabelTextClass}>اللقب</span>
                <input
                    type="text"
                    required
                    value={familyName}
                    onChange={(e) => onFamilyName(e.target.value)}
                    className={authGateInputClass}
                    data-testid="lawyer-register-family-name"
                />
            </label>
            <label className={authGateLabelClass}>
                <span className={authGateLabelTextClass}>المحافظة</span>
                <select
                    required
                    value={governorate}
                    onChange={(e) => onGovernorate(e.target.value)}
                    className={authGateInputClass}
                    data-testid="lawyer-register-governorate"
                >
                    <option value="">اختر المحافظة</option>
                    {IRAQ_REGISTRATION_GOVERNORATES.map((g) => (
                        <option key={g} value={g}>
                            {g}
                        </option>
                    ))}
                </select>
            </label>
            <label className={authGateLabelClass}>
                <span className={authGateLabelTextClass}>غرفة المحامين</span>
                <input
                    type="text"
                    required
                    value={lawyerBarRoom}
                    onChange={(e) => onLawyerBarRoom(e.target.value)}
                    className={authGateInputClass}
                    placeholder="مثال: غرفة محاميي بغداد"
                    data-testid="lawyer-register-bar-room"
                    autoComplete="organization"
                />
            </label>
            {error ? (
                <p className={authGateErrorClass} role="alert" data-testid="lawyer-register-error">
                    {error}
                </p>
            ) : null}
            <button
                type="submit"
                className={authGatePrimaryBtnClass}
                data-testid="lawyer-register-profile-next"
            >
                متابعة
            </button>
            <button
                type="button"
                className={authGateGhostBtnClass}
                onClick={onBack}
                disabled={loading}
            >
                رجوع
            </button>
        </form>
    );
}
