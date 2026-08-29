# تقرير إغلاق — دوائر الاستيراد، البوابة اللغوية، أمن المنصّة الأصلية

التاريخ: 2026-08-08
النطاق: الأساس فقط (بنية الاستيراد، صحّة React، صلابة بيانات أندرويد)

---

## ١. ما أُنجز — ملموساً

### أ) دوائر الاستيراد: 18 مجموعة / 58 ملفاً ← 14 / 48

البوابة كانت حمراء. أربع مجموعات فُكَّت بالبنية لا بالكتم:

| الدائرة | العلاج | الملف الجديد |
|---|---|---|
| `bootReveal` ↔ `homeMainGridPaintGate` | اسم الحدث إلى ورقة مستقلة | `src/app/bootstrap/bootEventNames.ts` |
| `calendarDurationUtils` ↔ `scheduleConflictDetector` | تصنيف العنصر والمدّة إلى ورقة | `src/app/services/calendar/scheduleItemSource.ts` |
| `PushNotificationService` ↔ `HamiNotificationBridge` | فصل طبقة إشعارات المجال | `src/app/services/notifications/domainNotifications.ts` |
| طبقة التخزين (٨ ملفات) | مفتاح المساحة إلى `storageDomains`، والنسخ الاحتياطي خلف حدّ كسول | — |
| `judgmentTypes` ↔ `pleadingStageClassification` / `extraordinaryAppealGateway` | مسنَدات أسماء المراحل إلى ورقة | `src/app/components/lawyer/smart-modal/smartFile/judgmentStageNames.ts` |

**تفصيل دائرة التخزين** (كانت الأخطر — على مسار الإقلاع عبر zustand persist):

```
workspaceStorePersist → zustandPersistFoundation → securePersistStorage
  → SecureStoreService → protectedStorageKeys → workspaceStorePersist
SecureStoreService ↔ protectedBackupService
```

- الضلع الأول قُطع بنقل `WORKSPACE_STORE_KEY` إلى `storageDomains` (الورقة التي
  تحمل بقيّة مفاتيح المجالات أصلاً). أُزيلت معه ثلاث سلاسل مكرّرة حرفياً.
- الضلع الثاني قُلب: `SecureStoreService` (طبقة دنيا) كان يستورد سياسة النسخ
  (طبقة عليا) ساكناً. صار النداء خلف `import()` مذكَّر. مكسب إضافي: آلة النسخ
  و`dossierBackupStore` خرجتا من الإغلاق الساكن لخدمة تقع على المسار الحرج.

**الحدّ:** بقيت ١٤ مجموعة / ٤٨ ملفاً — كلها سابقة لهذه الموجة، ومعظمها في
`appeal-engine` و`judgmentTypes` و`executionStorageKeys`. فكّها يمسّ منطقاً
قانونياً (مواعيد طعن، تصنيف مراحل)، ولا يصحّ على عجل في ذيل موجة أساس.
أداة التتبّع للموجة القادمة: `.cursor/trace-cycle-path.mjs`.

### ب) البوابة اللغوية: 242 ← 204 خطأ

| القاعدة | قبل | بعد |
|---|---|---|
| `react-hooks/rules-of-hooks` | 29 | **18** |
| `react/jsx-closing-tag-location` | 12 | 1 |
| `react/jsx-closing-bracket-location` | 5 | 1 |
| `@typescript-eslint/ban-ts-comment` | 195 | 183 |

خرق قواعد الخطافات ليس تجميلاً — الثلاثة المُصلَحة كانت **أعطالاً حقيقية**:

1. `EmployeeAssignmentCoerciveFollowupBlock` — `return null` فوق ثلاثة `useState`.
   `phase` يتغيّر أثناء حياة المكوّن (active ← تكليف)، فأول انتقال يُسقط React
   بـ«خطافات أكثر من الرسمة السابقة».
2. `ExecutorDecisionFollowupMirror` — `return null` فوق أربعة خطافات، و`row`
   يصل فارغاً ثم يمتلئ. نُقل الخروج تحتها مع تحصين جسمَي `useMemo`.
3. `OtherPartyActionsLog` — `if (embedded) return …` فوق سبعة خطافات. العلاج
   بالفصل إلى مكوّنين لا بنقل الخروج: الشكل المضمَّن لا يحتاج قراءة القرارات
   ولا الفرز، فالنقل تحت الخطافات كان سيُحمّله عملاً لا يستعمله.

٢٢ مخالفة تنسيق JSX أُصلحت آلياً؛ تحقّقت أن الفرق حركة قوس فقط.

خط الأساس اللغوي حُفظ عند 204 لتثبيت المكسب.

### ج) أمن المنصّة الأصلية — أخطر ما وُجد

`android:allowBackup="true"`. أي جهاز موصول بـadb، أو أي نسخة سحابية تلقائية،
كان يُصدِّر دليل بيانات التطبيق كاملاً: IndexedDB بإضابير الموكّلين والقرارات
والمرافعات. في تطبيق تحت سرّية المهنة هذه ليست ثغرة إعداد بل انكشاف كامل.

ما طُبّق (على القالب **و** الشجرة المولَّدة):

| الإعداد | ما يمنعه |
|---|---|
| `allowBackup="false"` | `adb backup` + النسخ السحابي التلقائي |
| `dataExtractionRules` | النقل بين جهازين على أندرويد ١٢+ (لا يغطّيه allowBackup) |
| `fullBackupContent` | الاستثناءات نفسها لأندرويد ١١ فما دون (دفاع ثانٍ) |
| `networkSecurityConfig` | النص الصريح + شهادات المستخدم (مراسي نظامية فقط) |
| `usesCleartextTraffic="false"` | تصريح مزدوج |
| `USE_FINGERPRINT maxSdkVersion="27"` | إذن مهجور يُطلب على أجهزة لا تحتاجه |

**عطل انحراف اكتُشف أثناء العمل:** أربعة أذونات إشعارات
(`POST_NOTIFICATIONS`, `VIBRATE`, `RECEIVE_BOOT_COMPLETED`, `SCHEDULE_EXACT_ALARM`)
كانت تعيش في الـmanifest المولَّد وحده لا في القالب. القالب يُنسخ فوق المولَّد
عند `cap:apply:android`، فأول تشغيل كان يمسحها ويُسكت إشعارات الجلسات على
أندرويد ١٣+ بلا أثر في أي سجلّ. أُعيدت إلى القالب، وأُضيف فحص تطابق يمنع تكرارها.

**التحقق — بالبناء لا بالادعاء:**

```
BUILD SUCCESSFUL (:app:assembleDebug)  +  :app:processReleaseManifest
aapt2 dump xmltree app-debug.apk:
  allowBackup=false
  dataExtractionRules=@0x7f130002
  fullBackupContent=@0x7f130000
  networkSecurityConfig=@0x7f130004
  usesCleartextTraffic=false
aapt2 dump permissions: الأذونات الأحد عشر كلها حاضرة + WAKE_LOCK من الإضافة
```

الحارس `guard:native-foundation` وُسِّع ليفرض كل ما سبق، واختُبر سلباً: حقنت
انحرافاً في الـmanifest فسقطت البوابة كما يجب.

---

## ٢. التقييم — لكل بُعد على حدة

| البُعد | الدرجة | الأساس |
|---|---|---|
| **أداء** | جيد جداً | المسار الحرج 57.8 ك.ب مضغوطاً (السقف 190). خروج آلة النسخ من إغلاق SecureStore يقلّل الإغلاق الساكن للمسار الحرج. البناء أخضر ويباً وأصلياً. |
| **نظافة** | جيد | ٥ أوراق جديدة أزالت ٥ دوائر وثلاث سلاسل مكرّرة. **لكن** ٣٦٧ وحدة ميتة و١٤ دائرة باقية. |
| **أمان** | تحسّن جوهري | انكشاف النسخ الاحتياطي أُغلق وتُحقّق منه من ثنائي الـAPK. الشبكة مقفلة على مراسي نظامية. |
| **جودة كود** | جيد | ثلاثة أعطال خطافات حقيقية أُزيلت، أحدها بفصل مكوّن لا بترقيع. |
| **موبايل** | تحسّن جوهري | صلابة البيانات وسياسة الشبكة مُثبَّتة في القالب لا في نسخة تضيع. |
| **صدق** | — | الحدود أدناه معلنة، ولم أعُدّ إخفاقاً سابقاً من إنجازي. |

---

## ٣. الحدود — ما توقّفتُ عنده ولماذا

1. **`targetSdkVersion 34`.** Google Play يشترط 35 للتطبيقات الجديدة والتحديثات
   منذ آب ٢٠٢٥ — هذا **حاجب تقديم**، لا ملاحظة. AGP 9.3.1 يدعم الرفع تقنياً بلا
   عناء، لكن أندرويد ١٥ يفرض edge-to-edge على targetSdk 35: الـWebView سيرسم
   تحت شريطَي الحالة والتنقّل. هذا تغيير بصري، والقاعدة الذهبية تمنعه بلا إذن
   صريح. **ينتظر قرارك.**

2. **`versionCode=1 / versionName=1.0`.** لا ربط بأي نظام إصدار. بند مستقل (p2-4).

3. **`SCHEDULE_EXACT_ALARM`.** مبرَّر وظيفياً (موعد جلسة)، لكن Play يطلب إقراراً
   مستقلاً وقد يرفض. قرار منتج لا أساس — لم أغيّره لأن تغييره يُضعف دقّة التذكير.

4. **دوائر الاستيراد الأربع عشرة الباقية** — سبب التأجيل في القسم ١-أ.

5. **٥ اختبارات فاشلة ليست في خط الأساس** (`criminalCalendarSyncPruning` ×4،
   `executionSearchIndex` ×1). تحقّقت أنها ليست مني: تراجعتُ عن تعديلاتي على
   طبقة التخزين مؤقتاً فأخفقت بالقدر نفسه. مصدرها أسبق، ومسجّلة في
   `.audit/newly-failing-tests-2026-08-08.txt`. **لم تُشخَّص بعد.**

6. **iOS لم يُولَّد** (`ios/` غير موجود). ما يقابل صلابة البيانات هنا —
   `NSFileProtectionComplete`، واستثناء الحاويات من نسخ iCloud/iTunes — لم
   يُفحص لأن التوليد يتطلّب macOS.

7. **الشاشة والتقاط الصورة:** `PrivacyScreen.enable=false` و
   `preventScreenshots=false`. لتطبيق يعرض إضابير موكّلين هذا قرار منتج يستحق
   مراجعة، ولم ألمسه.

---

## ٤. الموقع

**جاهز للانتقال:** نعم، لبند أساس تالٍ.
**جاهز للإطلاق:** لا — البند ١ (targetSdk) حاجب تقديم على Play.
