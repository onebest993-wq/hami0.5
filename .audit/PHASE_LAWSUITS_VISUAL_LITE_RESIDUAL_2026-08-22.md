# تخفيف متبقّيات تصميم الدعاوى — موجة متابعة

**تاريخ:** 2026-08-22  
**سبب:** بقايا بعد الموجات السابقة (blur-md، scrim أسود، أحوال شخصية، كثافة، مودالات ثقيلة).

## ما أُغلق في هذه المتابعة

| فئة | إجراء |
|-----|--------|
| blur-md المتبقي | → `backdrop-blur-sm` (~98 ملف) |
| scrim | `bg-black/80→62` · `/90→70` |
| أحوال شخصية | لوحات مسطّحة · أبطال أخف · بدون تدرجات ثقيلة |
| كثافة | Trials/LegalCodes/Statements `p-6/gap-6`→`p-4/gap-4` · `space-y-6`→`4` |
| مودالات ثقيلة | ThirdParty · CrossAppeal · Jurisdiction panel |
| بطاقات | ExecutionSmartCard rounded-2xl · timeline dots أصغر |
| tokens | `LV_BLUR=sm` · elevation أخف · scrim 68% |

## تحقق

vitest مركّز: **35 passed**

## صدق

قد تبقى فراغات محلية نادرة أو `rounded-3xl` في تنفيذ بعيداً عن مسار الدعاوى اليومي؛ الثقل الأساسي داخل القسم أُغلق.
