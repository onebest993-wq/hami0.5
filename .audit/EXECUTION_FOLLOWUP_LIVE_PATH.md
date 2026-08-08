# مسار محضر المتابعة الحي — مرجع تقني

## UI واحد (لا نسخة ثانية)

```
showUnifiedExecutionModal (Zustand)
  → ExecutionDashboardShellOverlays
  → ExecutionFollowupModalHost
  → FollowupModalStoreProvider (snapshot)
  → ExecutionFollowupModalPortal → View → Shell → TabPanels
```

`LazyExecutionFollowupModalPortal` = prefetch فقط.

## الحجز — منطق واحد

- `src/app/domain/seizure/` — محرك موحّد (منقول / عقار)
- داخل المحضر: `SeizureRequestsTab` (تبويب `seizure_requests`)
- خارج المحضر: `UnifiedSeizureLogModal` (سجل حجز من الإضبارة)

## معالجات: resident vs lazy

| Resident (Core فور فتح الإضبارة) | Lazy (جسور عند فتح المحضر/التبويب) |
|----------------------------------|-------------------------------------|
| `dossierFollowupHandlers` (admin/dossier/other) | `followupSeizureHandlers` |
| `propertyInlineSaveCtx`, `movableInlineSaveCtx` | `coerciveActionBridge`, `saveCoerciveAction` |

## بوابات التحميل

`executionHandlerClusterGate.ts` — عند `showUnifiedExecutionModal=true` تُفعَّل جسور admin/dossier/other/seizure.

## فحص جودة

```bash
node .cursor/probe-followup-stubs.mjs
node .cursor/probe-seizure-workflow.mjs
npm run audit:execution-console
```

## معيار «المحضر يعمل»

- لا toast «جاري تجهيز الأدوات»
- لا `[execution] handler still stub:` في الكونسول بعد 3s من فتح المحضر
