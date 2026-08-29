# إغلاق موجات تخفيف الدعاوى 1–2 (صادق)

**تاريخ:** 2026-08-21  
**نطاق:** Wave 1 (workspace / urgent / portal lite) + Wave 2 (SmartFile hubs / TrialsTab / criminal modals / personal chrome)

---

## الحكم المختصر

| الموجة | الحالة | جاهز للانتقال؟ |
|--------|--------|----------------|
| Wave 1 | منفّذة ومثبتة سابقاً | نعم داخل نطاقها |
| Wave 2 | منفّذة في هذه الجلسة | نعم — بلا P0 معروف في النطاق |

التخفيف **هيكلي (eager→lazy + prefetch identity)** وليس قياساً رقمياً لـ gzip chunk.

---

## ما أُنجز (ملموس)

### Wave 1 (مرجع)
- تأخير secondary workspace warm؛ archive بدون execution portal؛ criminal list hover خفيف؛ Quick Log lazy في View_Urgent؛ Flow/Admin portal lazy.

### Wave 2
1. **`smartFileMainPanelLazyHubs.tsx`** + تحديث `SmartFileMainPanel` / `lazySmartFileModalWidgets` / hot prefetch.
2. **`LazyTrialsTab`** في registry؛ `CriminalDashboardRequestsTab` بدون static TrialsTab.
3. **`criminalDashboardLazyModals`**: StageCloser, RequestsEntry, SendToCassation, LegalArticleEdit, ReopenCase, BailForfeiture؛ Host يستوردها فقط من الـ lazy registry.
4. **`SmartFileModalContent`**: PersonalStatus chrome خلف `isPersonalStatusFile` + Suspense null + prefetch عند personal.

---

## تقييم الأبعاد (واقعي)

| البُعد | Wave 1–2 | ملاحظة |
|--------|----------|--------|
| أداء | 8/10 | أخف مسار مدني/جزائي؛ بدون قياس bundle رقمي |
| نظافة | 8.5/10 | هويات preload موحّدة؛ لا حذف منطق |
| أمان | 8/10 | لا تغيير صلاحيات/مسارات بيانات |
| جودة كود | 8.5/10 | نفس نمط registry / lazyModal |
| موبايل | 8/10 | لا تغيير بصري؛ fallback null يفترض prefetch ناجح |
| صدق | 9/10 | النقص أدناه معلن |

---

## الحدود / المتبقي (ليس P0 داخل البرنامج)

| بند | خطورة | لماذا ليس إغلاق-مانع |
|-----|--------|----------------------|
| Judgment portal eager | منخفض–متوسط | عقد keep-mounted مقصود |
| `trialSessionsEngine` static في RequestsTab | منخفض | دوال عرض خفيفة؛ المحركات الأثقل تُسخَّن على نية التبويب |
| `ActiveOrderFileView` Modal_Quick_Log | خارج النطاق | موجة منفصلة إن لزم |
| قياس vite analyze | توثيق | أثر هيكلي موثّق بالبايت المصدري تقريباً |
| وميض نادر إن فشل prefetch على شبكة بطيئة | منخفض | fallback=`null` — سلوك مقبول بلا redesign skeleton |

**لا يوجد P0 حقيقي متبقٍ ضمن Wave 2 كما عُرّف.**

---

## اختبارات مركّزة (هذه الجلسة)

**14 ملف / 79 اختبار — كلها ناجحة**

- criminalDashboardLazyRegistry (+ فحوص Wave 2: LazyTrialsTab، لا static TrialsTab، ModalsHost من lazyModals)
- criminalDashboardStructure, criminalDashboardResolvedRuntimeStructure, criminalModalsHostPrime
- SmartFileModalPortal, SmartFileModalBootChrome, civilSectionStructure, personalStatusStructure
- lawsuitOpenContract, preloadableLazy
- phase15SectionFirstOpenCut, phase16LawsuitChromeCut, criminalOpenContract, criminalBootHydrator

---

## المصداقية

- لم يُدعَ «تخفيض X% من الـ bundle».
- Prefetch-on-intent **محفوظ** عمداً.
- لا commit في هذه الموجة.
