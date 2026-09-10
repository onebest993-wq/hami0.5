/**
 * المسارات الحرجة لبوّابة إنتاج التقويم — مصدر حقيقة واحد.
 *
 * كانت هذه القائمة داخل `calendar-production-gate.mjs`، ويحرسها اختبار يقرأ **نصّ**
 * السكربت ويطلب أن يحوي أسماء ملفات بعينها. والبوّابة تعمل بـglobs لا بأسماء، فلم
 * يكن أيٌّ من تلك الأسماء موجوداً في نصّها — فكان الاختبار يخفق على تغطيةٍ قائمة،
 * وتمرّ ادّعاءاته السلبية **بالصدفة**: تغيب أسماء القشور المحذوفة كما تغيب الحيّة.
 *
 * فصار البيان وحدةً تُستورَد: البوّابة تستهلكه، والاختبار **يحلّه ويفحص الناتج** —
 * فيسأل «هل يُقاس هذا الملف؟» بدل «هل اسمه مكتوب في السكربت؟».
 *
 * وهو النمط نفسه المتّبع في `execution-gate-manifest.mjs`.
 */

/** أنماط المسارات التي تقيسها بوّابة التقويم على القرص الحقيقي */
export const CALENDAR_CRITICAL_GLOBS = [
    'src/app/services/calendar/**/*.{ts,tsx}',
    'src/app/components/lawyer/SmartLegalRadar/**/*.{ts,tsx}',
    'src/app/hooks/lawyerDashboard/schedule/**/*.{ts,tsx}',
    'src/app/hooks/lawyerDashboard/*Schedule*.{ts,tsx}',
    'src/app/hooks/lawyerDashboard/*schedule*.{ts,tsx}',
    'src/app/hooks/*scheduleIntentWarm*.{ts,tsx}',
    'src/app/hooks/__tests__/*useLawyerDashboardSchedule*.test.ts',
    'src/app/services/schedule/**/*.{ts,tsx}',
    'src/app/runtime/schedule*.{ts,tsx}',
    'src/app/runtime/__tests__/*calendar*.test.{ts,tsx}',
    'src/app/runtime/__tests__/*schedule*.test.{ts,tsx}',
    'src/app/components/lawyer/dashboard/schedule/**/*.{ts,tsx}',
    'src/app/components/lawyer/dashboard/*Schedule*.{ts,tsx}',
    'src/app/components/lawyer/hooks/__tests__/*useCalendarData*.test.ts',
    'src/app/services/cloud/lawyerCalendarCloud*.{ts,tsx}',
    'src/app/services/__tests__/calendarFullSimulation.test.ts',
    'src/app/services/calendar/__tests__/calendarFullScheduleSync.test.ts',
    'src/app/services/notifications/native/__tests__/calendarNativeReminderScheduler.test.ts',
];

/** أقلّ عدد مسارات مقبول — يكشف انهيار الأنماط أو نقل مجلّد */
export const CALENDAR_CRITICAL_MIN = 56;
