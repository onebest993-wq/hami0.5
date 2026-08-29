/**
 * حيلة مقر القيادة: الرقم في الرسالة ليس ما يُكتب في الحقل.
 *
 * القاعدة (كما طلب المالك): كل رقم في الرسالة +1، والتسعة تبقى تسعة.
 * مثال: الرسالة 123459 ← الحقل 234569.
 *
 * لا تُذكر القاعدة في البريد ولا في الواجهة. لا تُسجَّل الأرقام.
 *
 * الرمز السرّي المخزَّن (hash) = ما يُكتب في الحقل (confirm).
 * البريد يعرض الشكل المعكوس (mailbox) حتى لا يكفي نسخ الرسالة.
 *
 * توليد الرمز الداخلي يستخدم الأرقام 1–9 فقط حتى يكون التحويل عكسياً بلا لبس
 * (الصفر لا يظهر في الحقل؛ الثمانية لا تظهر في الرسالة).
 */

const HQ_OTP_LEN = 6;

export function isHqOtpDigitString(value: string): boolean {
    return new RegExp(`^\\d{${HQ_OTP_LEN}}$`).test(value);
}

/** الرسالة → ما يُكتب في الحقل (+1، والتسعة تبقى). */
export function confirmCodeFromMailboxDigits(mailbox: string): string {
    if (!isHqOtpDigitString(mailbox)) {
        throw new Error('HQ_OTP_SHIFT_FORMAT');
    }
    let out = '';
    for (const ch of mailbox) {
        out += ch === '9' ? '9' : String(Number(ch) + 1);
    }
    return out;
}

/** ما يُكتب في الحقل → ما يظهر في الرسالة (عكس القاعدة). */
export function mailboxDigitsFromConfirmCode(confirm: string): string {
    if (!isHqOtpDigitString(confirm)) {
        throw new Error('HQ_OTP_SHIFT_FORMAT');
    }
    let out = '';
    for (const ch of confirm) {
        if (ch === '0') {
            throw new Error('HQ_OTP_SHIFT_ZERO');
        }
        out += ch === '9' ? '9' : String(Number(ch) - 1);
    }
    return out;
}
