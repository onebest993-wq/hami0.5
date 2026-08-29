# النقر على إشعار نظام التشغيل لا يفتح شيئاً محدَّداً — **مُغلَق**

**اكتُشف:** ٩ آب ٢٠٢٦.
**أُغلق:** ١٠ آب ٢٠٢٦.

---

## ما كان

`HAMI_NATIVE_NOTIFICATION_RECEIVED_EVENT` يُبَثّ بلا مستمع. `Notification.onclick` غير مضبوط. `sw.js` يركّز النافذة فقط ويتجاهل `data`.

## ما صار

| التغيير | الملفّ |
|---|---|
| حلّ توجيه موحّد + allowlist | `notificationOsTapRouting.ts` |
| جسر ربط الحدث → `onNavigate` | `bindNotificationOsTapBridge.ts` |
| ربط من شلّ لوحة المحامي + فتح جدول بـ `eventId` | `useLawyerDashboardNavigation.ts` |
| `Notification.onclick` يبثّ نفس الحدث | `PushNotificationService.ts` |
| SW: `postMessage` + query cold-start | `public/sw.js` |
| اختبارات وحدة + حارس صدق | `__tests__/notificationOsTapRouting.test.ts` + surgical honesty |

تذكير التقويم (`type: calendar-reminder` + `eventId`) يفتح تبويب الجدول ويركّز الموعد عبر `openScheduleTab({ eventId })`.
