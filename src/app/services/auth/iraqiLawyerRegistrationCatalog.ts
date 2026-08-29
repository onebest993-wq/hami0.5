/** كتالوج تسجيل المحامي — محافظات وغرف نقابة */

export const IRAQI_PHONE_REGEX = /^07[5789]\d{8}$/;

export const IRAQ_REGISTRATION_GOVERNORATES = [
    'بغداد',
    'البصرة',
    'نينوى',
    'أربيل',
    'السليمانية',
    'دهوك',
    'كركوك',
    'صلاح الدين',
    'ديالى',
    'الأنبار',
    'بابل',
    'كربلاء المقدسة',
    'النجف الأشرف',
    'القادسية',
    'المثنى',
    'ذي قار',
    'ميسان',
    'واسط',
    'حلبجة',
] as const;

/** غرف / فروع نقابة المحامين — مرتبطة جغرافياً */
export const IRAQI_LAWYER_BAR_ROOMS = [
    { id: 'baghdad-central', label: 'نقابة المحامين — بغداد (المركز)' },
    { id: 'basra', label: 'غرفة محاميي البصرة' },
    { id: 'nineveh', label: 'غرفة محاميي نينوى' },
    { id: 'erbil', label: 'غرفة محاميي أربيل' },
    { id: 'sulaymaniyah', label: 'غرفة محاميي السليمانية' },
    { id: 'duhok', label: 'غرفة محاميي دهوك' },
    { id: 'kirkuk', label: 'غرفة محاميي كركوك' },
    { id: 'salahuddin', label: 'غرفة محاميي صلاح الدين' },
    { id: 'diyala', label: 'غرفة محاميي ديالى' },
    { id: 'anbar', label: 'غرفة محاميي الأنبار' },
    { id: 'babil', label: 'غرفة محاميي بابل' },
    { id: 'karbala', label: 'غرفة محاميي كربلاء' },
    { id: 'najaf', label: 'غرفة محاميي النجف' },
    { id: 'qadisiyyah', label: 'غرفة محاميي القادسية' },
    { id: 'muthanna', label: 'غرفة محاميي المثنى' },
    { id: 'dhi-qar', label: 'غرفة محاميي ذي قار' },
    { id: 'maysan', label: 'غرفة محاميي ميسان' },
    { id: 'wasit', label: 'غرفة محاميي واسط' },
    { id: 'halabja', label: 'غرفة محاميي حلبجة' },
    { id: 'other', label: 'أخرى / قيد التحديث' },
] as const;

export type LawyerBarRoomId = (typeof IRAQI_LAWYER_BAR_ROOMS)[number]['id'];

const ARABIC_NAME_REGEX = /^[\u0600-\u06FF\s]+$/;

export function validateIraqiLawyerPhone(phone: string): boolean {
    return IRAQI_PHONE_REGEX.test(phone.trim());
}

export function validateArabicTripleName(fullName: string): boolean {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    return parts.length >= 3 && ARABIC_NAME_REGEX.test(fullName.trim());
}

export function validateFamilyName(familyName: string): boolean {
    const t = familyName.trim();
    return t.length >= 2 && ARABIC_NAME_REGEX.test(t);
}

export function validateRegistrationPassword(password: string): string | null {
    if (password.length < 8) return 'كلمة المرور يجب أن تكون 8 أحرف إنجليزية على الأقل';
    if (password.length > 128) return 'كلمة المرور طويلة جداً';
    if (!/^[A-Za-z0-9!@#$%^&*()_+\-=[\]{};':",.<>/?`~|\\]+$/.test(password)) {
        return 'كلمة المرور بالإنجليزية فقط (أحرف A–Z وأرقام ورموز)، بلا أحرف عربية';
    }
    if (!/[A-Za-z]/.test(password)) return 'أضف حرفاً إنجليزياً واحداً على الأقل';
    if (!/[0-9]/.test(password)) return 'أضف رقماً واحداً على الأقل إلى كلمة المرور';
    return null;
}
