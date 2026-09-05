# نظافة قسم الإعدادات — موجة 2 — إغلاق صادق

**التاريخ:** ٣٠ آب ٢٠٢٦  
**النطاق:** مركز الإعدادات (`HamiSettings`) + خدمات `services/settings` + سياق `lawyerSettings` + مسار الفتح (`settingsBootHydrator` / الطلاء الفوري). بلا شاشات الخصوصية/الدعم (`SettingsScreens`) وبلا استوديو الملف الشخصي.  
**سابق:** `.audit/PHASE_SETTINGS_CLEANLINESS_CLOSURE.md` (١٢ آب ٢٠٢٦). هذه موجة ثانية أعمق بعد عزل الشبكة وختم السحابة — لا إعادة ادّعاء للموجة الأولى.

## ما أُنجز

### حذف شيفرة ميتة مؤكَّدة
| عنصر | الحكم |
|------|--------|
| `settingsCapabilities.ts` + `settingWiringHint` | قاموس تلميحات بلا مستهلك في الواجهة — اختبار التغطية كان يثبّت القاموس الميت |
| `resolveBlockSizeScale` / `hubExecutionTitleRem` | بلا مستدعٍ بعد موجة المقياس السابقة |
| `resetSettingsSentryModuleForTests` | بلا اختبار يستدعيه |
| `BUILTIN_AUTO_SUMMARY` + `void` في `settingsRuntime` | ثابت ميّت يُستورد كي لا يُحذف |
| `SecuritySectionViewModel` | نوع مصدَّر بلا مستورد حتى داخل القسم |
| `SettingsPerfBudgetKey` / `HomeBlockGlobalAppearanceKey` | أنواع بلا استخدام |
| إعادة تصدير `resolveThemeMode` من `apply` ثم من البرميل | تكرار فوق `resolveThemeMode.ts` |

### براميل مكرَّرة أُغلقت
- `settingsRuntime` لم يعد يعيد تصدير لقطة الإعدادات، قنوات التنبيه، أو بوابات السحابة — المستوردون يأخذون المصدر (`settingsSnapshot` / `cloudSyncBucket` / `notificationAlertPolicy`).
- `settingsBootHydrator` لم يعد يعيد تصدير أحداث الشِل؛ المصدر الوحيد `settingsShellEvents`.
- `HamiSettingsApp` لم يعد يعيد تصدير `HamiSettingsProps` (البرميل يستورد من `hamiSettingsTypes`).
- اختبار `DataSyncCard` لم يعد يحاكي `saveToCloud` / `loadFromCloud` / `applyAppData` بعد عزل الشبكة.

### تصديرات داخلية أُلغيت (نفس الملف فقط)
أنواع Props للـ Host/Shell/Router/Account/AsyncToggle، وأنواع العقود الداخلية (`SettingsEscape*`, `WallpaperEditorDraft`, `OpenSettingsShellInput`, …) و`prefetchSettingsAfterBootReveal` و`MAX_BACKUP_IMPORT_VALUE_CHARS`.

اختبار التغطية صار يثبّت **علامات الواجهة الحيّة** لا التلميحات الميتة.

## الاختبارات

- قفل الصدق: `settingsCleanlinessCloseHonesty.test.ts` (موجة 2) يمنع عودة الأسماء/الملفات المحذوفة.
- `npm run gate:settings` — **PASSED**: **١٢٩ ملفاً / ٤٥٦ اختباراً**.

## التقييم

| البُعد | درجة | ملاحظة |
|--------|------|--------|
| أداء | 8 | أقل شيفرة ميتة على مسار البرميل؛ بلا قياس جهاز/حزمة |
| نظافة | 8 | حذف حقيقي + إغلاق تصديرات؛ ليست «صفراً مطلقاً» |
| أمان | 8 | لم يُمسّ عقد العزل/الختم/التشفير المحلي |
| جودة | 8 | براميل أضيق؛ `settingsRuntime` لم يعد سلّة إعادة تصدير |
| موبايل | 8 | بلا تغيير بصري؛ لم تُضعَف 44px / لوحة المفاتيح / safe-area |
| صدق | 9 | انظر الحدود |

**جاهز للانتقال:** نعم لهذه الموجة داخل نطاق الإعدادات.

## الحدود — ما لم يُنفَّذ صراحةً

- `Toggle` و`AsyncSettingToggle` يبقيان مكوّنين: سلوك مختلف (optimistic مقابل commit غير متزامن) — دمجهما يمسّ التفاعل.
- أنواع `HamiSettingsProps` تبقى مصدَّرة من `hamiSettingsTypes` + برميل `index` لأن المحمّل الديناميكي يعتمد البرميل.
- CSS الكروم (`settingsChrome*.css`) لم يُمسّ — حذف قاعدة غير مؤكَّدة يغيّر الشكل.
- شاشات الخصوصية/الدعم واستوديو الملف الشخصي خارج هذا القسم.
- `flushPendingBootTypography` ما زال يُعاد تصديره من `apply` لأن اختبار DOM يستورده من هناك.
- `shouldAllowIntentWarm` (من اللقطة) يبقى بجانب `shouldAllowIntentWarmFromDom` عمداً: مساران مختلفان (لقطة مقابل DOM).
- لم يُشغَّل Playwright ولا جهاز ولا `tsc` كامل للمستودع.
- `guard-dead-exports --list` على نطاق الإعدادات بعد التنظيف: **صفر ملفات** بصادرات ميتة مؤكَّدة (كان ~٢٥ ملفاً قبل الموجة).
- `guard-dead-exports.mjs --save` لم يُحدَّث على مستوى المستودع (خط الأساس عالمي وقديم).
- لا تغيير بصري.
