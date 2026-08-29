/**
 * رسائل مصادقة عربية — خاصة تكرار التسجيل.
 */

const DUPLICATE_PATTERNS = [
    /already\s+registered/i,
    /already\s+been\s+registered/i,
    /user\s+already\s+exists/i,
    /email.*exists/i,
    /duplicate/i,
    /identity.*exists/i,
    /المستخدم موجود/i,
    /مسج.?ل مسبقا/i,
];

type AuthErrorContext = 'login' | 'register' | 'generic';

export function isDuplicateSignupErrorMessage(message: string | null | undefined): boolean {
    const m = String(message ?? '').trim();
    if (!m) return false;
    return DUPLICATE_PATTERNS.some((re) => re.test(m));
}

export function humanizeAuthError(
    error: unknown,
    fallback = 'فشلت العملية',
    context: AuthErrorContext = 'generic',
): string {
    const raw =
        error instanceof Error
            ? error.message
            : typeof error === 'string'
              ? error
              : fallback;
    if (isDuplicateSignupErrorMessage(raw)) {
        return 'هذا البريد مسجّل مسبقاً — سجّل الدخول بدل إنشاء حساب جديد، أو استخدم «نسيت كلمة المرور».';
    }
    if (/invalid login credentials/i.test(raw) || /invalid.?credentials/i.test(raw)) {
        if (context === 'register') {
            return 'تم إنشاء الحساب لكن تعذّر فتح الجلسة تلقائياً — سجّل الدخول يدوياً، أو أكّد البريد إن طُلب ذلك.';
        }
        return 'البريد أو كلمة المرور غير صحيحة';
    }
    if (/TERMS_REQUIRED/i.test(raw) || /يلزم الموافقة على الشروط/.test(raw)) {
        return 'يلزم الموافقة على الشروط والأحكام الحالية قبل المتابعة';
    }
    if (/email not confirmed/i.test(raw)) {
        if (context === 'register') {
            return 'أُنشئ الحساب. تأكيد البريد آخر خطوة لإثبات الصندوق — اعتماد صفة المحامي حصراً من الإدارة.';
        }
        return 'يرجى تأكيد البريد الإلكتروني من الرسالة المرسلة إليك ثم أعد المحاولة';
    }
    if (/account unavailable/i.test(raw) || /ACCOUNT_LOCKED/.test(raw)) {
        return 'قُفل الدخول إلى هذا الحساب من مقر القيادة. الدعاوى والمعاملات لم تُحذف.';
    }
    if (/auth not configured/i.test(raw) || /auth service unavailable/i.test(raw)) {
        return 'خدمة الدخول غير متاحة حالياً — أعد المحاولة بعد قليل';
    }
    if (
        /failed to fetch/i.test(raw) ||
        /networkerror/i.test(raw) ||
        /load failed/i.test(raw) ||
        /network request failed/i.test(raw) ||
        /fetch failed/i.test(raw)
    ) {
        return 'تعذّر الاتصال بالخادم — تأكد أن npm run dev يعمل ثم أعد المحاولة';
    }
    if (/rate.?limit|too many|over_email_send_rate_limit|حد رسائل Auth/i.test(raw)) {
        return context === 'register'
            ? 'تعذّر إكمال التسجيل لأن حد رسائل Auth ممتلئ. انتظر نحو ساعة ثم أعد المحاولة مرة واحدة.'
            : 'محاولات كثيرة — انتظر قليلاً ثم أعد المحاولة';
    }
    if (/signup failed/i.test(raw)) {
        return context === 'register' ? fallback : 'تعذّر إنشاء الحساب';
    }
    if (/ID_FRONT_REQUIRED/i.test(raw) || /هوية النقابة/.test(raw)) {
        return raw.trim() || 'صورتا وجه وظهر هوية النقابة مطلوبتان';
    }
    if ((context === 'login' || context === 'register') && !/[\u0600-\u06FF]/.test(raw)) {
        return fallback;
    }
    return raw.trim() || fallback;
}

export const DUPLICATE_SIGNUP_CODE = 'EMAIL_ALREADY_REGISTERED';
