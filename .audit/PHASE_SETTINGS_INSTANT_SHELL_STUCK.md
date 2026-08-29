# مركز الإعدادات — إصلاح زر الترس (2026-08-13)

## السبب
جعل `LawyerDashboardSettingsOverlayEntry` sync داخل `MainView` سحب مركز الإعدادات كاملاً إلى جذع اللوحة. تحميل FullOrchestration/MainView تثاقَل أو علق؛ زر الترس بدا ميتاً (خصوصاً أثناء HomeFirstPaint).

## العقد الصحيح
1. **MainView**: Entry كسول + `Suspense` + `SettingsInstantShell` قشرة مؤقتة.
2. **Host**: محتوى `HamiSettingsApp` sync داخل مقطع البوابة — بلا hop `import()` ثانٍ.
3. **InstantShell**: `createPortal(document.body)` + `pointer-events-auto` حتى يعمل فوق غطاء MainView inert.
4. **فتح**: `prefetchSettingsOverlayEntry()` فوراً في `commitSettingsShellOpen`.
5. **CSS**: لا تُعطّل `--snap` الظاهرة عبر `html:not([data-hami-settings-open])`.

`npm run gate:settings` بعد الإصلاح.
