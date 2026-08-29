# إغلاق نقص أحجام الملف — تقسيم + CSS FOUC-safe

**التاريخ:** 2026-08-12  
**قاعدة:** بلا تغيير بصري

## ما أُنجز

### 1) تقسيم منطق نقي من الملفات الثقيلة
| مستخرج | المستهلك |
|--------|----------|
| `createProfileCustomBlock.ts` | `useProfileSettingsBlockOps` |
| `profileCustomBlocksDragUtils.ts` | `ProfileCustomBlocks` |
| `buildProfileEditPersistPayload.ts` | `useProfileEditSession` |
| `gcProfileEditOrphanMedia.ts` | `useProfileEditSession` (بعد حفظ سحابي ناجح) |
| `scheduleRemoveProfileMediaPaths` في `editDraftMediaPaths.ts` | مسار GC موحّد |

الملفات الأصلية بقيت orchestrators (hooks/UI) — التخفيف بالمنطق النقي لا بإعادة تصميم JSX.

### 2) CSS sync — قرار صادق + تنفيذ محدود
- **رفض** تأجيل برميل `profilePageFx` / chrome / hero (FOUC على Android/Capacitor عند أول فتح).
- **نُفّذ:** فصل قواعد لوحة شكل/حافة الصورة إلى `profileImageStudioFx.css` تُحمَّل مع `ImageBlockStudioEditor` (chunk الاستوديو فقط).
- **حُذف ~4.8KB** قواعد ميتة (`profile-studio-image-interaction*` / live-preview) بعد إزالة تفاعلات الاستوديو من المحرر.
- `profileImageFx.css`: ~20.8KB → ~11.6KB (إطار العرض + focus picker + media chip تبقى sync عبر `ProfileImageFrameShell`).

## تحقق
Vitest (موجة التقسيم/التأجيل): ناجح — يشمل  
`useProfileEditSession` / `useProfileSettingsBlockOps` / `ProfileCustomBlocks.dragCommit` / touch floors / `profileImageStudioDeferral` / `profilePageFxBudget` / prime / intentWarm.

## تقييم واقعي

| البُعد | درجة | ملاحظة |
|--------|------|--------|
| أداء | مرتفع لهذا النطاق | sync image FX أخف؛ studio CSS خارج أول فتح |
| نظافة | مرتفع | ميت interaction CSS محذوف؛ GC/persist/drag مستخرجة |
| أمان | مرتفع | منطق التحقق/التصفية نفسه عبر `buildProfileEditPersistPayload` |
| جودة كود | مرتفع | واجهات رفيعة + وحدات بمهمة واحدة (انظر PHASE_PROFILE_ORCHESTRATOR_*) |
| موبايل | مرتفع | لا تأجيل برميل يعرّض FOUC؛ touch floors ما زالت مقفلة |
| صدق | مرتفع | حدود معلنة أدناه |

## حدود متعمدة (ليست ديناً داخل هذا النطاق)
- لا تفكيك JSX لـ `ProfileCustomBlocks` / `useProfileSettingsBlockOps` إلى عدة hooks UI — المنطق الثقيل نُقل؛ الواجهة بقيت وحدة تفاعل واحدة عن قصد.
- MinimalBoot DOM bridge يبقى كما هو (قرار سابق).
- باقي CSS sync (~pageFx barrel ~100KB مع hero/chrome) **يُبقى sync** — تأجيله غير آمن لـ FOUC.

## الموقع
**جاهز للانتقال:** نعم — داخل نطاق التقسيم + مراجعة CSS.

## المصداقية
ما لم يُنفَّذ: إعادة تصميم بصري، تأجيل كامل لـ CSS الصفحة، أو تقطيع JSX إضافي بلا حاجة سلوكية.
