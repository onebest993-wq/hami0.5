# إغلاق — تقسيم ممتاز لقسم الإشعارات

تاريخ: 2026-08-13

## الحكم
من **~7/10** → **~9/10** لتقسيم المسؤوليات (بدون تغيير شكل أو سلوك).

## ما أُنجز

### Panel hooks
| ملف جديد | المسؤولية |
|----------|-----------|
| `useNotificationPanelFocus` | تركيز البطاقة + OS open panel |
| `useNotificationDndControls` | كتم / هدوء |
| `useNotificationClientRequest` | واتساب الموكل |

المنسّقون أصبحوا رفيعين: `useNotificationPanel` / `Actions` / `AlertControls`.

### services
| مجلد | المحتوى |
|------|---------|
| `osTap/` | extract · intent · pending — واجهة `notificationOsTapRouting` |
| `inbox/` | kvIo · dualStore · inboxOps · inboxQuery — واجهة `notificationServerBlob` |
| `bridge/` | nativePlugin · schedule · present — واجهة `HamiNotificationBridge` |

### CSS
`sheet.css` → aggregator لـ chrome / cards / breakpoints.

### نظافة
إزالة re-exports ميتة من `NotificationAlertDndPanel`.

## ما بقي اختيارياً (لا يمنع «ممتاز»)
- `notificationSupabaseInbox.ts` (~228) يمكن فصله map/crud/maintain لاحقاً بنفس أسلوب الواجهة.
- لا إعادة تقسيم Root/Sheet/Header — ممتاز أصلاً.

## اختبارات
`notificationPanelSplitExcellence` + deferral + architecture + OsTap + ServerBlob: نجحت.

## جاهز للانتقال؟
نعم — التقسيم على مستوى احترافي عالٍ مع الحفاظ على مسارات الاستيراد العامة.
