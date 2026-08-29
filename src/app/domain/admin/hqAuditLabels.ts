import { stripHqControlChars } from '@/app/domain/admin/hqSafeText';

const ACTION_LABELS: Record<string, string> = {
    'consultation.delete': 'حذف منشور',
    'consultation.pin': 'تثبيت منشور',
    'consultation.unpin': 'إلغاء تثبيت',
    'consultation.lock': 'قفل نقاش',
    'consultation.unlock': 'فتح نقاش',
    'forum.ban': 'حظر منتدى',
    'forum.unban': 'رفع حظر منتدى',
    'forum.report_dismiss': 'تجاهل بلاغ',
    'forum.report_delete_post': 'حذف منشور من بلاغ',
    'forum.comment_report_dismiss': 'تجاهل بلاغ تعليق',
    'forum.comment_report_delete': 'حذف تعليق مبلغ',
    'verification.decide': 'قرار توثيق',
    'device.revoke': 'سحب ثقة جهاز',
    'user.set_password': 'تعيين كلمة مرور',
    'user.freeze': 'تجميد حساب',
    'user.freeze_timed': 'تجميد مؤقت',
    'user.unfreeze': 'إلغاء تجميد',
    'user.revoke_sessions': 'إنهاء جلسات',
    'user.role': 'تغيير دور',
    'user.soft_delete': 'حذف من الدليل',
    'user.restore': 'استعادة حساب',
    'user.lock_login': 'قفل دخول',
    'user.unlock_login': 'فتح دخول',
    'laws.clear': 'مسح مواد قانون',
    'laws.add': 'إضافة مادة',
    'laws.import': 'استيراد مواد',
    'otp.device_trusted': 'توثيق جهاز مقر',
    'notify.system_all': 'إشعار نظام للكل',
    'notify.system_users': 'إشعار نظام لمحددين',
    'user.display_name_correct': 'تصحيح الاسم الثلاثي',
};

const FACT_KEYS: Record<string, string> = {
    from: 'من',
    to: 'إلى',
    reason: 'سبب',
    hours: 'ساعات',
    durationHours: 'ساعات',
    liveName: 'الاسم الحي',
    kycName: 'طلب التوثيق',
    shown: 'ظاهرة',
    status: 'حالة',
};

export function hqAuditActionLabel(action: string): string {
    const raw = String(action ?? '').replace(/^hq:/, '').trim();
    return ACTION_LABELS[raw] ?? raw;
}

export function hqAuditFactsCaption(raw: unknown): string {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return '';
    const rec = raw as Record<string, unknown>;
    const from = stripHqControlChars(rec.from, 80);
    const to = stripHqControlChars(rec.to, 80);
    if (from && to) {
        const kyc = stripHqControlChars(rec.kycName, 80);
        return kyc ? `من «${from}» إلى «${to}» · طلب التوثيق «${kyc}»` : `من «${from}» إلى «${to}»`;
    }
    const parts: string[] = [];
    for (const [key, value] of Object.entries(rec).slice(0, 6)) {
        if (key === 'targetId') continue;
        const label = FACT_KEYS[key] ?? key;
        if (typeof value === 'string') {
            const text = stripHqControlChars(value, 80);
            if (text) parts.push(`${label}: ${text}`);
        } else if (typeof value === 'number' || typeof value === 'boolean') {
            parts.push(`${label}: ${value}`);
        }
    }
    return parts.join(' · ');
}
