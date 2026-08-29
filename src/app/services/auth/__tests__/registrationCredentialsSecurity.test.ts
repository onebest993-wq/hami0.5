import { describe, expect, it } from 'vitest';
import {
    normalizeIraqiPhoneInput,
    validateIraqiLawyerPhoneSecure,
    validateLawyerRegistrationCredentials,
    validateRegistrationPasswordSecure,
    validateTrustedRegistrationEmail,
    validateRecoveryEmailShape,
    sanitizeRegistrationCredentialsForSubmit,
} from '@/app/services/auth/registrationCredentialsSecurity';

const base = {
    email: 'lawyer@gmail.com',
    password: 'SecureLaw9',
    confirmPassword: 'SecureLaw9',
    phone: '07719876543',
    fullName: 'علي محمد حسن',
    familyName: 'العلي',
    governorate: 'بغداد',
    lawyerBarRoom: 'غرفة محاميي بغداد',
};

describe('registrationCredentialsSecurity', () => {
    it('يقبل بريد مزوّدين معروفين ويرفض المؤقت والمجهول', () => {
        expect(validateTrustedRegistrationEmail('user@gmail.com')).toBeNull();
        expect(validateTrustedRegistrationEmail('user@yahoo.com')).toBeNull();
        expect(validateTrustedRegistrationEmail('user@outlook.com')).toBeNull();
        expect(validateTrustedRegistrationEmail('user@mailinator.com')).toMatch(/مؤقت/);
        expect(validateRecoveryEmailShape('user@mailinator.com')).toMatch(/مؤقت/);
        expect(validateRecoveryEmailShape('user@gmail.com')).toBeNull();
        expect(validateRecoveryEmailShape('user@random-isp.xyz')).toBeNull();
        expect(validateTrustedRegistrationEmail('user@random-isp.xyz')).toMatch(/معروفين/);
        expect(validateTrustedRegistrationEmail('user<script>@gmail.com')).toMatch(/غير مسموحة/);
        expect(validateTrustedRegistrationEmail('user@gmail.com\n')).toMatch(/غير مسموحة|صالح/);
    });

    it('يفرض كلمة مرور إنجليزية بطول 8 مع حرف ورقم', () => {
        expect(validateRegistrationPasswordSecure('short')).not.toBeNull();
        expect(validateRegistrationPasswordSecure('كلمةسر123')).toMatch(/الإنجليزية/);
        expect(validateRegistrationPasswordSecure('password1')).toMatch(/ضعيفة/);
        expect(validateRegistrationPasswordSecure('12345678')).toMatch(/حرفاً/);
        expect(validateRegistrationPasswordSecure('abcdefgh')).toMatch(/رقماً/);
        expect(validateRegistrationPasswordSecure('SecureLaw9')).toBeNull();
    });

    it('يقبل هاتفاً عراقياً حقيقياً ويرفض الوهمي', () => {
        expect(normalizeIraqiPhoneInput('+9647719876543')).toBe('07719876543');
        expect(validateIraqiLawyerPhoneSecure('07719876543')).toBeNull();
        expect(validateIraqiLawyerPhoneSecure('0512345678')).not.toBeNull();
        expect(validateIraqiLawyerPhoneSecure('07700000000')).toMatch(/وهمي|غير مقبول/);
        expect(validateIraqiLawyerPhoneSecure('07711111111')).not.toBeNull();
        expect(validateIraqiLawyerPhoneSecure('07712345678')).not.toBeNull();
    });

    it('يرفض الحزمة عند ثغرة حقن أو حقل ناقص', () => {
        expect(validateLawyerRegistrationCredentials(base)).toBeNull();
        expect(
            validateLawyerRegistrationCredentials({
                ...base,
                email: 'a@tempmail.com',
            }),
        ).not.toBeNull();
        expect(
            validateLawyerRegistrationCredentials({
                ...base,
                fullName: '<script>alert(1)</script>',
            }),
        ).not.toBeNull();
        expect(
            validateLawyerRegistrationCredentials({
                ...base,
                lawyerBarRoom: 'ab',
            }),
        ).not.toBeNull();
    });

    it('ينظّف البريد والهاتف والمسافات قبل الإرسال', () => {
        const sanitized = sanitizeRegistrationCredentialsForSubmit({
            ...base,
            email: ' Lawyer@Gmail.com ',
            phone: '+9647719876543',
            fullName: 'علي   محمد  حسن',
            familyName: ' العلي ',
            lawyerBarRoom: 'غرفة   محاميي بغداد',
        });
        expect(sanitized.email).toBe('lawyer@gmail.com');
        expect(sanitized.phone).toBe('07719876543');
        expect(sanitized.fullName).toBe('علي محمد حسن');
        expect(sanitized.familyName).toBe('العلي');
        expect(sanitized.lawyerBarRoom).toBe('غرفة محاميي بغداد');
        expect(sanitized.password).toBe(base.password);
        expect(sanitized.governorate).toBe('بغداد');
    });
});
