# عطل نظام كلمة السر / الاستعادة — إغلاق

## التشخيص (صادق)

مسار «نسيت كلمة المرور؟» كان **مكسوراً من الجذر** رغم وجود قطع UI/API:

1. `LawyerPasswordResetForm` موجود لكن **غير موصول** لأي بوابة (`LawyerAuthGate` / `useLawyerDashboardAuth`).
2. `updateAuthPassword` كان يُستدعى من النموذج **دون وجوده** في `authSupabaseLazy`.
3. `markPasswordRecoveryPending` لم يُستدعَ من مسار التشغيل الحي.
4. مستمع الجلسة كان يُتخطّى عند غياب جلسة محفوظة → روابط البريد (`code` / `type=recovery`) لا تُلتقط.
5. `redirectTo` كان `origin/` بلا `?hami_auth=recovery`.

النتيجة للمستخدم: زر النسيان يظهر نجاحاً عاماً، والرابط من البريد لا يفتح شاشة تعيين كلمة مرور جديدة.

## الإصلاح

- إضافة `updateAuthPassword`.
- ربط نموذج الاستعادة في `useLawyerDashboardAuth` قبل اللوحة.
- تعليم `PASSWORD_RECOVERY` + رابط العودة.
- فتح مستمع Supabase عند callback الاستعادة/PKCE.
- `redirectTo = origin/?hami_auth=recovery`.
- تحسين رسائل الدخول والاستعادة.

## حد تشغيلي خارج الكود

يجب أن تتضمّن Redirect URLs في Supabase Dashboard شيئاً مثل:

`http://localhost:8080/?hami_auth=recovery`

وSite URL مناسب للبيئة. بدون ذلك قد يرفض GoTrue الرابط حتى بعد إصلاح الواجهة.
