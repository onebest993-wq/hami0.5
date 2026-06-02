/**
 * مرجع صادق: ما الذي يفعله كل إعداد فعلياً في التطبيق.
 * يُستخدم للتلميحات في الواجهة فقط — لا يعرض خيارات غير مربوطة.
 */
export type SettingWiring = 'full' | 'limited';

const WIRING_HINTS: Record<string, string | undefined> = {
    'appearance.theme': 'يغيّر لون التمييز وخلفية لوحة المحامي فوراً',
    'appearance.shape': 'حواف المفكرة، المحور، الأرشيف، ونوافذ الملف',
    'appearance.themeMode': 'ليلي/نهاري/تلقائي — خلفية اللوحة؛ الإعدادات تبقى داكنة',
    'appearance.fontSize': 'حجم النص في لوحة المحامي الرئيسية',
    'appearance.glassOpacity': 'شفافية بطاقات المحور والزجاج المشترك',
    'appearance.wallpaper': 'صورة خلفية على الجهاز — تظهر خلف اللوحة',
    'appearance.highContrast': 'زيادة تباين عام على الواجهة',
    'appearance.reduceMotion': 'يقلّل الحركات والانتقالات في التطبيق',
    'appearance.language': undefined,
    'security.screenshotDeterrent': 'يمنع القائمة اليمنى فقط — ليس حماية نظامية من اللقطات',
};

export function settingWiringHint(key: string): string | undefined {
    return WIRING_HINTS[key];
}
