# إغلاق شريحة — leftover مقاطع الدعاوى / المشاركة / الحفظ المحلي

**التاريخ:** ٢٩ آب ٢٠٢٦  
**النطاق:** ترحيل مرآة `localStorage` الصريحة على مسارات أسرار المحامي التي كانت ما زالت `getItemSync` عارية، مع عزل محلي (بلا `ensurePersistedReady` على مشاركة القضايا).  
**ليس إغلاق الأساس.** ليس إعادة كتابة سداسية. ليس تشفير خلفية المحامي. ليس `strict: true`. ليس تقسيم InnerRuntime.

---

## ما أُنجز

1. **مقاطع الدعاوى** (`lawsuitSegmentPersist`)  
   القراءة عبر `readSecureOrDrainLegacySync`. بعد الكتابة الناجحة تُمحى مرآة المفتاح. أصل unread لا يُسمَّم.

2. **بوابة المتانة + تثبيت القرص** (`lawsuitDurabilityGate`, `lawsuitPersistFlush`, تشخيص `lawsuitWorkspaceRecovery`)  
   ذاكرة المقطع/الفهرس ترحّل leftover ثم تُعيد الكتابة إلى IndexedDB عند التثبيت. leftover وحده **لا** يُعدّ إثبات قرص في `verifyLawsuitActiveFileOnDiskSync` (قاعدة المعلّق الذهبية تبقى على `getItemFromDisk`).

3. **حارس المسح في المستودع** (`LocalStorageRepository.save`)  
   leftover يُرى قبل كتابة فارغة؛ لا يُمرَّر تفريغ فوق قائمة أغنى كانت في LS فقط.

4. **مشاركة القضايا**  
   `caseSharePeekLite` كان يقرأ LS عند `getItemSync` فارغ **حتى فوق أصل unread** — أُغلق. المخزن المحلي لم يعد ينتظر `ensurePersistedReady` (عزل: `getItem`/`setItem` لهذا المفتاح فقط).

5. **جسر الملاحظات، فهرس بحث التنفيذ، كتالوج المشاركة، معاملات التقويم، طابور مزامنة الإضبارة، autosave بعد الاستيراد، إشعارات المنتدى التراثية.**

---

## تحقق

| الطبقة | النتيجة |
|--------|---------|
| Vitest (مقاطع leftover / unread / مشاركة leftover / جسر ملاحظات / مستودع حارس / isolation honesty / متانة / autosave / بحث تنفيذ) | ناجح |
| `guard:cycles` | 0 مجموعات جديدة |
| `guard:dead-modules` | 0 |

---

## التقييم

| البُعد | درجة | ملاحظة |
|--------|------|--------|
| أداء | جيد مع سقف | drain عند فتح/حفظ الدعاوى لا على ستارة FullBoot. مشاركة القضايا لم تعد تنتظر تسخين الجزائي/المنتدى. |
| نظافة | جيد | مسار LS غير الآمن في peek المشاركة حُذف. |
| أمان | جيد مع سقوف | أسماء الدعاوى/المشاركات في leftover تُرحَّل عند القراءة أو تُرفض فوق unread. إثبات القرص لا يُزوَّر من LS. |
| جودة كود | جيد | نفس المساعد unread-safe؛ لا غلاف `getItemSync` عام. |
| موبايل | غير ممسوس بصرياً | لا UI. لم يُقَس TTFI على جهاز. |

---

## الحدود — ما لم يُغلق

- خلفية المحامي `NEVER_ENCRYPT`؛ ستارة الكمّ leftover حتى التحميل؛ `globalSearchRecentsPeekLite` LS عمداً لأوّل إطار.
- `verifyLawsuitActiveFileOnDiskSync` يبقى `getItemSync` — leftover ≠ IndexedDB.
- `HamiStorage.secure.getItemSync` غلاف عام — لم يُحوَّل.
- شواهد القبر unread = fail-open. `deletedIdsLiteStore` ما زال يقرأ LS ثم يُصفّر عبر الجسر (بلا SecureStore في الوحدة).
- أعلام صغيرة في LS: تقويم cloud-disabled، ضيف/تطوير، شروط، معدل المنتدى، دبابيس القوانين، Frame-1.
- المونولث الجزائي `hami:criminal:store` لا يمرّ drain مشفِّر.
- InnerRuntime: جزائي + منتدى أوزان متزامنة. TTFI هاتف ~٨–١١ ث غير مقيس هذه الجلسة.
- KYC غير مُسخَّن عند الإقلاع.
- الأساس غير أخضر.

**جاهز للانتقال داخل leftover:** نعم لهذه الشريحة.  
**جاهز لإعلان المنتج مكتملاً:** لا.
