/**
 * مرجع صادق: ما الذي يفعله كل إعداد فعلياً في التطبيق.
 * يُستخدم للتلميحات في الواجهة فقط — لا يعرض خيارات غير مربوطة.
 */
export type SettingWiring = 'full' | 'limited';

const WIRING_HINTS: Record<string, string | undefined> = {
    'appearance.backgroundPreset': 'زخرفة خلفية خفيفة على بطاقات الواجهة',
    'appearance.theme': 'لون خلفية اللوحة ولون الزخرفة',
    'appearance.backgroundPatternOpacity': 'حدة ووضوح الزخرفة — ارفعها للنمط أو خفّضها للنعومة (حتى 78%)',
    'appearance.shape': 'زوايا بطاقات الدعاوى ومركز القيادة والنوافذ',
    'appearance.wallpaper': 'صورة خلفية للوحة المحامي من الجهاز — تُحفظ محلياً وتظهر حتى مع الأداء الخفيف',
    'appearance.fontSize': 'حجم النص في لوحة المحامي الرئيسية',
    'appearance.glassOpacity': 'شفافية بطاقات لوحة القيادة — اخفضها للزجاج الشفاف، ارفعها لمنع اختراق الخلفية',
    'appearance.homeContainerBorder': 'إطار ثابت حول بطاقات لوحة القيادة — مفيد عند الشفافية المنخفضة لتمييز أبعاد الحاوية',
    'appearance.highContrast': 'يزيد وضوح النص والحدود بلطف — دون إطارات سميكة مزعجة',
    'appearance.reduceMotion': 'يقلّل الحركات والانتقالات في التطبيق',
    'performance.enableAnimations': 'إيقافه يُبطئ الانتقالات مع «تقليل الحركة»',
    'performance.prefetchScreens': 'تحميل مسبق عند اللمس/القرب فقط — لا موجات خلفية تلقائية',
    'performance.litePerformance': 'يقلّل الضبابية والتحميل المسبق — يُفعَّل تلقائياً على الهواتف المتواضعة',
    'security.privacyBlur':
        'غطاء نافذة أصلي لشاشة المهام وFLAG_SECURE — مع تمويه داخل التطبيق عند الإخفاء',
    'security.localOnlyMode': 'يعطّل المزامنة السحابية ويحصر البيانات على الجهاز — مفيد للخصوصية أو العمل دون اتصال',
    'security.biometricLock': 'بصمة/Face ID أصلية في تطبيق Capacitor — WebAuthn على الويب',
    'security.autoLockMinutes': 'قفل التطبيق تلقائياً بعد فترة الخمول',
    'security.screenshotDeterrent':
        'يحدّ النسخ على الويب — FLAG_SECURE وإخفاء app-switcher على أندرويد/iOS',
    'data.autoSave': 'حفظ تلقائي للتعديلات على القضايا والملاحظات دون ضغط زر الحفظ',
    'data.cloudSync': 'مزامنة البيانات مع السحابة عند توفر الاتصال — يُعطَّل تلقائياً في الوضع المحلي فقط',
    'data.businessBackup':
        'ملف JSON مشفّر على الجهاز — تصدير واستيراد محلي، ليست مزامنة سحابية',
    'data.clearLocal':
        'مسح شامل للمحلي والسحابة — تأكيدان وتحقق وعدّاد 10 ثوانٍ',
    'data.resetSettings':
        'يعيد تفضيلات المنظر والأمان والبيانات والأداء وتخطيط المنزل — لا يمس ملفات القضايا',
};

export function settingWiringHint(key: string): string | undefined {
    return WIRING_HINTS[key];
}
