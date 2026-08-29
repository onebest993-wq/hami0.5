import { describe, expect, it } from 'vitest';
import {
    humanizeAuthError,
    isDuplicateSignupErrorMessage,
} from '@/app/services/auth/humanizeAuthError';

describe('humanizeAuthError', () => {
    it('detects duplicate signup English and Arabic', () => {
        expect(isDuplicateSignupErrorMessage('User already registered')).toBe(true);
        expect(isDuplicateSignupErrorMessage('هذا البريد مسجّل مسبقاً')).toBe(true);
        expect(isDuplicateSignupErrorMessage('EMAIL_ALREADY_REGISTERED')).toBe(false);
    });

    it('returns Arabic guidance for duplicate signup', () => {
        const msg = humanizeAuthError(new Error('User already registered'));
        expect(msg).toMatch(/مسجّل مسبقاً/);
        expect(msg).toMatch(/سجّل الدخول/);
    });

    it('does not use login wording for register invalid-credentials', () => {
        const msg = humanizeAuthError(new Error('Invalid login credentials'), 'فشل', 'register');
        expect(msg).not.toMatch(/البريد أو كلمة المرور غير صحيحة/);
        expect(msg).toMatch(/إنشاء الحساب|تأكيد البريد|سجّل الدخول يدوياً/);
    });

    it('maps banned/unavailable and auth outage without leaking internals', () => {
        expect(humanizeAuthError(new Error('Account unavailable'), 'فشل', 'login')).toMatch(/قُفل الدخول/);
        expect(humanizeAuthError(new Error('Auth service unavailable'), 'فشل', 'login')).toMatch(
            /غير متاحة/,
        );
        expect(humanizeAuthError(new Error('User not allowed from this IP'), 'فشل الدخول', 'login')).toBe(
            'فشل الدخول',
        );
        expect(humanizeAuthError(new Error('Signup failed'), 'فشل إنشاء الحساب', 'register')).toBe(
            'فشل إنشاء الحساب',
        );
        expect(
            humanizeAuthError(new Error('email rate limit exceeded'), 'فشل إنشاء الحساب', 'register'),
        ).toMatch(/حد رسائل/);
        expect(humanizeAuthError(new Error('TERMS_REQUIRED'), 'فشل', 'login')).toMatch(/الشروط والأحكام/);
        expect(humanizeAuthError(new Error('Email not confirmed'), 'فشل', 'register')).toMatch(
            /الإدارة/,
        );
        expect(humanizeAuthError(new Error('Email not confirmed'), 'فشل', 'register')).not.toMatch(
            /سجّل الدخول لإكمال الطلب/,
        );
    });

    it('maps browser network failures to a server-down message', () => {
        expect(humanizeAuthError(new Error('Failed to fetch'), 'فشل تسجيل الدخول', 'login')).toMatch(
            /npm run dev/,
        );
        expect(humanizeAuthError(new TypeError('NetworkError when attempting to fetch resource.'), 'فشل', 'login')).toMatch(
            /الاتصال بالخادم/,
        );
    });
});
