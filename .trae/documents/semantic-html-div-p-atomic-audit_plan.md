# خطة التنفيذ: تدقيق ذري شامل لـ div و p والعناصر الدلالية في جميع TSX

## أهداف المهمة
نفس الطريقة الشاملة الذرية الاحترافية التي طبقناها في فحص الجودة الإنتاجية (F1-F6) — ولكن هذه المرة على مستوى HTML الدلالي:
1. إصلاح أي استخدام غير صالح لـ `<p>` يحوي عناصر كتلة (block elements) = مخالفة صريحة لـ HTML Living Standard
2. تحليل "div soup" (سلاسل div > div > div بدون غرض دلالي) واستبدالها بعناصر دلالية حيثما ينطبق ذلك **بدون أي تغيير بصري (ZVF محفوظ 100%)**
3. بناء تقرير نهائي حتمي يحدد: إجمالي الحالات، الحالات التي تم إصلاحها، الحالات المصنفة WONTFIX (مع سبب موثق لكل حالة)

---

## نتائج البحث الأولي في المستودع (تاريخ 2026-09-07)

| المؤشر الذري | العدد الحالي | عدد الملفات المتأثرة | الملاحظة |
|---|---|---|---|
| استخدامات عنصر `<div` (بدون self-close) | **556+** | 100+ ملف TSX | هذا يشمل divs وظيفية صحيحة (واجهة مستخدم + CSS Grid/Flexbox) + divs يمكن استبدالها بدلالي |
| استخدامات عنصر `<p` | **360+** | 100+ ملف TSX | النسبة العالية جيدة في الأساس (استخدام واضح لفقرات النص) |
| استخدامات عناصر دلالية HTML5 (section/article/nav/header/footer/aside/main/figure/figcaption/time/address/blockquote/details/summary/dialog/mark/progress/meter/output/code/pre/cite) | **217** | 100+ ملف TSX | **نسبة ضعيفة**: العناصر الدلالية = 28% فقط من حجم divs → مجال كبير للتحسين |
| **⚠️ ملفات بها مخالفة HTML صريحة** (عنصر `<p>` يحوي داخله عناصر كتلة مثل div/section/article/header/footer/nav/aside/ul/ol/h1-h6/figure/blockquote/pre/table/form/fieldset) | **30 ملفاً مؤكداً** | 30 ملف TSX | هذه أولوية عظمى لأن المتصفح يقوم بفصل تلقائي لـ `<p>` عندما يواجه عنصر كتلة داخله → أثر فعلي على: DOM tree, CSS selectors, findByRole في الاختبارات, Screen Readers |

**ملفات 30 المخالفة المبدئية (من نتائج grep multiline الصريحة):**
```
LawsuitArchiveChrome.tsx, EvictionResidentialGraceFollowupModal.tsx,
EvictionLawyerFeeFollowupModal.tsx, EvictionExpenseFollowupModal.tsx,
LawsuitArchiveCard.tsx, PleadingCloseDecisionFlow.tsx,
CoercivePendingDecisionRail.tsx, TasksManagerModalFields.tsx, TaskPlanChain.tsx,
FieldTasksSheetChrome.tsx, FieldTasksSheetOpenInstantChrome.tsx,
CriminalDashboardInstantFrame.tsx, SettlementRepaymentStripPanel.tsx,
ForumOverlayInstantCovers.tsx, LinkedLawsuitDossierCluster.tsx,
LawyerAuthOtpPanelSteps.tsx, ErrorBoundary.tsx,
buildSmartFileMainPanelFooterPanels.tsx, FastTrackModal.tsx,
CrossAppealModal.tsx, AppealTransitionModalPartyPickers.tsx,
AppealTransitionModalAppealTypeSection.tsx, PersonalStatusStageFooterBar.tsx,
PersonalStatusDossierBody.tsx, TravelBanSection.tsx, ForcedBringSection.tsx,
ExecutiveDetentionJudgeSection.tsx, DossierPresentationSection.tsx,
useEvictionFieldActionRenderers.tsx, createRenderEvictionBranchPanelBody.tsx
```

---

## الملفات والوحدات التي سيتم التعديل فيها

تنقسم إلى 3 طبقات حسب الأولوية والخطورة:

### الطبقة 1 (أولوية قصوى: إصلاح مخالفات HTML صريحة = أثر فعلي على DOM و CSS و A11y و الاختبارات)
تعديلات على الـ 30 ملفاً المذكورة أعلاه، حيث يتم:
- فحص كل `<p>` داخله عناصر كتلة → استبدال الـ `<p>` بـ `<div role="doc-subtitle" aria-level="p">` أو `<div className="...">` مع الحفاظ على className و aria و onClick تماماً (ZVF)
- أو نقل عناصر الكتلة خارج الـ `<p>` إلى div أب منفصل حسب المقام

### الطبقة 2 (أولوية عالية: divs قابلة للاستبدال بدلالي بدون أي تغيير بصري)
تشمل جميع ملفات src/**/*.tsx ولكن مع تصنيف WONTFIX للـ divs الوظيفية:
- divs وظيفية (flex/grid layout wrappers, spacing wrappers, className only containers, conditional wrappers) → **WONTFIX مسبقاً (60-70% من divs)**
- divs دلالية قابلة للاستبدال بآخر:
  - غلاف قسم رئيسي → `<section aria-labelledby="...">`
  - غلاف بطاقة مستقلة ذات عنوان → `<article>`
  - غلاف شريط التنقل → `<nav aria-label="...">`
  - غلاف رأس القسم/البطاقة → `<header>`
  - غلاف تذييل القسم/البطاقة → `<footer>`
  - غلاف محتوى جانبي → `<aside aria-label="...">`
  - غلاف صورة + وصفها → `<figure>` مع `<figcaption>`
  - حاويات وقت/تاريخ → `<time dateTime="ISO8601">`

### الطبقة 3 (أولوية متوسطة: كتابة تقرير WONTFIX لكل حالة لم يتم إصلاحها مع سبب مهني موثق)
بناء تقرير `.audit/FINAL-SEMANTIC-HTML-AUDIT.txt` بنفس تنسيق تقارير الجودة السابقة مع:
- إجمالي الحالات التي تم فحصها
- الحالات المصنفة OK / FIXED / WONTFIX
- سبب موثق لكل WONTFIX

---

## خطوات التنفيذ بالترتيب (ذاتي التبعية)

1. **المرحلة A — إصلاح مخالفات p (30 ملف)**
   أ. فتح كل ملف من الـ 30 ملقاً grep المبدئية
   ب. استخدام grep الدقيق `mutiline: true` داخل كل ملف للعثور على النطاق الدقيق لـ p الداخل عنصر كتلة
   ج. تعديل DOM الـ TSX فقط:
      - إن كان محتوى p عبارة عن نص فقط مع 1 div داخلي جانبي → نقل الـ div خارج الـ p
      - إن كان الـ p كلو عبارة عن حاوية (نادر في React TSX) → استبدال `<p>` بـ `<div>` مع حفظ className/aria/onClick/refs تماماً
   د. **ZVF pledge:** لا تغيير لأي className أو styles أو ترتيب بصري — نفس المخرجات في المتصفح تماماً
   ه. تشغيل اختبار للملف إذا كان موجوداً (npm run test -- الفيل المعني) للتأكد من عدم كسر selectors

2. **المرحلة B — استبدال divs الدلالية (الملفات بأكملها)**
   أ. المرور على جميع الملفات TSX (بدون ملفات __tests__ لتجنب كسر fixtures الاختبارات)
   ب. تصنيف كل div:
      - Layout only (فقط className/spacing/flex/grid) → WONTFIX: "layout wrapper — semantic replacement carries no A11y gain and risks breaking descendant selectors"
      - Semantic candidate (له عنوان، له دور مفهوم، يحوي مقاطع كاملة من الواجهة) → استبدال بـ section/article/header/footer/nav/aside مع إضافة aria-label أو aria-labelledby
   ج. ZVF pledge: نفس className، نفس props، نفس onClick، نفس children ترتيب
   د. تجنب كسر أي مراجع ref={...} (React refs لا تعمل على عناصر مختلفة بنفس الاسم؟ لا، ref تشير إلى عنصر DOM مختلف ويعمل بنفس الطريقة إلا إذا كان الكود يتحقق من div.tagName — grep وقائي لـ `.tagName` قبل استبدال أي div لديه ref)

3. **المرحلة C — التشغيل والتحقق (بالترتيب)**
   أ. `guard:tsc` (TypeScript 956 ثابتة لا ارتفاع)
   ب. `guard:lint` (lint 11 ثابتة)
   ج. `GetDiagnostics` (IDE TS errors = [])
   د. `guard:tests` (baseline 21 — لا فشلات غير موثقة جديدة)
   ه. تشغيل grep التحقق النهائي: `<p[\s>][\s\S]*?<(div|section|article|header|footer|nav|aside|ul|ol|h[1-6]|figure|blockquote|pre|table|form|fieldset)` → **يجب أن يكون 0 ملفات** (أو عدد محدود من الـ false positives فقط في ملفات الاختبارات التي تستخدم JSX كـ fixture وليس DOM فعلياً)

---

## الاعتمادات والملاحظات الهندسية الهامة

- **ZVF (Zero Visual Edits) 100% محفوظة** → هذا يعني:
  - ممنوع تغيير أي className أو style أو ترتيب children
  - استبدال div بـ section/article/header يعتبر تعديل بنية DOM ولكنه ليس "تعديلاً بصرياً" (لا يتغير شيء في شاشة المستخدم) — هذا المسموح به ضمن ZVF لأن المبدأ يقصد به عدم تغيير المظهر والوظيفة للمستخدم النهائي
- **React 18 + TypeScript:** جميع العناصر الدلالية لها نفس أنواع الـ props التي لدى div (React.HTMLAttributes<HTMLElement>) → لا مشاكل في الأنواع باستثناء عناصر خاصة (form/fieldset لها props إضافية)
- **الاختبارات التي تستخدم selectors مباشرة مثل `screen.getByRole('region')`:** بعد استبدال div بـ section بدون aria-labelledby قد يختبر role مختلف. الحل: إضافة aria-label أو aria-labelledby صريحة دائماً أثناء الاستبدال
- **ملفات `__tests__/**/*.tsx`:** سنستبعدها من استبدال divs لأنها غالباً fixtures للاختبارات وقد تعتمد بنية divs بالذات في assertion محددة → WONTFIX كافة

---

## التحقق بعد التنفيذ

| المرجع | الشرط الحتمي للمرور |
|---|---|
| grep multiline `<p>` تحوي عناصر كتلة | 0 ملفات في ملفات المصدر (غير الاختبارات) أو عدد false positives موثقة |
| guard:tsc | exit=0, baseline 956 لا يرتفع |
| guard:lint | exit=0, baseline 11 لا يرتفع |
| GetDiagnostics | [] |
| guard:tests | exit=0, baseline 21 ثابت (لا فشلات جديدة غير موثقة) |
| ZVF scan | تعديلات DOM بنية فقط + 0 تغييرات في CSS/SCSS/صور |
| تقرير .audit/FINAL-SEMANTIC-HTML-AUDIT.txt | موجود مع أرقام دقيقة و WONTFIX موثقة لكل حالة |

---

## المخاطر والمعالجة

| المخاطر | الاحتمال | الأثر | المعالجة الوقائية |
|---|---|---|---|
| كسر اختبارات تعتمد على getByRole أو selectors تنص على role خاطئ | متوسط | عالي (يؤثر على guard:tests baseline) | **قبل استبدال أي div بـ section/article:** grep للملف بحثاً عن getByRole/querySelector في __tests__ المرتبطة به. إذا وجدت → أضف aria-label صريحة قبل استبدال العنصر أو الصنف على WONTFIX مع سبب موثق |
| تعارض ARIA (element implicit role vs explicit role): e.g. `<nav role="tablist">` يخفي دور navigation الضمني | منخفض | متوسط | عند استبدال div لديه role="" بالفعل → الصنف WONTFIX إذا كان الدور المستهدف يتعارض مع الدور الضمني للعنصر الجديد |
| كسر refs التي تحقق من `.tagName === 'DIV'` (نادر جداً) | منخفض | متوسط | grep وقائي لكل `<div ref=` في الملف قبل التعديل → بحث داخلي لـ `.tagName` أو `.nodeName` على ذلك الـ ref → إذا وجدت WONTFIX ذلك العنصر المحدد |
| زيادة طفيفة في حجم bundle بسبب اسماء عناصر أطول من "div" (section 7 chars / article 7 chars / nav 3 chars / header 6 chars) | منخفض جداً | منعدم عملياً | الفرق المقسوم على 500 استخدامات = بايتات قليلة (أقل من 2 كيلوبايت بشكل عام) ضمن noise لـ gzip على الإنترنت. WONTFIX كعامل |
