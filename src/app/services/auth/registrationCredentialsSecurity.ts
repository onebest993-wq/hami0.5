/**
 * تحصين حقول تسجيل المحامي — بريد مزوّد معروف، كلمة مرور إنجليزية، هاتف عراقي حقيقي.
 * تُرفض الحقن، البريد المؤقت، والأرقام الوهمية قبل أي إرسال للخادم.
 */

import {
    IRAQ_REGISTRATION_GOVERNORATES,
    validateArabicTripleName,
    validateFamilyName,
} from '@/app/services/auth/iraqiLawyerRegistrationCatalog';

/** مزوّدو بريد معروفون عالمياً — قائمة سماح (لا مؤقت) */
export const TRUSTED_EMAIL_PROVIDERS = [
    'gmail.com',
    'googlemail.com',
    'yahoo.com',
    'yahoo.co.uk',
    'ymail.com',
    'outlook.com',
    'hotmail.com',
    'live.com',
    'msn.com',
    'icloud.com',
    'me.com',
    'mac.com',
    'proton.me',
    'protonmail.com',
    'aol.com',
    'gmx.com',
    'gmx.net',
    'mail.com',
    'zoho.com',
    'yandex.com',
    'yandex.ru',
] as const;

/** نطاقات بريد مؤقت شائعة — رفض صريح حتى لو تغيّرت القائمة المسموحة */
const DISPOSABLE_EMAIL_DOMAINS = new Set(
    [
        'mailinator.com',
        'guerrillamail.com',
        'guerrillamail.net',
        'tempmail.com',
        'temp-mail.org',
        '10minutemail.com',
        '10minemail.com',
        'throwawaymail.com',
        'yopmail.com',
        'sharklasers.com',
        'trashmail.com',
        'getnada.com',
        'maildrop.cc',
        'dispostable.com',
        'fakeinbox.com',
        'mailnesia.com',
        'moakt.com',
        'tempail.com',
        'emailondeck.com',
        'mintemail.com',
        'mytemp.email',
        'tmpmail.org',
        'tmpmail.net',
        'discard.email',
        'mailcatch.com',
        'inboxkitten.com',
    ].map((d) => d.toLowerCase()),
);

const CONTROL_OR_INJECTION = /[\u0000-\u001F\u007F<>`"\\]|[\u200B-\u200D\uFEFF]/;
const HTML_TAG_HINT = /<\/?[a-z][\s\S]*>/i;
/** بريد ASCII صارم — بلا يونيكود خادع */
const STRICT_EMAIL_LOCAL = /^[a-z0-9](?:[a-z0-9._%+-]{0,62}[a-z0-9])?$/i;
const STRICT_EMAIL_DOMAIN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

/** كلمة مرور: إنجليزي قابل للطباعة فقط — بلا اقتباس/backslash لتضييق حقن السلاسل */
const ENGLISH_PASSWORD_CHARS = /^[A-Za-z0-9!@#$%^&*()_+\-=[\]{};:,.<>/?`~|]+$/;

const WEAK_PASSWORDS = new Set(
    [
        'password',
        'password1',
        'password12',
        'password123',
        '12345678',
        '123456789',
        'qwerty123',
        'qwertyui',
        'abcdefgh',
        'abcdefg1',
        'iloveyou',
        'welcome1',
        'admin123',
        'letmein1',
        'monkey12',
        'dragon12',
        'hami1234',
        'lawyer12',
        'iraq2024',
        'iraq2025',
        'iraq2026',
    ].map((p) => p.toLowerCase()),
);

export type RegistrationCredentialsInput = {
    email: string;
    password: string;
    confirmPassword?: string;
    phone: string;
    fullName: string;
    familyName: string;
    governorate: string;
    lawyerBarRoom: string;
};

function hasInjectionPayload(value: string): boolean {
    if (CONTROL_OR_INJECTION.test(value)) return true;
    if (HTML_TAG_HINT.test(value)) return true;
    if (/%3c|%3e|javascript:|data:text\/html/i.test(value)) return true;
    return false;
}

export function normalizeRegistrationEmail(raw: string): string {
    return raw.trim().toLowerCase().replace(/\s+/g, '');
}

export function normalizeIraqiPhoneInput(raw: string): string {
    let digits = raw.replace(/[^\d+]/g, '');
    if (digits.startsWith('+964')) digits = `0${digits.slice(4)}`;
    else if (digits.startsWith('964') && digits.length >= 12) digits = `0${digits.slice(3)}`;
    else if (digits.startsWith('00964')) digits = `0${digits.slice(5)}`;
    return digits.replace(/\D/g, '');
}

function isRepeatingDigits(phone: string): boolean {
    const core = phone.slice(3); // بعد 07X
    if (!core || core.length < 8) return true;
    if (/^(\d)\1{7}$/.test(core)) return true; // 00000000 / 11111111
    if (/^(\d{2})\1{3}$/.test(core)) return true; // 12121212
    if (/^(01234567|12345678|23456789|87654321|98765432)$/.test(core)) return true;
    return false;
}

export function isTrustedEmailProviderDomain(domain: string): boolean {
    return (TRUSTED_EMAIL_PROVIDERS as readonly string[]).includes(domain.trim().toLowerCase());
}

/** صيغة + رفض مؤقت — لاستعادة كلمة المرور دون قائمة المزوّدين (الحساب قد يكون قديماً). */
export function validateRecoveryEmailShape(emailRaw: string): string | null {
    if (hasInjectionPayload(emailRaw)) {
        return 'البريد الإلكتروني يحتوي رموزاً غير مسموحة';
    }
    const email = normalizeRegistrationEmail(emailRaw);
    if (!email || email.length > 254) return 'أدخل بريداً إلكترونياً صالحاً';
    if (email.includes('..') || email.startsWith('.') || email.endsWith('.')) {
        return 'صيغة البريد الإلكتروني غير صالحة';
    }
    const at = email.lastIndexOf('@');
    if (at <= 0 || at !== email.indexOf('@')) return 'أدخل بريداً إلكترونياً صالحاً';
    const local = email.slice(0, at);
    const domain = email.slice(at + 1);
    if (!STRICT_EMAIL_LOCAL.test(local) || local.length > 64) {
        return 'جزء البريد قبل @ غير صالح — استخدم أحرفاً إنجليزية وأرقاماً فقط';
    }
    if (!STRICT_EMAIL_DOMAIN.test(domain)) {
        return 'نطاق البريد غير صالح';
    }
    if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
        return 'البريد المؤقت مرفوض — استخدم حساباً حقيقياً مسجّلاً';
    }
    return null;
}

export function validateTrustedRegistrationEmail(emailRaw: string): string | null {
    const shape = validateRecoveryEmailShape(emailRaw);
    if (shape) return shape;
    const email = normalizeRegistrationEmail(emailRaw);
    const domain = email.slice(email.lastIndexOf('@') + 1);
    if (!isTrustedEmailProviderDomain(domain)) {
        return 'يُقبل فقط بريد من مزوّدين معروفين (مثل Gmail و Yahoo و Outlook و iCloud و Proton)';
    }
    return null;
}

export function validateRegistrationPasswordSecure(password: string): string | null {
    if (hasInjectionPayload(password)) {
        return 'كلمة المرور تحتوي رموزاً غير مسموحة';
    }
    if (password.length < 8) return 'كلمة المرور يجب أن تكون 8 أحرف إنجليزية على الأقل';
    if (password.length > 128) return 'كلمة المرور طويلة جداً';
    if (!ENGLISH_PASSWORD_CHARS.test(password)) {
        return 'كلمة المرور بالإنجليزية فقط (أحرف A–Z وأرقام ورموز)، بلا أحرف عربية';
    }
    if (!/[A-Za-z]/.test(password)) return 'أضف حرفاً إنجليزياً واحداً على الأقل';
    if (!/[0-9]/.test(password)) return 'أضف رقماً واحداً على الأقل';
    if (WEAK_PASSWORDS.has(password.toLowerCase())) {
        return 'كلمة المرور ضعيفة جداً — اختر عبارة أقوى وغير شائعة';
    }
    // تكرار ممل: aaaaaaaa / 11111111
    if (/^(.)\1{7,}$/.test(password)) return 'كلمة المرور ضعيفة — تجنّب التكرار';
    return null;
}

export function validateIraqiLawyerPhoneSecure(phoneRaw: string): string | null {
    if (hasInjectionPayload(phoneRaw)) {
        return 'رقم الهاتف يحتوي رموزاً غير مسموحة';
    }
    const phone = normalizeIraqiPhoneInput(phoneRaw);
    if (!/^07[5789]\d{8}$/.test(phone)) {
        return 'رقم عراقي معتمد فقط بصيغة 07xxxxxxxx (آسيا سيل / زين / كورك)';
    }
    if (isRepeatingDigits(phone)) {
        return 'رقم الهاتف يبدو وهمياً أو غير صالح — أدخل رقمك الحقيقي';
    }
    // أرقام محجوزة/اختبار شائعة
    const banned = new Set([
        '07700000000',
        '07800000000',
        '07900000000',
        '07500000000',
        '07711111111',
        '07811111111',
        '07911111111',
        '07511111111',
        '07712345678',
        '07812345678',
        '07912345678',
        '07512345678',
    ]);
    if (banned.has(phone)) {
        return 'رقم الهاتف غير مقبول — استخدم رقماً حقيقياً خاصاً بك';
    }
    return null;
}

function validateFreeTextField(label: string, value: string, opts: { min: number; max: number }): string | null {
    if (hasInjectionPayload(value)) return `${label}: رموز غير مسموحة`;
    const t = value.trim();
    if (t.length < opts.min) return `أدخل ${label}`;
    if (t.length > opts.max) return `${label} طويل جداً`;
    return null;
}

export function validateLawyerSignupAccountOnly(input: {
    email: string;
    password: string;
    confirmPassword?: string;
}): string | null {
    const emailErr = validateTrustedRegistrationEmail(input.email);
    if (emailErr) return emailErr;

    const pwErr = validateRegistrationPasswordSecure(input.password);
    if (pwErr) return pwErr;

    if (input.confirmPassword !== undefined && input.password !== input.confirmPassword) {
        return 'تأكيد كلمة المرور غير متطابق';
    }
    return null;
}

export function validateLawyerProfileDetails(input: {
    phone: string;
    fullName: string;
    familyName: string;
    governorate: string;
    lawyerBarRoom: string;
}): string | null {
    const phoneErr = validateIraqiLawyerPhoneSecure(input.phone);
    if (phoneErr) return phoneErr;

    if (hasInjectionPayload(input.fullName) || !validateArabicTripleName(input.fullName)) {
        return 'الاسم الثلاثي بالعربية فقط (ثلاثة أجزاء على الأقل)، بلا رموز';
    }
    if (hasInjectionPayload(input.familyName) || !validateFamilyName(input.familyName)) {
        return 'أدخل اللقب بالعربية فقط، بلا رموز';
    }

    const gov = input.governorate.trim();
    if (!(IRAQ_REGISTRATION_GOVERNORATES as readonly string[]).includes(gov)) {
        return 'اختر محافظة عراقية من القائمة';
    }

    const barErr = validateFreeTextField('غرفة المحامين', input.lawyerBarRoom, {
        min: 3,
        max: 80,
    });
    if (barErr) return barErr;
    if (!/^[\u0600-\u06FFa-zA-Z0-9\s\-_/().]+$/.test(input.lawyerBarRoom.trim())) {
        return 'غرفة المحامين: أحرف عربية/إنجليزية وأرقام فقط';
    }
    return null;
}

export function validateLawyerRegistrationCredentials(
    input: RegistrationCredentialsInput,
): string | null {
    const accountErr = validateLawyerSignupAccountOnly(input);
    if (accountErr) return accountErr;
    return validateLawyerProfileDetails(input);
}

export function sanitizeRegistrationCredentialsForSubmit(input: RegistrationCredentialsInput): {
    email: string;
    password: string;
    phone: string;
    fullName: string;
    familyName: string;
    governorate: string;
    lawyerBarRoom: string;
} {
    return {
        email: normalizeRegistrationEmail(input.email),
        password: input.password,
        phone: normalizeIraqiPhoneInput(input.phone),
        fullName: input.fullName.trim().replace(/\s+/g, ' '),
        familyName: input.familyName.trim().replace(/\s+/g, ' '),
        governorate: input.governorate.trim(),
        lawyerBarRoom: input.lawyerBarRoom.trim().replace(/\s+/g, ' '),
    };
}
