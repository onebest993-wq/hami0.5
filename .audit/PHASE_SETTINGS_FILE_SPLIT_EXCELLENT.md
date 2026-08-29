# تقسيم ملفات مركز الإعدادات — إغلاق 2026-08-13 (جولة ممتاز)

**النطاق:** جودة التقسيم داخل مركز الإعدادات + مزوّد إعدادات المحامي. بلا تغيير بصري/سلوكي مقصود.  
**الحكم:** التقسيم **ممتاز**: كل ملف مختلط فُصل إلى اهتمام واحد. الملفات الأطول المتبقية إما بيانات أو تركيب نموذج واحد أو آلة واحدة.

---

## معيار «ممتاز» المعتمد

- ملف JSX لا يحتوي مسار أعمال (تصدير، مسح، بيومتري، مزامنة سحابية).
- خطاف المنسّق لا يحتوي جسم التدفق الطويل — يستدعي وحدة التدفق.
- المزوّد منسّق رفيع: إماهة + آثار + واجهة إجراءات + شرائح.
- لا تقطيع إلى ملفات 15 سطراً لصف واحد داخل نفس النموذج.

---

## ما أُنجز في هذه الجولة (بعد مراجعة «جيد ≠ ممتاز»)

| المختلط | الفصل |
|---------|--------|
| `useDataSyncCard` | حالة البطاقة + `dataCloudSyncToggle` |
| `useAppearanceBlockCustomize` | اختيار + `appearanceBlockEffective` + setters |
| لوحة التخصيص | Picker + `AppearanceBlockStyleControls` |
| `useBusinessBackup` | `useBusinessBackupSelection` + معاينة/استيراد/تصدير |
| `useSettingsPatches` | `settingsPatchApply` + `useSettingsHomeLayoutPatches` |
| آثار المزوّد | persist/broadcast + DOM sync + security bindings |
| المسح | `useWipeCountdown` + تأكيد المسح |
| وثيقة الحساب | Sheet + Header + Body |
| InstantShell | هيكل + Header (أيقونات cold) |
| `Segmented` / `SelectRow` | ملفان |
| `useWallpaperEditorSession` | paint + drag/zoom |
| الأمن | `securitySectionToggles` + خطاف التلميح |
| المزوّد | `useLawyerSettingsActionApi` (~95 سطر منسّق) |
| Host | `useHamiSettingsHostModule` |
| خطافات السياق | `lawyerSettingsDevFallback` |

---

## الإثبات

```
npm run gate:settings
  98 ملفات / 328 اختبار — PASSED
vitest honesty (open snappiness + surgical close + perceived boot + wave7m)
  21 اختبار — PASSED
```

---

## التقييم بالأبعاد

| البُعد | الدرجة | السبب |
|--------|--------|--------|
| أداء | **8/10** | لا تغيير مسار فتح مقصود. بلا إعادة قياس dist / E2E |
| نظافة | **9.5/10** | لا ملف مختلط منطق+JSX ضخم. أطول تركيب: StyleControls 194 (نموذج واحد) |
| أمان | **8/10** | التدفقات نُقلت حرفياً؛ الاختبارات تغطيها |
| جودة كود | **9.5/10** | اهتمام واحد لكل ملف في المواضع المختلطة |
| موبايل | **8.5/10** | لم يُمسّ اللمس/safe-area عن قصد |
| صدق | **9.5/10** | E2E غير مُعاد؛ dist غير مُقاس بعد التقسيم |

**المجموع الواقعي:** ~9/10 على التقسيم.

---

## ما يبقى عمداً فوق ~140 سطراً (ليس نقص تقسيم)

| ملف | أسطر | لماذا يبقى |
|-----|------:|------------|
| `AppearanceBlockStyleControls` | ~194 | نموذج تخصيص واحد — تقطيع الصفوف يضر |
| `accountLegalContent` | 162 | نص الوثيقة القانونية |
| `useDataSyncCard` | ~163 | منسّق البطاقة بعد استخراج تدفق السحابة |
| `useSettingsShellFocusTrap` | 143 | آلة تركيز/رجوع واحدة |
| `useAppearanceWallpaperControls` | ~130 | جلسة خلفية واحدة |

---

## الحدود

1. **E2E غير مُعاد** بعد التقسيم.
2. **لا إعادة `build:e2e`**.
3. التبويبات الأربعة تبقى sync عمداً.

---

## جاهز للانتقال؟

**نعم من جهة تقسيم الملفات/المكوّنات.** لا جولة تقسيم ثالثة داخل نفس القسم إلا بطلب صريح لتقطيع نموذج التخصيص نفسه.
