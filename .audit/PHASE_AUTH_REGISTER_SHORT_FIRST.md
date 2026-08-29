# تسجيل المحامي — تقسيم سريع (بريد + كلمة مرور أولاً)

## ما أُنجز
- خطوة أولى قصيرة: بريد + كلمة مرور + تأكيد فقط، ثم **إنشاء الحساب فوراً**.
- بعد إنشاء الحساب تظهر: الهاتف، الاسم الثلاثي، اللقب، المحافظة، غرفة المحامين.
- ثم الهوية ثم الوجه (اختياري) كما كان.

## المسار
`credentials` → `registerLawyerAccount` → `profile` → `identity` → `face` → `finalizeLawyerOnboarding`

## ملفات
- `LawyerRegisterWizard.tsx`
- `authProviderRuntime.ts` (`authRegisterLawyerAccount` / `authFinalizeLawyerOnboarding`)
- `AuthContext.tsx` / `authContextStore.ts`
- `registrationCredentialsSecurity.ts` (فصل تحقق الحساب عن الملف الشخصي)

## حدود
- قواعد كلمة المرور الأمنية لم تُضعَّف (ما زالت قوية).
- إن فشل الدخول الفوري بعد التسجيل (تأكيد بريد)، إكمال الملف يتطلب جلسة لاحقاً.
