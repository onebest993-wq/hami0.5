# غطاء الإقلاع لا يرتفع إلا بالهوية، والهوية محبوسة خلف ارتفاعه

> **قيس:** ٢٠٢٦-٠٩-١١ · **الفرع:** `fix/production-hardening` · **الحالة:** جذرٌ مُسمّى
> بدليل تنفيذيّ، **ولم يُصلَح** — لأنّ إصلاحه يغيّر عقداً يحرسه اختبارٌ متعمَّد.

---

## ١ — العَرَض الذي قاد إليه

ثلاث عشرة مواصفة E2E حمراء على سطح المنزل، **موروثة** (تسقط نفسها بالضبط على
`HEAD` بعد إرجاع كل تغييرات اليوم وإعادة البناء — قيس، لم يُفترض):

| المواصفة | الحمراء |
|---|---|
| `e2e/home-hub-card.spec.ts` | ١٠ من ١٠ |
| `e2e/home-main-interface.spec.ts:104` | ١ |
| `e2e/lawyer-profile-z-forum-visitor.spec.ts` | ٢ |

وسجلّ Playwright يقول السبب حرفياً، لا استنتاجاً:

```
- element is visible, enabled and stable
- scrolling into view if needed → done scrolling
- <div aria-hidden="true" id="hami-static-boot" data-hami-phase="splash"
       data-hami-boot-mode="silent-canvas"> intercepts pointer events
- retrying click action … (167 محاولة حتى انتهاء المهلة)
```

اللوحة **مرئية ومفعَّلة ومستقرّة** خلف غطاء الإقلاع، والغطاء يبتلع كل نقرة.

---

## ٢ — القياس: أيّ شرطٍ لا يتحقّق

مسبار قرائيّ (حُذف بعد القياس) على نفس حالة المواصفة الفارغة، عند ٠ و٥ و١٢ و**٢٢** ثانية:

```json
{"shellPresent":true,"shellPhase":"splash","shellPointerEvents":"auto","shellZIndex":"99990",
 "gridPainted":false,"bootRevealDone":false,
 "c2_firstPaintLayer":0,"c3_widgetSkeletons":0,
 "c4_slots":8,"c4_emptySlots":0,"c4_skeletonSlots":0,
 "c5_hubArchiveTiles":3,"c5_homeDockTiles":3,
 "c6_hubState":"empty","c6_hubSettling":"0","c6_fullyEmpty":1,
 "c7_identitySettled":"0"}
```

السطح مكتمل بكل معيار: ثماني فتحات مملوءة بلا هيكل، ثلاث بلاطات حية، بطاقة المركز
مستقرّة في حالتها الفارغة. **يبقى شرطٌ واحد** —
[`bootWorthySurface.ts:112`](../src/app/bootstrap/bootWorthySurface.ts) —
`data-identity-settled !== '1'` ⇐ **يُبطل الحكم كلّه**، إلى الأبد.

والغطاء عند `z-index: 99990` و`pointer-events: auto`.

---

## ٣ — الجذر: حلقة مغلقة، ومخرجٌ واحد خارجها

```
ForumTileProfileQuarterSlot:55   الربعُ الحيّ لا يُركَّب إلا بعد HOME_MAIN_GRID_PAINTED
        ↓ فيبقى الاحتياط، و identitySettled = Boolean(chrome.isLoaded)
bootWorthySurface:112            و HOME_MAIN_GRID_PAINTED لا يُعلَن حتى identitySettled = '1'
        ↑___________________________________________________________________|
```

**وكلّ مخارج رفع الغطاء الأربعة تمرّ بالشرط نفسه:**

| المخرج | الموضع | يشترط الهوية؟ |
|---|---|---|
| المسار السعيد | `homeMainGridPaintAnnounce.ts:34` `isHomeGridRevealReady` | نعم — مرّتين (`readIdentityChromeReady()` و`data-identity-settled`) |
| سقف ٢٤٠ إطاراً | `:121` `canUncoverLiveHubAfterPaintBudget` | نعم — يستدعي `isHomeGridRevealReady` نفسها. والتعليق يقولها: «نفس عقد الكشف الذهبي» |
| مراقب DOM | `homeMainGridPaintGate.ts:142` `canAnnounceHappyPathUncover` | نعم |
| فتيل ٨ ثوانٍ | `:109` | نعم — `canAnnounceHappyPathUncover() ‖ isWorthyBootSurface() ‖ hasAuthGateSurface()` |

**فلا مخرج غير مشروط.** والفتيل الذي وُصف بأنه «فتيل أمان للتعليق» مشروطٌ بالحكم
الذي يمنعه أصلاً — **ولا يُعاد تسليحه**. فإن أخطأ الحكم مرّةً، بقي الغطاء ما بقيت الجلسة.

**والمخرج الوحيد خارج الحلقة** هو `chrome.isLoaded`، وهو
[`useLawyerProfileHeader.ts:62`](../src/app/hooks/useLawyerProfileHeader.ts):

```ts
const pending = isLawyerProfileBootWarmPending() || isLawyerProfileLocalUnread(userId);
mergeUserIdentityUiState({ …, isLoaded: !pending });
```

---

## ٣·١ — الشاهد السببيّ: رفعُ الغطاء وحده يقلب النتيجة

مسبار ثانٍ (حُذف بعده) نفّذ **النقرة نفسها على العنصر نفسه** مرّتين، بينهما إعلانُ
الطلاء بالحدث نفسه الذي تُصدره البوّابة — بلا مسّ شفرة منتج:

```
PROBE_BEFORE          CLICK_FAILED: locator.click: Timeout 6000ms exceeded
PROBE_SHELL_GONE      true
PROBE_AFTER           CLICK_OK
PROBE_IDENTITY_AFTER  1
```

فالغطاء هو السبب، لا عَرَضاً مصاحباً. **والأهمّ في السطر الأخير:**
`data-identity-settled` صارت `"1"` بعد الإعلان مباشرةً — أي أنّ **الحلقة تفكّ نفسها
بمجرّد كسرها مرّة واحدة**: الإعلانُ يُركّب الربع الحيّ، والربعُ الحيّ يُسكّن الهوية.

وهذا يرفع التوصية في §٦ من استنتاجٍ إلى **آليةٍ مقيسة**: لا يلزم تعطيل الضمانة، يلزم
أن تُكسر الحلقة مرّةً واحدة فتستقيم من نفسها.

---

## ٤ — حدود ما أُثبت، صراحةً

- **مُثبت:** الحلقة قائمة في الشفرة، وكلّ المخارج مشروطة، وتقع فعلاً ١٠/١٠ في جلسة
  E2E (الضيف `guest-lawyer-1`) وتبقى ٢٢ ثانية على الأقل.
- **مُثبت أنه لا يقع على المسار السليم:** خادم التطوير بجلسة عادية —
  `shellPresent:false` · `gridPainted:true` · `identitySettled:"1"`. **الإقلاع يكتمل.**
- **غير مُثبت — ويلزم أن يُقال:** أنّ مستخدماً حقيقياً يبلغ هذه الحالة. الطريق
  المحتمل مسمّىً لا مُقاساً: `isLawyerProfileLocalUnread` تعني «مشفَّر وبارد» لا
  «غير موجود»، فملفٌّ مشفَّر لم يُسخَّن مفتاحُه — مثل فقد `hami-crypto-keystore`
  بإخلاء IndexedDB، وهو خطرٌ سُجّل في هذا الفرع — يُبقي `pending` صادقة.
  **هذه فرضية بمسار وسطر، وليست قياساً.** تُحسَم بتشغيلٍ يُجبر تلك الحالة.

---

## ٥ — لماذا لم يُصلَح الليلة

السلوك **متعمَّد ومحروس**:
[`homeMainGridPaintGate.test.ts:205`](../src/app/bootstrap/__tests__/homeMainGridPaintGate.test.ts)
اسمه «لا يكشف الشبكة قبل استقرار الهوية **حتى بعد الفتيل القصير**»، ويؤكّد
`isHomeMainGridPainted() === false` بعد تقديم الوقت **٨٠٠٠ م.ث**.

فالقرار موجود، وما يحميه مفهوم: ألّا يظهر اسم المحامي أو صورته **بعد** الكشف فيقفز
التخطيط — وهو أصل معمارية «الهياكل الفورية» كلّها. **والخلل ليس في القصد بل في أنه
بلا سقف:** ضمانةٌ جمالية غير محدودة زمنياً تتحوّل إلى عطل إتاحة كامل.

وتغييرُ هذا يغيّر عقد الكشف الذي تعتمد عليه أقسام أخرى — وهو ما يوجب العرض المسبق
بتوصية صريحة (الميثاق، البند ٩ آخره)، لا التصرّف المنفرد.

---

## ٦ — التوصية، صريحة

**حُدَّ الفتيل، ولا تُلغِ الضمانة.** الفتيل عند ٨ ثوانٍ يُعلن الطلاء **بلا شرط** متى
كان `[data-hami-lawyer-dashboard]` موجوداً والغطاء ما زال قائماً:

```ts
// homeMainGridPaintGate.ts  armUncoverWatchdog()
if (canAnnounceHappyPathUncover() || isWorthyBootSurface() || hasAuthGateSurface()) {
    announceHomeMainGridPainted();
    return;
}
// وبعد ثمانٍ ثوانٍ فوق لوحةٍ مركّبة: الكشفُ الناقص أهونُ من حبسٍ دائم.
announceHomeMainGridPainted();
```

**ولا يرى المستخدمُ السليم فرقاً:** على المسار السعيد تستقرّ الهوية في أقلّ من ثانية
فلا يُشعَل الفتيل أصلاً. التغيير يمسّ **حالة العطل وحدها**: «مُجمَّد إلى الأبد» تصير
«مكشوف بعد ثماني ثوانٍ». ويُكسر معها الجمود كلّه — لأنّ الإعلان يُركّب الربع الحيّ،
فتستقرّ الهوية بعده.

**وأسنانه** (البند ١١): يُعاد كتابة اختبار `:205` ليؤكّد الحدّ لا غيابه — ويُضاف
اختبارٌ يُثبت أنّ الغطاء يُرفع مع `data-identity-settled="0"` بعد ٨٠٠٠ م.ث، **ويُقاس
سقوطه قبل الإصلاح**. وتعديلُ اختبارٍ ليوافق تغييراً لا يجوز إلا مع تسمية الخطأ الذي
كان يُثبّته، وهو هنا: **غياب السقف**.

**وما يبقى بعده:** المواصفات الثلاث عشرة قد تحتاج بذرةً تُسكّن الهوية في جلسة الضيف؛
وذلك دَينُ أداةٍ لا دَينُ منتج، ويُفصل في التزام مستقلّ.

**وواحدةٌ منها على الأقلّ لا يشفيها رفعُ الغطاء:**
`home-hub-card.spec.ts` `openAlertsUrgentFeed` ينتظر
`getByRole('tab', { name: /عاجل/ })` داخل `home-hub-card` — ولا وجود له. الـ`role="tab"`
في تلك الشجرة محصور في `HubPanelTabs.tsx`، وتبويباه «التنبيهات» و«التثبيت» يضبطهما
`homeHubCardLogic.test.ts:232`. و«عاجل/قادم» في المنتج **مُرشِّح أفق تلقائي** في
`useNeuralAlertsStore` (`activeFilter`)، يضبطه `pickDefaultHorizonFilter` برمجياً، لا
ضابطٌ يُنقر. فالتوقّع قديمٌ مقابل المنتج الحالي — **يُسمّى هنا ولا يُصحَّح**، لأنّ تصحيح
مواصفةٍ لتوافق منتجاً يحتاج أولاً جواباً: أيُّهما الصحيح، الضابط المفقود أم التوقّع؟
