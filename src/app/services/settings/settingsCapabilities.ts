/**
 * مرجع صادق: ما الذي يفعله كل إعداد فعلياً في التطبيق.
 * يُستخدم للتلميحات في الواجهة فقط — لا يعرض خيارات غير مربوطة.
 */
export type SettingWiring = 'full' | 'limited';

const WIRING_HINTS: Record<string, string | undefined> = {
    'appearance.backgroundPreset': 'زخرفة خفيفة خلف لوحة المحامي — لا تُظهر فوق صورة مرفوعة',
    'appearance.theme': 'لون خلفية اللوحة ولون الزخرفة',
    'appearance.backgroundPatternOpacity': 'حدة ووضوح الزخرفة — ارفعها للنمط أو خفّضها للنعومة (حتى 78%)',
    'appearance.shape': 'زوايا بطاقات الدعاوى ومركز القيادة والنوافذ',
    'appearance.wallpaper': 'صورة خلفية للوحة المحامي — تُحفظ على هذا الجهاز',
    'appearance.fontSize': 'حجم النص في لوحة المحامي الرئيسية',
    'appearance.language': 'لغة واجهة التطبيق واتجاه النص',
    'appearance.glassOpacity': 'شفافية بطاقات لوحة القيادة — اخفضها للزجاج الشفاف، ارفعها لمنع اختراق الخلفية',
    'appearance.homeContainerBorder': 'إطار ثابت حول بطاقات لوحة القيادة — مفيد عند الشفافية المنخفضة لتمييز أبعاد الحاوية',
    'appearance.highContrast': 'زيادة وضوح النصوص والحدود',
    'appearance.reduceMotion': 'يقلّل الحركات والانتقالات في التطبيق',
    'performance.enableAnimations': 'إيقافه يُبطئ الانتقالات مع «تقليل الحركة»',
    'performance.prefetchScreens': 'يفتح الشاشات الثقيلة في الخلفية لتسريع الانتقال',
    'security.privacyBlur': 'ضبابية الشاشة عند تبديل التطبيق أو تصغير النافذة',
    'security.biometricLock': 'بصمة أو Face ID — يُطلب عند العودة للتطبيق',
    'security.autoLockMinutes': 'قفل التطبيق تلقائياً بعد فترة الخمول',
    'security.screenshotDeterrent': 'طبقة حماية إضافية عند محاولة التقاط الشاشة',
    'security.localOnlyMode': 'يقطع الاتصال بالإنترنت والسحابة — كل البيانات والعمل محلياً على هذا الجهاز',
    'data.autoSave': 'يحفظ الإعدادات والملفات والملاحظات محلياً كل ثانيتين',
    'data.cloudSync': 'تفعيل المزامنة السحابية — يتطلب تسجيل الدخول',
    'data.syncNotes': 'مزامنة الملاحظات مع السحابة',
    'data.syncFiles': 'مزامنة ملفات القضايا مع السحابة',
    'data.syncExecution': 'مزامنة ملفات التنفيذ مع السحابة',
    'data.weeklyBackupReminder': 'تنبيه داخل التطبيق مرة كل أسبوع عند فتح لوحة المحامي',
    'data.businessBackup': 'تصدير واستيراد القضايا والتنفيذ والملاحظات كملف JSON',
    'data.clearLocal': 'مسح شامل للبيانات المحلية والسحابية — يتطلب تأكيدين مع انتظار 10 ثوانٍ',
    'data.resetSettings': 'يعيد تفضيلات المنظر والأمان فقط — لا يمس ملفات القضايا',
};

export function settingWiringHint(key: string): string | undefined {
    return WIRING_HINTS[key];
}
