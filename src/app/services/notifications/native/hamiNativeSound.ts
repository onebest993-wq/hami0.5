/** اسم مورد res/raw بدون امتداد — قنوات Android و FCM */
export const HAMI_ARRIVAL_SOUND_RAW = 'hami_arrival';

/**
 * اسم الملف مع الامتداد — حقل `sound` في LocalNotifications.
 * Capacitor على Android 8+ يشيل الامتداد عند ربط القناة بـ res/raw.
 */
export const HAMI_ARRIVAL_SOUND_FILE = 'hami_arrival.wav';

/** مسار الويب للنفس النغمة (تشغيل داخل التطبيق) */
export const HAMI_ARRIVAL_SOUND_WEB = '/sounds/hami_arrival.wav';

/** منبّه المواعيد — أطول من نغمة الوصول، ملف حقيقي في res/raw و public/sounds */
export const HAMI_LEGAL_ALARM_SOUND_RAW = 'hami_legal_alarm';
export const HAMI_LEGAL_ALARM_SOUND_FILE = 'hami_legal_alarm.wav';
export const HAMI_LEGAL_ALARM_SOUND_WEB = '/sounds/hami_legal_alarm.wav';
