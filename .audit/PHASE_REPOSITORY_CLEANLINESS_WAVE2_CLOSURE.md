# نظافة قسم المستودع — موجة 2 — إغلاق صادق

**التاريخ:** ٣٠ آب ٢٠٢٦  
**النطاق:** المستودع الذكي (`SmartRepository` + `SmartRepositoryModal` + ألواح المخزن التي يستهلكها المستودع + `src/app/services/repository` + تسخين/فتح الصدفة).  
**سابق:** قفل الموجة الأولى في `repositoryCleanlinessHonesty.test.ts` (رموز ثيم/CSS ميتة، `RepositoryFeedSection`، توحيد `stripHtml`). تنحيف بصري منفصل: `.audit/PHASE_REPOSITORY_VISUAL_SIZE_THINNING_CLOSURE.md`.  
هذه موجة ثانية أعمق — حذف تكرار وميت، لا إعادة ادّعاء للتنحيف ولا لمنتدى `LegalRepository`.

لا تغيير بصري. لم يُمسّ عقد WIFE / الشبكة / ختم KV.

---

## ما أُنجز

### ملفات ميتة / نسخة زائدة

| عنصر | الحكم |
|------|--------|
| `VaultPdfViewerSurface.tsx` + `VaultPdfViewerSurfaceLazy.tsx` | غلاف تمرير 100٪ فوق `VaultPdfJsViewerLazy` + طبقة `lazy` ثانية. المسار الحي صار عارضاً واحداً. `DocumentVault` (تنفيذ) حُوِّل لنفس العارض حتى لا تبقى النسخة. |
| `VaultModalRootContext.tsx` + `useVaultModalRoot` | Provider بلا مستهلك. لوحات التصنيف ما زالت `createPortal(..., document.body)`. |

### دوال ميتة

| عنصر | الحكم |
|------|--------|
| `reportRepositoryPerfIfDev` | بلا مستدعٍ — يبقى `reportRepositoryPerf` |
| `resetRepositorySentryModuleForTests` | بلا مستدعٍ — الاختبارات تسخر الوحدة كاملة |

### حالة ميتة على مسار الخلاصة

- `modalRoot` / `setModalRoot` في `useRepositoryUnifiedFeedModel` كانت تغذي السياق الميت فقط، وتُعيد رسم الخلاصة عند `ref`. حُذفت.

### تصديرات داخلية أُلغيت (نفس الملف فقط)

أنواع/دوال لم تُستورد خارج ملفها: `REPO_SURFACE_BASE`، `REPOSITORY_FEED_LAYOUT_DEFAULT`، `SmartRepositoryUnifiedFeedProps`، `ComposeSaveBlockReason`، `RepositoryChromeDismisser`، `ParsedDossierNoteId`، `patchLawsuitFileNote`، `RepositoryFeedBuildInput`، `RepositoryPerfBudgetKey`، `RepositoryPerfPhase` (النوع)، `RepositoryRoomAlphaGroup`، `saveRepositoryRooms`، `createRepositoryRoomId`، `OpenRepositoryFromShellParams`، `REPOSITORY_FEED_FILTERS`، `filterRepositoryFeedByCustomCategory`، `ScannerVideoMetrics`، `SCANNER_CAPTURE_MAX_EDGE`، `SCANNER_JPEG_QUALITY`، `clampScannerCaptureSize`، `ScanPhase`، `VaultDocEditValues`، `VaultSearchFilterHubProps`، وإعادة تصدير `RepositoryPerfReportContext` من `repositoryPerfMetrics`.

`export type { UniversalEntryCardProps }` من البطاقة بقي — الخلاصة تستورده.

---

## ما أُبقي عمداً (ليس ميتاً)

- قائمتا الخلاصة: `RepositoryFeedProgressiveList` و `RepositoryFeedVirtualList` — مساران حسب الحجم، مقفولان في `RepositoryFeedList.test.tsx`.
- شريط المحرّر الكامل مقابل المضغوط: نسختان بصريتان؛ قفل الجودة يمنع دمجهما في دالة واحدة داخل الملف.
- `AppDocumentPreviewOverlay` — مستهلكه منتدى المجتمع، خارج هذا القسم.
- `REPO_COMPOSE_ICON_BTN = REPO_CARD_ICON_BTN` — اسم مستعمل في المسودة وملاحظات الإضبارة.
- خدمات الأداء (`repositoryPerfMetrics` / Sentry / الميزانية) — مربوطة بفتح الصدفة والاختبارات.

---

## الاختبارات

Vitest بوابة المستودع (هوكات الصدفة، الصدق، الخلاصة، المخزن، الخدمات، الميكروفون/الكاميرا): **٤٩ ملفاً، ٢٢٢ اختباراً — ناجحة**.

إضافيان خارج قائمة البوابة: `repositoryBootHydrator` + `repositoryDossierFeed` — **٤ اختبارات ناجحة**. المجموع **٥١ / ٢٢٦**.

قفل الصدق: `repositoryCleanlinessHonesty.test.ts` (موجة 2) يمنع عودة الملفات/الدوال المحذوفة. `repositoryQualityHonesty` و `repositoryScannerSavePerformanceHonesty` لم يعودا يقفلان `modalRoot` الميت.

Playwright / جهاز / `tsc` كامل / `guard-dead-exports.mjs --save`: **لم تُشغَّل**.

---

## التقييم

| البُعد | درجة | ملاحظة |
|--------|------|--------|
| أداء | 8 | طبقة PDF lazy واحدة بدل اثنتين؛ بلا إعادة رسم `modalRoot`. بلا قياس جهاز/حزمة |
| نظافة | 8 | حذف حقيقي. القائمتان والمحرّران يبقيان عمداً |
| أمان | 8 | لم يُمسّ WIFE/التخزين الآمن للغرف/الخلاصة |
| جودة | 8 | تصديرات داخلية أُغلقت؛ لا برميل `index.ts` |
| موبايل | 8 | لم تُضعَف 44px / لوحة المفاتيح / safe-area |
| صدق | 9 | انظر الحدود |

**جاهز للانتقال:** نعم لهذه الموجة.

---

## الحدود — ما لم يُنفَّذ صراحةً

- منتدى `CommunityScreen/LegalRepository` خارج النطاق.
- `DocumentVault` ليس سطح المستودع؛ تغيّر الاستيراد فقط لإزالة الغلاف المشترك.
- لم تُدمَج قائمتا الخلاصة ولا شريطا المحرّر (عقد حيّ + شكل مختلف).
- لم يُشغَّل Playwright ولا جهاز ولا `tsc` كامل.
- `guard-dead-exports.mjs --save` لم يُحدَّث على مستوى المستودع (خط أساس عالمي).
- لا تحقق متصفح حيّ بأدوات التصفح في هذه الجلسة.
- لا تغيير بصري مقصود.
