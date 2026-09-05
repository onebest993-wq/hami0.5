# نظافة قسم الإشعارات — موجة 2 — إغلاق صادق

**التاريخ:** ٣٠ آب ٢٠٢٦  
**النطاق:** لوحة جرس المحامي (`NotificationPanel` + `NotificationShell` + زر الهيدر) + `services/notifications/**` + runtime/hooks/store المرتبطة.  
**خارج النطاق:** `ForumNotificationsPanel` المستقل، إشعارات التنفيذ/المدين/الورثة، كتالوج `caseShare` كمنتج منفصل.  
**سابق:** `.audit/PHASE_NOTIFICATIONS_CLEANLINESS_SWEEP.md` (١٢ آب). هذه موجة ثانية أعمق، لا إعادة ادّعاء للأولى.

## ما أُنجز

### دوال وثوابت ميتة (حُذفت)
| عنصر | الحكم |
|------|--------|
| `buildAuditActivityMessage` | بلا أي استدعاء — التنسيق الحي `formatNotificationForCard` |
| `consumePendingCalendarAlarmEventId` | غلاف ميت؛ الإنتاج يستخدم `peek` + `clear` |
| `hasNotificationOverlayHost` | بلا مستهلك — الفتح يقرأ الستارة عبر snap |
| `LEGACY_ACTIVITY_NOTIFICATION_TYPES` + نوعه | ثابت بلا قراءة؛ الفلترة عبر `isActivityLogNotification` |
| `rebuildInboxFromEventsSupabase` | غلاف RPC بلا مستهلك TS — الـ SQL يبقى للصيانة |
| `resetHamiFcmBridgeForTests` / `resetForumNotificationDbResolverForTests` / `resetNotificationsSentryModuleForTests` | `reset*ForTests` بلا اختبارات |
| `resetNotificationPanelModuleCacheForTests` + `resetNotificationPanelModuleStateForTests` | بلا مستهلك |
| `isNotificationShellModuleResolved` + `resetNotificationShellLoaderForTests` + نوع المكوّن | علم/إعادة ضبط بلا قراءة |

### تكرار وُحِّد
- hover كان يسخّن **الشِل واللوحة معاً** رغم أن Host يضم اللوحة ساكناً → مسار واحد: `prefetchNotificationShellModule`، والشِل يوسم اللوحة محلولة.
- CSS اللوحة كان يُستورد من `index.tsx` و`NotificationShell.tsx` (نفس الملف) → مصدر واحد: الشِل.
- `lazyComponents.tsx` كان غلاف تسخين ثالثاً فوق المحمّل → حُذف؛ `lazyComponentsIntent` يستدعي محمّل الشِل مباشرة.

### تصديرات داخلية أُغلقت
ثوابت/أنواع كانت تُصدَّر بلا مستورد خارجي (حدود FCM، أهداف التنقّل، أنواع Props/Params للملف نفسه، `NotificationOwned*`، إلخ) — بقيت مستخدمة داخل الملف.

قفل الصدق: `notificationsCleanlinessCloseHonesty.test.ts` (موجة 2) يمنع عودة الأسماء والمحمّل المزدوج واستيراد CSS من `index`.

## الاختبارات

Vitest على لوحة الإشعارات + خدماتها + hooks/runtime/store/infrastructure + جسور المنتدى ذات الصلة: **ناجح** في الدفعات المقاسة (١٦+٤٢+٢٣+٦ ملفات؛ بدون تداخل: أكثر من ٢٥٠ اختباراً شاملاً للمسارات أعلاه).

لم يُشغَّل الأمر الواحد `npm run gate:notifications` كعملية واحدة بعد التعديل؛ مكوّناته شُغِّلت.

## التقييم

| البُعد | درجة | ملاحظة |
|--------|------|--------|
| أداء | 8 | hover بلا طلبين متداخلين؛ بلا قياس جهاز/حزمة |
| نظافة | 8 | حذف حقيقي؛ محمّلا الشِل/اللوحة يبقيان عمداً (تسخين إقلاع vs مقطع الواجهة) |
| أمان | 8 | لم يُمسّ عقد WIFE/التخزين؛ الثوابت الأمنية ما زالت تُطبَّق داخلياً |
| جودة | 8 | سطح تصدير أضيق؛ تعليق hover يطابق السلوك |
| موبايل | 8 | لم تُضعَف 44px / لوحة المفاتيح / safe-area |
| صدق | 9 | انظر الحدود |

**جاهز للانتقال:** نعم لهذه الموجة.

## الحدود — ما لم يُنفَّذ صراحةً

- قشرة الفتح الفوري ما زالت نسختين (React + جسر DOM/`innerHTML`) عمداً لأول لمسة.
- `notificationPanelLoader` يبقى لتسخين الإقلاع/`hydrate`؛ `headerShellIntentWarm` ما زال يسخّن اللوحة مبكراً (ليس مسار hover).
- طبقة CSS مخفية في `lawyerHomeFx-critical.css` مكرّرة عمداً مع `notificationPanel.layer.css` لطلاء أول إطار قبل مقطع اللوحة — لم تُدمَج حتى لا يتغيّر الإقلاع.
- RPC `rebuild_lawyer_shell_inbox_from_events` يبقى في SQL بلا غلاف TS.
- تصديرات ميتة في `caseShareTypes` / لوحة منتدى مستقلة / إشعارات تنفيذ — خارج هذا القسم.
- لم يُشغَّل Playwright ولا جهاز ولا `tsc` كامل.
- `guard-dead-exports.mjs --save` لم يُحدَّث على مستوى المستودع.

**تغيير بصري:** لا. نقل ملكية استيراد CSS إلى الشِل فقط (كان يستورده أصلاً).
