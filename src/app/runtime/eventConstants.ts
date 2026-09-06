/**
 * ثوابت الأحداث المركزية — Single Source of Truth لجميع أحداث CustomEvent
 * (hami:* و hami-*) في التطبيق.
 *
 * لا تُعرّف أي ثابت حدث بنفس القيمة في أي مكان آخر — استورد من هنا دائماً.
 *
 * تم إنشاؤه كجزء من Task 1 في Perfect Production From Scratch لإزالة التكرار
 * الميداني المكتشف لـ APP_RUNTIME_READY_EVENT (4 مرات في 4 ملفات مختلفة).
 *
 * T14: تم نقل التعريفات الفعلية إلى `@/app/constants/appEventNames` ليكون
 * مساراً محايداً قابلاً للاستيراد من طبقة services بدون عبور حد معماري محظور
 * (services ↚ runtime هي قاعدة T21 المعمارية).
 * هذا الملف بقي كـ barrel re-export للحفاظ على التوافق مع كل الاستدعاءات الحالية.
 */

export * from '@/app/constants/appEventNames';
