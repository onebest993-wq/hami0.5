# خصوصية الملف المهني (public/followers/private) غير مُنفَّذة على الخادم — **مُصلَح**

**اكتُشف:** ٩ آب ٢٠٢٦، أثناء الفحص الذري لقسم الملف الشخصي.
**الحالة:** **مُصلَح ومُختبَر** في نفس الجلسة — الخيار (أ) طُبِّق كاملاً (`private` **و** `followers` معاً، لا `private` فقط). **يبقى مفتوحاً فقط** الاكتشاف الإضافي أسفله (مسار Edge قديم مواز) الذي يحتاج تحققاً عملياتياً من الفريق، لا مزيداً من الشيفرة.

---

## الإصلاح المطبَّق (تحقّق فعلي — لا وعد)

`redactProfileKvValueForViewer` (`src/app/services/profile/profileKvReadRedact.ts`) حُوِّلت إلى `async` وصارت تفرض `pageAccess` **قبل** أي تصفية حقلية:

```56:78:src/app/services/profile/profileKvReadRedact.ts
export async function redactProfileKvValueForViewer(
    key: string,
    viewerId: string,
    value: unknown,
): Promise<unknown> {
    if (value == null) return value;
    const ownerId = parseProfileKvOwnerId(key);
    if (!ownerId) return value;
    if (ownerId === viewerId.trim()) return value;
    if (!looksLikeLawyerProfile(value)) return value;

    const pageAccess = resolveProfilePageAccess(
        normalizeProfilePageCustomization(value.customization).privacy,
    );
    const isFollowing =
        pageAccess === 'followers' ? await isViewerFollowingOwner(viewerId.trim(), ownerId) : false;

    if (!canViewProfilePage({ pageAccess, isOwner: false, isFollowing })) {
        return blockedProfileStub(value);
    }

    return redactProfileForVisitorView(value);
}
```

نقاط التصميم المتعمَّدة:
- **يُعاد استخدام** `canViewProfilePage` من `profilePageAccess.ts` — نفس منطق العميل بالضبط، لا نسخة موازية قد تنحرف عنه لاحقاً.
- **علاقة `followers` حقيقية لا مموَّهة:** `isViewerFollowingOwner` يستدعي `ForumFollowRepository.isFollowing` (جدول Supabase حقيقي `follower_id`/`following_id`)، لا قيمة ثابتة.
- **فشل مغلق (fail-closed) لا مفتوح:** أي استثناء في فحص المتابعة (شبكة، تهيئة) ⇒ `isFollowing = false` ⇒ حجب، لا سماح. هذا مُختبَر صريحاً (اختبار "فشل التحقق من المتابعة").
- `blockedProfileStub` يعيد الاسم فقط (لواجهة الحجب) — صفر هاتف/مدينة/نقابة/أقسام/كتل مخصّصة لأي ملف `private` أو `followers`-غير-متابَع.
- `route.ts` حُدِّث لـ`await` النتيجة (كانت التوقيع القديم يُعيد Promise غير مُنتظَر بصمت — خطأ كان سيُسقِط الحماية كلياً لو نُشر بلا هذا التصحيح).

**التغطية الاختبارية** (`profileKvReadRedact.test.ts`، ٩ اختبارات، ناجحة فعلياً الآن): مالك يقرأ نفسه (لا فحص متابعة)، زائر/public، `pageAccess` غير معرَّف (افتراضي public)، زائر/private (حجب كامل)، زائر/followers غير متابع (حجب)، زائر/followers متابع فعلاً (سماح + تصفية حقلية)، فشل شبكة أثناء فحص المتابعة (حجب)، مفتاح غير متعلّق بالملف (تمرير كما هو).

---

## ما كانت عليه المشكلة (سجل تاريخي — للتوثيق، ليست الحالة الحالية)

المحامي يضبط ظهور صفحته المهنية من الاستوديو عبر ثلاث حالات: `public` (عام) / `followers` (متابعون فقط) / `private` (خاص) — هذا هو الـ«سيجيل» الذي يظهر أعلى الصفحة (`ProfilePageAccessControl`) وتحدّده `ProfilePagePrivacySettings.pageAccess`.

**كان هذا الضبط تصميميّاً فقط.** لم يوجد مكان في الخادم يرفض قراءة `profile:<userId>` بسبب `pageAccess` — إلى أن أُضيف الفرض الصريح في `redactProfileKvValueForViewer` (موصوف أعلاه).

### السلسلة الأصلية قبل الإصلاح (توثيق الخلل كما كان)

```12:16:src/app/security/kvProxyKeyOwnership.ts
if (op === 'read') {
    // ...
    /** ملف مهني — قراءة عامة لأي محامٍ مصادق؛ الكتابة تبقى للمالك فقط */
    if (k.startsWith('profile:')) return true;
}
```

هذه الدالة (`isKeyOwnedBy`) هي حارس القراءة الوحيد في نقطة الدخول:

```src/app/api/kv-proxy/route.ts
if (action === 'get') {
  if (typeof payload.key !== 'string' || !isKeyOwnedBy(payload.key, userId, 'read')) {
    return wifeJsonResponse(403, { ok: false, error: 'Forbidden: key not readable by current user' });
  }
  let value = await kvGet(payload.key);
  return wifeJsonResponse(200, {
    ok: true,
    value: redactProfileKvValueForViewer(payload.key, userId, value), // ← كانت بلا await أيضاً؛ نتيجتها الفعلية كانت Promise غير مُطبَّق (كائن، لا بيانات محجوبة)
  });
}
```

`payload.key` قادم من جسم الطلب — أي **من العميل مباشرة**. `redactProfileKvValueForViewer` كانت تُطبِّق فقط تبديلات الحقول الدقيقة (`showPhoneMeta`, `showGallery`, `hiddenContactIds`, ...) من `ProfilePagePrivacySettings`، ولا تعرف عن `pageAccess` شيئاً — لا يوجد فرع `if (pageAccess === 'private' && viewer !== owner) return null`.

**أثر الخلل كما كان:** أي مستخدم مصادَق (`userId` صالح فقط — لا شرط علاقة متابعة أو ملكية) كان يستطيع استدعاء `kv-proxy` مباشرة بـ`{ action: 'get', key: 'profile:<أي-معرّف-محامٍ>' }` ويحصل على كامل بيانات الملف (بعد تبديلات الحقول فقط)، **بصرف النظر عن كون الصفحة `private` أو `followers`.** واجهة العرض (`useProfileLoader` / فحص العميل) كانت تمنع الظهور في الواجهة فقط، لا في البيانات — أي طلب HTTP مباشر (curl، DevTools، سكربت) كان يتخطّاها بالكامل. **هذا أُغلق الآن** بالفرض الخادمي الموصوف في رأس الملف.

## لماذا كان هذا فرقاً حقيقياً لا نظرياً

- الإعداد الافتراضي `DEFAULT_PROFILE_PRIVACY.pageAccess = 'public'` (`src/app/services/profile/profilePageCatalog.ts`) — فمعظم الملفات عامة بالفعل ولا ضرر إضافي فيها.
- **لكن** المحامي الذي يُحوّل صفحته إلى `private` أو `followers` يفترض — والواجهة تُوهمه — أن البيانات محجوبة عن غير المخوَّلين. كان هذا وعدٌ لا يتحقّق على الخادم. من يعرف `userId` الضحية (قابل للتخمين إن كان تسلسلياً، أو مرئياً في أي مكان آخر بالتطبيق كسجل قضية مشتركة أو رسالة منتدى) كان يقرأ ملفه الخاص كاملاً.
- هذا لم يكن تسريب حقول حساسة كأرقام بطاقات — لكنه كان **كسراً مباشراً لعقد خصوصية صريح يعرضه التطبيق للمستخدم كخيار فعّال** (public/followers/private)، وهو بالتحديد نوع الثغرة التي تُصنَّف Broken Access Control (IDOR-style) — التحقق من الصلاحية كان غائباً على مستوى البيانات، موجوداً فقط على مستوى الواجهة.

## لماذا لم يكن الإصلاح سطراً واحداً — وكيف حُسِم القرار

الإصلاح الصحيح لم يكن سطراً واحداً؛ احتاج قراراً بنيوياً في `isKeyOwnedBy` أو في طبقة أعلى منها:

1. `isKeyOwnedBy` تعمل بمفتاح نصّي فقط (`k.startsWith('profile:')`) — لا ترى `pageAccess` لأنها لا تقرأ قيمة الملف، فقط اسم المفتاح. **القرار المتّخذ:** تُرك `isKeyOwnedBy` كما هي (حارس خشن على مستوى المفتاح)، ونُقل قرار `pageAccess` الدقيق إلى `redactProfileKvValueForViewer` في `route.ts` بعد `kvGet` — هذا الخيار (أ) في الجدول أدناه.
2. علاقة `followers` تحتاج مصدر حقيقة عن المتابعين — **تحقّق أكّد وجوده فعلياً:** `src/app/services/forum/forumFollowRepository.ts` يقرأ/يكتب عبر `FollowDB` (`lawyerCommunityCloud.ts`) بجدول حقيقي بأعمدة `follower_id`/`following_id`، ومتاح من سياق خادم عبر `loadForumSupabaseAdmin`. **هذا يعني أن غياب مصدر بيانات "المتابعين" لم يكن عائقاً فعلياً** — فطُبِّق الخيار (أ) كاملاً (`private` + `followers` معاً)، لا `private` فقط كما اقتُرح ابتدائياً بتحفّظ.
3. التغيير غطّى كل مصفوفة السيناريوهات فعلياً (owner يقرأ نفسه، زائر على public، زائر على private، متابع فعلي على followers، غير متابع على followers، فشل شبكة أثناء الفحص) بـ٩ اختبارات ناجحة قبل اعتبار الإصلاح مغلقاً — لا تعديل عابر بلا تحقّق.

## الخيارات التي طُرحت — والقرار النهائي

| الخيار | الوصف | الحالة |
|---|---|---|
| **أ. فرض `pageAccess` في `route.ts` بعد `kvGet`** | اقرأ القيمة، افحص `customization.privacy.pageAccess`، وإن لم يُسمَح بالعرض (`private`, أو `followers` بلا متابعة) → أعِد `blockedProfileStub` بدل البيانات. لـ`followers` — استعلام علاقة متابعة حقيقي من `ForumFollowRepository` | **✅ نُفِّذ واختُبر — هذا هو الإصلاح الحالي في المستودع** |
| ب. نقل القرار إلى `isKeyOwnedBy` بتمرير القيمة | أعمّ لكل مفاتيح KV المشابهة مستقبلاً، لكن يغيّر عقد الدالة في كل مكان تُستدعى منه | لم يُختَر — الكلفة أعلى بلا فائدة إضافية لنطاق هذا القسم |
| ج. توثيق الخطر فقط والقبول المؤقت | كان يعني تراجعاً عن وعد صريح للمستخدم (خيار "خصوصية" فعّال في الواجهة) | لم يُختَر — غير مقبول أخلاقياً وأمنياً مع وجود إصلاح عملي متاح |

## اكتشاف إضافي أثناء التنفيذ — مسار Edge قديم مواز

أثناء تطبيق الإصلاح، تتبّع الاستيرادات كشف أن `isKeyOwnedBy` له **نسخة ثانية مُولَّدة يدوياً** في `supabase/functions/server/kvProxyKeyOwnership.ts` (يحمل تعليق `@generated — do not edit. Source: src/app/security/kvProxyKeyOwnership.ts`)، تُستهلَك في مسار Edge Function قديم: `supabase/functions/server/index.tsx` على `POST /make-server-f09713ba/kv-proxy`.

**هذا المسار القديم أخطر من الثغرة الأصلية بمرحلة كاملة:** لا يستدعي أي دالة redaction إطلاقاً — لا `pageAccess`، ولا حتى تصفية الحقول الجزئية (`showPhoneMeta`...) التي كانت موجودة قبل إصلاحي. القراءة تعيد قيمة KV الخام كاملة (`result = await kv.get(key);`) لأي مستخدم مصادَق يملك JWT صالح.

الفريق نفسه يعرف هذا ووضع بوابة إيقاف. **تحديث ١٣ آب ٢٠٢٦:** المسار أصبح **fail-closed في الشيفرة** — أي قيمة غير `WIFE_DISABLE_EDGE_KV_PROXY=false` تعيد `410 Gone` فوراً (بما فيها السرّ غير المضبوط). `.env.production.example` يوصي بـ`true` لوضوح العمليات، و`scripts/wife-production-gate.mjs` يفشل حاجزاً إن كانت `=false` في الإنتاج، ويحتوي فاحصاً حيّاً (`--live`) يتأكد من `410` ما لم يُفعَّل الـopt-in الطارئ.

**ما لم يُغلق من المستودع وحده:** نشر دالة Edge المحدَّثة على مشروع Supabase الفعلي. أسرار/نشرات Edge تُدار خارج ملفات هذا المستودع — بعد `supabase functions deploy` (أو مسار النشر المعتمد) يصبح السلوك fail-closed على الإنتاج حتى بدون السرّ.

**الإجراء المطلوب من طرفكم (Ops):**
1. نشر Edge Function المحدَّثة (fail-closed) ثم تشغيل `node scripts/wife-production-gate.mjs --live` والتأكد من `410`.
2. الإبقاء على `WIFE_DISABLE_EDGE_KV_PROXY=true` في أسرار الإنتاج لوضوح العمليات (السلوك نفسه إن تُرك unset بعد النشر).
3. عدم ضبط `=false` إلا لتشخيص طارئ مؤقت.

**حدّ الشيفرة داخل المستودع على هذه الثغرة مُغلَق** (`/api/kv-proxy` + fail-closed Edge). الباقي نشر تشغيلي لا يمكن إثباته من فحص الملفات المحلية وحدها.
