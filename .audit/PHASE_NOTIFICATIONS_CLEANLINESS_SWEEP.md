# نظافة قسم الإشعارات — فحص ذرّي صادق

**التاريخ:** ١٢ آب ٢٠٢٦  
**النطاق:** لوحة جرس المحامي (`NotificationPanel`) + `services/notifications/**` + hooks/runtime/store/infrastructure المرتبطة + جسور المنتدى ذات الصلة.  
**خارج النطاق:** نوافذ إشعار التنفيذ/الورثة، `ForumNotificationsPanel` المستقل إلا حيث يتقاطع.

## منهجية القياس

- جرد حيّ للحجم + `guard-dead-modules` / baselines / تتبّع استدعاءات يدوي.

## ما أُصلح — الجولة ١ (كود ميت)

| حذف / ربط | الدليل |
|---|---|
| `isForumModel` / `isForumShellNotification` / `listForumFromBlobModels` / `forumEventLabel` | بلا مستهلك أو تكرار |
| `notificationFromAppendInput` / `scheduleNotificationShellReactSync` / `countLegacyPrefixKeysServer` | بلا مستهلك |
| `stopNotificationArrivalCue` | غير مستخدم + لا يوقف WAV |
| رسالة الفراغ المكرّرة | → `TAB_META` فقط |
| `wipeShellNotificationsClient` | رُبط بـ`wipeAllApplicationData` فقط (ليس logout) |

## ما أُصلح — الجولة ٢ (نواقص معلنة)

| بند | الإصلاح |
|---|---|
| ورقة أندرويد بلا `present` | `openNotifications` يجرّب `tryPresentNativeNotificationSheet` عند تفعيل العلم؛ إن نجحت لا يفتح الشلّ الويبي |
| `NotificationAlertControls` ~٥٥٨ سطراً | قُسّم إلى DndPanel + ChannelBlock + ToggleRow بلا تغيير بصري |
| تسمية `CaseShareIncoming*` | → `CaseSharePanelSection` / `useCaseSharePanel` / `CaseShareCard` |
| mock مزدوج في `lawyerDashboardHeaderPrefetch.test` | دُمج حتى لا يكسر بوابة الإشعارات |

## حدود متبقية

| بند | ملاحظة |
|---|---|
| `rebuildInboxFromEventsSupabase` | غلاف RPC بلا مستهلك TS — أداة ops |
| FCM placeholder | يحتاج Firebase حقيقي للإشعار والتطبيق مغلق |
| ورقة أصلية على جهاز | تحتاج `VITE_NATIVE_NOTIFICATION_SHEET=true` + APK |

## التقييم

**نظافة: ٩/١٠** · **جاهز للانتقال: نعم**
