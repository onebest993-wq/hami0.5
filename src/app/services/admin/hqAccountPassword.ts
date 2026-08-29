import { validateRegistrationPasswordSecure } from '@/app/services/auth/registrationCredentialsSecurity';

/** حد bcrypt في GoTrue — أطول من 72 بايت يُقطع بصمت */
export const HEADQUARTERS_PASSWORD_MAX = 72;

export function validateHeadquartersAccountPassword(password: unknown): string | null {
    if (typeof password !== 'string') return 'كلمة المرور مطلوبة';
    if (password.length > HEADQUARTERS_PASSWORD_MAX) return 'كلمة المرور طويلة جداً';
    return validateRegistrationPasswordSecure(password);
}
