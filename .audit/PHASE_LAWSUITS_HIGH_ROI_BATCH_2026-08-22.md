# تقرير إغلاق — دفعة عالية الفائدة (E2E / migration / perf / bundle)

**تاريخ:** 2026-08-22  
**نطاق:** قسم الدعاوى — استقرار + أمان إنتاج + قياس أداء  
**لا commit.**

---

## الخلاصة

| # | البند | الحالة |
|---|--------|--------|
| 1 | migration ملكية CaseShare الجزائية | **مُطبَّق على Supabase** (`hami 0.5`) |
| 2 | E2E CI | **جزئي أخضر** — smoke + procedural كاملان؛ بقايا personal/scenarios/criminal |
| 3 | soak جهاز | checklist فقط — بلا `DEVICE_SOAK_URL` |
| 4 | سحابة حية | لم تُشغَّل (`E2E_LAWSUIT_CLOUD_LIVE` غير مفعّل) |
| 5 | TTFI أرشيف→إضبارة | **قِيس** — ~2.5s إجمالي سطح مكتب |
| 6 | vendor-pdf soft warn | **أُزيل الضوضاء** (استثناء `vendor-*`) |
| 7 | تصميم إضافي | **لم يُفتح** (عائد منخفض) |

---

## 1) Migration — `criminal_case_ownership`

- مشروع: `wldjvjnodvyodmgbgzab` (hami 0.5)
- نسخة مسجّلة: `20260821213130_criminal_case_ownership`
- جدول + RLS (SELECT/INSERT/UPDATE/DELETE للمالك)
- دالة `wipe_user_application_data` غير موجودة بهذا الاسم على المشروع — لم تُستبدل (لا حاجة لكسر wipe غير موجود)

**أثر أمني حقيقي:** إثبات ملكية جزائية على الخادم مفعّل.

---

## 2) E2E + soak + cloud

### إصلاحات شُحنت
- استعادة `placeholder` في `PartyCard` (كان يكسر تعبئة الأطراف)
- assert عبر `toContainText` (PartyChip overflow → «hidden» في Playwright)
- جسر `__hamiE2eSecureStore` لقراءة الملفات المشفّرة في preview
- harden `openCivilDossier` / `openLawsuitsWorkspace`
- CI: تشغيل ملف مواصفات واحد + إحياء preview بين الملفات

### نتيجة آخر تشغيل (صادق)

| ملف | نتيجة |
|-----|--------|
| `civil-lawsuit-smoke` | **3/3 passed** |
| `civil-lawsuit-procedural` | **3/3 passed** |
| `civil-lawsuit-new-case` | 2 passed / 2 failed (مسار أحوال شخصية + flaky FAB) |
| `civil-lawsuit-scenarios` | ~2 passed / أغلبية فشل (فتح نموذج / فروع) |
| `criminal-dossier-open` | 0/3 (بطاقة الجزائي غير ظاهرة — زرع/تبويب) |

**قبل الدفعة:** غالباً فشل بوابة/اتصال preview.  
**الآن:** المسار الحرج (أرشيف ↔ إضبارة ↔ مهام) أخضر مستقر.

### soak / cloud
- soak: يحتاج جهاز + `DEVICE_SOAK_URL`
- cloud: يحتاج `E2E_LAWSUIT_CLOUD_LIVE=1` صراحةً

---

## 3) أداء مدرك (قياس)

`npm run perf:lawsuits-dossier-ttfi -- --preview --samples=2`

| مقياس | متوسط تقريبي |
|--------|----------------|
| navigationMs | ~129 |
| hub→archive | ~398 |
| archive shell | ~5 |
| dossier open | ~663 |
| **totalMs** | **~2525** |

**تفسير:** لا بطء شبكة/hydrate كارثي على سطح المكتب؛ فتح الإضبارة ~0.3–1s. عنق الزجاجة إن وُجد سيكون على جهاز/4G (soak) أو تبويب جزائي/تنفيذ ثقيل لاحقاً.

تقرير: `perf-reports/lawsuits-dossier-ttfi.json`  
إصلاح جانبي: حذف `import type` من `scripts/perf-cdp-throttle.mjs` (كان يكسر Node ESM).

---

## 4) الحجم

- critical-path: **~77 KB gzip** (تحت هدف 120)
- soft warn لـ `vendor-pdf`: مُستثنى من تحذير `vendor-*` — الـ chunk lazy عبر vault؛ الحد الصارم 520 ما زال يمر

---

## 5) تصميم

لم تُنفَّذ موجة تخفيف بصرية إضافية — لا شاشة مسمّاة بثقل GPU بعد lite السابق؛ العائد منخفض مقابل استقرار E2E.

---

## تقييم الأبعاد

| البُعد | درجة | صدق |
|--------|------|------|
| أداء | 8.5/10 | TTFI مكتوب؛ لا Lighthouse كامل على تبويب جزائي |
| نظافة | 8/10 | جسر E2E + fixtures؛ بقايا سيناريوهات حمراء |
| أمان | 9.5/10 | ownership مفعّل في الإنتاج |
| جودة كود | 8.5/10 | إصلاحات مركّزة |
| موبايل | 7/10 | soak يدوي معلّق |
| صدق | 9.5/10 | E2E ليس أخضر بالكامل — مُعلن |

**جاهز للانتقال؟**  
- نعم لـ: أمان الملكية + ثقة مسار smoke/procedural + قياس TTFI.  
- لا كإغلاق «E2E CI أخضر 100%» — يتبقى أحوال شخصية / scenarios FAB / جزائي.

---

## ما لم يُنفَّذ صراحةً

1. تشغيل cloud live
2. soak على جهاز حقيقي
3. Lighthouse mobile كامل على تبويب جزائي/تنفيذ
4. تقليص حجم vendor-pdf نفسه (خارج تقشير التطبيق)
5. إكمال خضرة كل مواصفات scenarios/criminal
