# مؤشرات قانون التنفيذ الذكية - Iraqi Execution Law Smart Indicators

## نظرة عامة | Overview

تم تطوير نظام متقدم لتتبع وإدارة إضبارات التنفيذ في القانون العراقي، يتضمن:

1. **مؤشرات المواد القانونية** (Articles 18, 20, 50, 112)
2. **نظام تنبيهات صحة الإضبارة** (File Health Alerts)
3. **عدادات زمنية للتنفيذ الرضائي** (Voluntary Execution Timers)
4. **رادار التقدم الذكي** (Smart Progress Radar)

---

## 1. المؤشرات القانونية | Legal Article Indicators

### المادة 18 - الحجز الاحتياطي
**Article 18 - Precautionary Seizure**

- **الوصف**: الحجز على أموال المدين قبل صدور الحكم
- **المتطلبات**:
  - ✓ السند التنفيذي
  - ✓ طلب حجز احتياطي
- **الحالات**:
  - `pending`: لم يتم الحجز بعد
  - `in-progress`: جاهز للتقديم
  - `completed`: تم الحجز بنجاح

---

### المادة 20 - حجز المنقول
**Article 20 - Movable Property Seizure**

- **الوصف**: الحجز على الأموال المنقولة (سيارات، أثاث، إلخ)
- **المتطلبات**:
  - ✓ تبليغ المدين
  - ✓ معاينة الأموال المنقولة
- **الحالات**:
  - `pending`: لم يتم التبليغ
  - `in-progress`: تم التبليغ - جاهز للمعاينة
  - `completed`: تم حجز المنقول

---

### المادة 50 - تحديد موعد البيع
**Article 50 - Setting Auction Date**

- **الوصف**: الإعلان عن المزاد العلني لبيع الأموال المحجوزة
- **المتطلبات**:
  - ✓ حجز الأموال
  - ✓ تحديد موعد المزاد
  - ✓ الإعلان القانوني
- **الحالات**:
  - `not-applicable`: يتطلب حجز أولاً
  - `in-progress`: تم الحجز - جاهز للمزاد
  - `completed`: تم تحديد موعد البيع

---

### المادة 112 - التنفيذ على العقار
**Article 112 - Real Estate Execution**

- **الوصف**: إجراءات الحجز والإشغال على العقارات
- **المتطلبات**:
  - ✓ تبليغ المدين
  - ✓ تحديد العقار
  - ✓ إشغال العقار
- **الحالات**:
  - `pending`: لم يتم التبليغ
  - `in-progress`: جاهز للإشغال
  - `completed`: تم إشغال العقار

---

## 2. نظام تنبيهات صحة الإضبارة | File Health Alerts

### مستويات الصحة | Health Levels

- **Excellent (90-100)** 🟢: الإضبارة مكتملة وجميع المستندات موجودة
- **Good (70-89)** 🔵: الإضبارة جيدة مع ملاحظات بسيطة
- **Warning (50-69)** 🟡: هناك مشاكل تحتاج انتباه
- **Critical (<50)** 🔴: مشاكل خطيرة تمنع التقدم

### أنواع التنبيهات | Alert Types

#### Critical Alerts (حرجة)
```typescript
{
  severity: 'critical',
  title: 'السند التنفيذي مفقود',
  description: 'لا يمكن المتابعة بالتنفيذ بدون السند التنفيذي الأصلي',
  action: 'إضافة السند التنفيذي'
}
```

#### Warning Alerts (تحذيرية)
```typescript
{
  severity: 'warning',
  title: 'مهلة التنفيذ الرضائي غير محددة',
  description: 'يجب تحديد تاريخ بدء مهلة الـ 7 أيام',
  action: 'تحديد تاريخ بدء المهلة'
}
```

#### Info Alerts (معلوماتية)
```typescript
{
  severity: 'info',
  title: 'لا يوجد تقدم ملموس',
  description: 'مرت 30 يوماً بدون إجراءات تنفيذية',
  action: 'اتخاذ إجراء تنفيذي'
}
```

---

## 3. عداد التنفيذ الرضائي | Voluntary Execution Timer

### للحجج الشرعية | For Sharia Deeds

**المواد المشمولة**:
- مهر مؤجل (Deferred Dowry)
- حجة وصية (Deed of Will)
- حجة تخارج (Deed of Takharuj)

### المدة القانونية
- **7 أيام**: للتنفيذ الطوعي والإعفاء من رسم التحصيل 5%

### الحالات | States

#### Active (نشطة)
```
⏱️ عداد التنفيذ الرضائي (7 أيام)
5 أيام متبقية
للإعفاء من رسم التحصيل 5%
```

#### Urgent (عاجلة - آخر يومين)
```
⚠️ الوقت ينفد!
2 أيام متبقية
```

#### Expired (منتهية)
```
انتهت المهلة القانونية
يستحق رسم التحصيل 5%
```

---

## 4. رادار التقدم الذكي | Smart Progress Radar

### المراحل الستة | Six Stages

1. **تسجيل الإضبارة** (File Registration) - المادة 3
2. **تبليغ المدين** (Notification) - المادة 4
3. **مهلة التنفيذ الرضائي** (Voluntary Period) - المادة 6
4. **الحجز** (Seizure) - المادتان 20 أو 112
5. **المزاد العلني** (Auction) - المادة 50
6. **التحصيل** (Collection) - إنهاء التنفيذ

### مثال على التقدم | Progress Example

```
✓ تسجيل الإضبارة - مكتمل (20%)
✓ تبليغ المدين - مكتمل (40%)
● مهلة التنفيذ الرضائي - جاري (60%)
○ الحجز - قادم
○ المزاد العلني - قادم
○ التحصيل - قادم

التقدم الكلي: 60%
```

---

## الاستخدام | Usage

### في ExecutionDashboard

```tsx
import { ExecutionLegalIndicators } from './ExecutionLegalIndicators';
import { SmartExecutionRadar } from './SmartExecutionRadar';

<ExecutionLegalIndicators 
  file={executionFileData}
  onActionClick={(action, payload) => {
    // Handle legal action clicks
    if (action === 'article_18') openAttachmentModal();
    if (action === 'article_20') openSeizureModal();
    // ...
  }}
/>

<SmartExecutionRadar 
  file={executionFileData}
  compact={false} // أو true للعرض المختصر
/>
```

---

## التصميم | Design System

### ألوان الحالات | Status Colors

- **مكتملة (Completed)**: `emerald` 🟢
- **قيد التنفيذ (In Progress)**: `amber` 🟡
- **معلقة (Pending)**: `slate` ⚪
- **محظورة (Blocked)**: `red` 🔴

### الأيقونات | Icons

- **المادة 18**: 🔒 Lock (الحجز الاحتياطي)
- **المادة 20**: 📦 Package (حجز المنقول)
- **المادة 50**: 🔨 Hammer (المزاد)
- **المادة 112**: 🏠 Home (العقار)

---

## الميزات الإضافية | Additional Features

### 1. حساب تلقائي للنسب
- يحسب النظام نسبة التقدم تلقائياً بناءً على المراحل المكتملة

### 2. تنبيهات ذكية
- تنبيهات تلقائية للمستندات المفقودة
- تذكيرات للمواعيد القانونية

### 3. تكامل مع النظام
- ربط مباشر مع modals الإجراءات
- تحديث فوري للحالة عند إتمام إجراء

---

## الملفات المرتبطة | Related Files

- `/src/app/components/lawyer/ExecutionLegalIndicators.tsx`
- `/src/app/components/lawyer/SmartExecutionRadar.tsx`
- `/src/app/components/lawyer/ExecutionDashboard.tsx`
- `/src/app/constants/legal.ts`

---

## المستقبل | Future Enhancements

- [ ] إضافة مؤشرات لمواد قانونية إضافية
- [ ] تكامل مع نظام التنبيهات العامة
- [ ] إحصائيات متقدمة للأداء
- [ ] تصدير تقارير PDF للمؤشرات

---

**تاريخ التحديث**: 27 فبراير 2026  
**الإصدار**: 1.0.0
