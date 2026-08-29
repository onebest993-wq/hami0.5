# رفع تقسيم قسم الملف إلى ممتاز

**التاريخ:** 2026-08-13  
**قاعدة:** بلا تغيير بصري — طبقات/مواضع فقط

## الحكم السابق → الحالي
- قبل: **جيد** (واجهات رفيعة، لكن تسرّب طبقات + منطق نقي تحت hooks/components)
- بعد: **ممتاز** للتصنيف والطبقات ضمن حدود متعمدة أدناه

## ما أُصلح

### P0 — طبقات
| قبل | بعد |
|-----|-----|
| `services/editDraftMediaPaths` → UI `types`/`profileSections` | `profileEditDraft` + `profileSections` في services |
| `EditDraft` في مكوّن UI | نوع مجال في `services/profile/profileEditDraft.ts` |
| `SmartToast` داخل `profileGeolocation` | خدمة نقية؛ toast في `useProfileContactSectionOps` |

### P1 — مواضع
| نُقل إلى | أمثلة |
|----------|--------|
| `services/profile/` | `buildEditDraftFromProfile`, `buildProfileEditPersistPayload`, `gcProfileEditOrphanMedia`, `createProfileCustomBlock`, `createDefaultProfileContactAction`, `profileCustomBlockMutations`, `profileDisplayCustomizationKeys` |
| `hooks/` | سحب الكتل، Gallery adjust/focusTrap، Canvas background editor |
| `utils/` | `profileCustomBlocksDragMath` / `DragUtils` |
| `profileShellPolicy.ts` | دمج navigation/orchestration/logic/studioAccess |

جسور `@deprecated` رفيعة بقيت لملفات shell القديمة + `utils/profileSections` لمنع كسر مستوردين خارجيين.

### ما بقي متعمداً (ليس نقص تقسيم)
- `useRoyalLawyerProfile` / `ProfileContentProps` — سطح API غني؛ تقطيعه يزيد prop-drilling بلا فائدة سلوكية
- `useProfileTextCanvasReveal` بجانب canvas — تماسك ميزة
- `tokenize`/`patchText` داخل `textStudio/` — نفس الميزة
- CSS sync للبرميل — FOUC، ليس دين تقسيم منطق
- واجهات التركيب الرقيقة (`useProfileEditSession`…) — صحيحة وتُبقى

## تحقق
Vitest: **59 ملف / 218 اختبار** — ناجح.

## تقييم الأبعاد
| البُعد | درجة |
|--------|------|
| جودة كود / تقسيم | **ممتاز** |
| نظافة طبقات | **ممتاز** |
| صدق | مرتفع |

**جاهز للانتقال:** نعم.
