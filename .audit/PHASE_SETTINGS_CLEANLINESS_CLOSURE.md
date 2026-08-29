# إغلاق نظافة قسم الإعدادات — 2026-08-12

## ما أُنجز

### الجولة 1
| إجراء | الموقع |
|--------|--------|
| حذف `SliderRow` + إخفاء `SETTING_GLASS` / `SETTING_ROW_BORDER` | `settings-ui.tsx` |
| حذف husk `useAppearancePatternControls` | حذف الملف + `useAppearanceSection.ts` |
| إزالة تكرار `themeToken` | theme controls + `AppearanceSection` |
| مخلفات nav / hollow helpers / dock aliases / CSS مكرر / `homeSections.ts` | خدمات settings + FX |

### الجولة 2 (إكمال النقص)
| إجراء | الموقع |
|--------|--------|
| حذف خرائط تسمية ميتة (size/shape/pattern) + إخفاء scroll/dock labels الداخلية | `homeBlockLabels.ts` |
| حذف 8 دوال مقياس dock/forum ميتة | `homeBlockScale.ts` |
| حذف ORDER defaults / ACCENT / `moveOrderItem` + إخفاء IDS | `homeLayout.ts` |
| حذف `DOCK_ONLY_WIDGETS` + إخفاء `DOCK_SHELL_WIDGET_IDS` / `RepositoryLegacyWidgetId` | `homeWidgetPlacements.ts` |
| حذف `resolveHomeBlockShapeClass` / glassDecor / resizeMin / `adaptWidgetStyleForZoneChange` + إخفاء helpers داخلية | `resolveHomeBlockStyle.ts` |
| حذف `isLocalAutoSaveEnabled` / `pushNotificationOptionsFromSettings` + إخفاء prefetch | `settingsRuntime.ts` |
| حذف `LAWYER_LIGHT_*` الميت + إخفاء ثوابت opacity الداخلية | `surfaceAppearance.ts` |
| إزالة re-export `dockShellLabel` الميت | `dockShellLayout.ts` |
| إزالة barrel re-export من `useAppearanceSection` | appearance |
| إخفاء `SETTINGS_SECTION_ORDER` | `SettingsShell.tsx` |
| إخفاء `applyWallpaperSurfaceVars` / font scale / `WALLPAPER_EXPORT_WIDTH` / `BackgroundPresetDef` | apply / wallpaper / presets |
| توحيد `hexToRgba` عبر `glassSurfacePaint` | `settingsShellStyle.ts` |

## التحقق

- Vitest: `HamiSettings` + `services/settings/__tests__` → **79 ملف / 241 اختبار — نجاح**
- خط أساس dead-exports: أُزيلت ~67+ أسماء إعدادات ميتة عبر الجولتين

## التقييم (نظافة — بصدق)

| البُعد | درجة | ملاحظة |
|--------|------|--------|
| نظافة | **9.5/10** | لا مخلفات SAFE_TO_DELETE مؤكَّدة متبقية في نطاق الإعدادات؛ `*Props` تُترك كعقود |
| أداء | لم يُقصَد | — |
| أمان | بلا تغيير سطح | — |
| جودة كود | **8.5/10** | أقل تصدير عام؛ مسار shell/style أنظف |
| موبايل | بلا تغيير بصري | — |
| صدق | — | انظر الحدود |

## الحدود / ما بقي عمداً

1. **تصديرات `*Props`/أنواع عقود** في HamiSettings — الحارس يراها ميتة؛ حذفها يضرّ TypeScript للمستهلكين.
2. **`preloadAllSettingsSectionComponents`** حيّ — لم يُبسَّط.
3. **`guard:dead-exports` للمستودع** يفشل على **17 اسماً خارج الإعدادات** (Profile / Notifications / lucide / admin) — خارج نطاق هذا القسم.
4. لا إعادة تصميم UI.

## جاهز للانتقال؟

**نعم** — نظافة قسم الإعدادات مغلقة بأقصى ما يمكن الآن داخل النطاق.
