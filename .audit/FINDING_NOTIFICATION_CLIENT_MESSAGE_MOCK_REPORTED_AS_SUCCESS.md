# زر «مراسلة الموكل»: نجاح يُعرَض حتى بدون إرسال فعلي — **مُغلَق**

**اكتُشف:** ٩ آب ٢٠٢٦.
**أُغلق:** ١٠ آب ٢٠٢٦.

---

## ما صار

| التغيير | الملفّ |
|---|---|
| قراءة `data.warning`؛ عند Mock Mode: تحذير صادق + فتح `wa.me` | `useNotificationActions.ts` |
| حذف نص «Simulation» من رسالة النجاح | نفس الملف |
| توثيق مفاتيح Twilio في مثال الإنتاج | `.env.production.example` |
| اختبار وحدة يمنع ادّعاء النجاح عند warning | `useNotificationActions.test.ts` |
| حارس صدق جراحي | `notificationsSectionSurgicalCloseHonesty.test.ts` |

عند غياب Twilio تبقى الخدمة تُرجع `success + warning` (قرار خادمي قائم)، لكن الواجهة لم تعد تكذب على المحامي.
