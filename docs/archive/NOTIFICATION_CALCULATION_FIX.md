# 🔧 **إصلاح احتساب التبليغ الرضائي - Notification Calculation Fix**

## 📋 **المشكلة الحالية:**

### **الخطأ في المنطق:**
```typescript
// ❌ WRONG: daysSinceNotice يأتي من props ولكن لا يُحسب بشكل صحيح
daysSinceNotice = 0  // Default value من ExecutionCreationView

// المشكلة:
// 1. لا يحسب من اليوم التالي للتبليغ
// 2. يحسب من تاريخ الدخول للتطبيق وليس تاريخ التبليغ الفعلي
// 3. لا يأخذ بعين الاعتبار أيام العمل فقط
```

---

## ✅ **القانون العراقي:**

### **المادة 19 من قانون التنفيذ:**
```
التبليغ الرضائي = 7 أيام
الاحتساب يبدأ من اليوم التالي للتبليغ (وليس يوم التبليغ نفسه)
الأيام تُحتسب بالأيام الفعلية (وليس أيام العمل)
```

### **مثال:**
```
تاريخ التبليغ: 2026-03-14 (الجمعة)
بداية الاحتساب: 2026-03-15 (السبت) - اليوم التالي
نهاية المهلة: 2026-03-21 (الجمعة) - بعد 7 أيام
اليوم الثامن (بدء التنفيذ): 2026-03-22 (السبت)
```

---

## 🔍 **تحليل الكود الحالي:**

### **1. State Machine (صحيح ✅)**
```typescript
// executionStateMachine.ts - Lines 174-192
export function calculateDaysElapsed(
    notificationDate: string, 
    currentDate: Date = new Date()
): number {
    const startDate = new Date(notificationDate);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(currentDate);
    endDate.setHours(0, 0, 0, 0);
    
    let daysElapsed = 0;
    const iterDate = new Date(startDate);
    
    while (iterDate < endDate) {
        iterDate.setDate(iterDate.getDate() + 1);
        if (isWorkingDay(iterDate)) {  // ❌ خطأ: يحسب أيام العمل فقط
            daysElapsed++;
        }
    }
    
    return daysElapsed;
}
```

**المشكلة:** يحسب أيام العمل فقط، لكن القانون يتطلب 7 أيام فعلية!

---

### **2. ExecutionDashboard.tsx (خطأ ❌)**
```typescript
// Line 206
daysSinceNotice = 0,  // ❌ يأتي من props بقيمة 0

// Line 270
const shouldCalculateExecutionFee = !isAlimonyClaim && 
    initiator === 'الدائن' && 
    daysSinceNotice > 7 &&  // ❌ يستخدم القيمة الخاطئة
    paidDebt < totalOwed;
```

**المشكلة:** لا يُحسب `daysSinceNotice` بناءً على تاريخ التبليغ الفعلي!

---

## 🔧 **الإصلاح المطلوب:**

### **الخطوة 1: إصلاح State Machine**

```typescript
// utils/executionStateMachine.ts

/**
 * 🆕 CORRECT: حساب الأيام الفعلية (وليس أيام العمل)
 * القانون العراقي: 7 أيام فعلية من اليوم التالي للتبليغ
 */
export function calculateActualDaysElapsed(
    notificationDate: string, 
    currentDate: Date = new Date()
): number {
    const startDate = new Date(notificationDate);
    startDate.setHours(0, 0, 0, 0);
    
    // ✅ CRITICAL: الاحتساب يبدأ من اليوم التالي للتبليغ
    startDate.setDate(startDate.getDate() + 1);
    
    const endDate = new Date(currentDate);
    endDate.setHours(0, 0, 0, 0);
    
    // ✅ حساب الفرق بالأيام الفعلية (وليس أيام العمل)
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
}

/**
 * 🆕 حساب نهاية المهلة الرضائية (7 أيام فعلية)
 */
export function calculateGracePeriodEndDate(
    notificationDate: string
): Date {
    const startDate = new Date(notificationDate);
    startDate.setHours(0, 0, 0, 0);
    
    // ✅ CRITICAL: الاحتساب يبدأ من اليوم التالي
    startDate.setDate(startDate.getDate() + 1);
    
    // ✅ إضافة 7 أيام فعلية
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);
    
    return endDate;
}

/**
 * 🆕 حساب الأيام المتبقية
 */
export function calculateDaysRemaining(
    notificationDate: string,
    currentDate: Date = new Date()
): number {
    const daysElapsed = calculateActualDaysElapsed(notificationDate, currentDate);
    const daysRemaining = 7 - daysElapsed;
    
    return Math.max(0, daysRemaining);
}

/**
 * 🆕 التحقق من انتهاء المهلة
 */
export function isGracePeriodExpired(
    notificationDate: string,
    currentDate: Date = new Date()
): boolean {
    const daysElapsed = calculateActualDaysElapsed(notificationDate, currentDate);
    return daysElapsed > 7;
}
```

---

### **الخطوة 2: تحديث calculateExecutionStatus**

```typescript
// utils/executionStateMachine.ts - Line 199

export function calculateExecutionStatus(
    notificationDate: string | null,
    remainingDebt: number,
    currentDate: Date = new Date(),
    manualHolidayExtension: boolean = false
): {
    status: ExecutionStatus;
    daysElapsed: number;
    daysRemaining: number;
    isGracePeriodExtended: boolean;
    extensionReason?: string;
} {
    // Rule 1: If debt is 0, status is CLOSED
    if (remainingDebt <= 0) {
        return {
            status: 'CLOSED_PAID',
            daysElapsed: 0,
            daysRemaining: 0,
            isGracePeriodExtended: false,
        };
    }
    
    // Rule 2: If no notification date, status is UNNOTIFIED
    if (!notificationDate) {
        return {
            status: 'UNNOTIFIED',
            daysElapsed: 0,
            daysRemaining: 7,
            isGracePeriodExtended: false,
        };
    }
    
    // ✅ NEW: استخدام الحساب الفعلي
    const daysElapsed = calculateActualDaysElapsed(notificationDate, currentDate);
    const daysRemaining = calculateDaysRemaining(notificationDate, currentDate);
    
    // ✅ التحقق من التمديد اليدوي (في حالة العطلات)
    const effectiveGracePeriod = manualHolidayExtension ? 8 : 7;
    
    // Rule 4: Determine status based on elapsed days
    if (daysElapsed <= effectiveGracePeriod) {
        return {
            status: 'GRACE_PERIOD',
            daysElapsed,
            daysRemaining: Math.max(0, effectiveGracePeriod - daysElapsed),
            isGracePeriodExtended: manualHolidayExtension,
            extensionReason: manualHolidayExtension ? 'تمديد يدوي: يصادف عطلة رسمية' : undefined,
        };
    } else {
        return {
            status: 'READY_FOR_COERCIVE',
            daysElapsed,
            daysRemaining: 0,
            isGracePeriodExtended: manualHolidayExtension,
            extensionReason: manualHolidayExtension ? 'تمديد يدوي: يصادف عطلة رسمية' : undefined,
        };
    }
}
```

---

### **الخطوة 3: إصلاح ExecutionDashboard.tsx**

```typescript
// ExecutionDashboard.tsx

// ✅ حساب daysSinceNotice بشكل صحيح
const daysSinceNotice = useMemo(() => {
    // إذا كان هناك تاريخ تبليغ محفوظ في executionData
    const savedNotificationDate = executionData?.debtorNotificationDate || 
                                  debtorNotificationDate || 
                                  debtors[0]?.notificationDate;
    
    if (!savedNotificationDate) {
        return 0;
    }
    
    // ✅ استخدام الدالة المصححة
    return calculateActualDaysElapsed(savedNotificationDate, new Date());
}, [executionData?.debtorNotificationDate, debtorNotificationDate, debtors]);

// ✅ حساب الأيام المتبقية
const daysRemainingInGracePeriod = useMemo(() => {
    const savedNotificationDate = executionData?.debtorNotificationDate || 
                                  debtorNotificationDate || 
                                  debtors[0]?.notificationDate;
    
    if (!savedNotificationDate) {
        return 7;
    }
    
    return calculateDaysRemaining(savedNotificationDate, new Date());
}, [executionData?.debtorNotificationDate, debtorNotificationDate, debtors]);

// ✅ التحقق من انتهاء المهلة
const isGracePeriodExpiredNow = useMemo(() => {
    const savedNotificationDate = executionData?.debtorNotificationDate || 
                                  debtorNotificationDate || 
                                  debtors[0]?.notificationDate;
    
    if (!savedNotificationDate) {
        return false;
    }
    
    return isGracePeriodExpired(savedNotificationDate, new Date());
}, [executionData?.debtorNotificationDate, debtorNotificationDate, debtors]);
```

---

### **الخطوة 4: تحديث عرض المعلومات**

```typescript
// ExecutionDashboard.tsx - في قسم العرض

{/* ✅ عرض معلومات التبليغ بشكل صحيح */}
{debtorNotificationDate && (
    <div className="bg-blue-950/30 border border-blue-700/30 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
            <Bell className="text-blue-400" size={16} />
            <span className="text-blue-300 text-sm font-semibold">
                معلومات التبليغ الرضائي
            </span>
        </div>
        
        <div className="space-y-2 text-xs">
            <div className="flex justify-between">
                <span className="text-gray-400">تاريخ التبليغ:</span>
                <span className="text-white font-mono">
                    {new Date(debtorNotificationDate).toLocaleDateString('ar-IQ')}
                </span>
            </div>
            
            <div className="flex justify-between">
                <span className="text-gray-400">بداية الاحتساب:</span>
                <span className="text-white font-mono">
                    {new Date(
                        new Date(debtorNotificationDate).setDate(
                            new Date(debtorNotificationDate).getDate() + 1
                        )
                    ).toLocaleDateString('ar-IQ')}
                    <span className="text-gray-500 mr-1">(اليوم التالي)</span>
                </span>
            </div>
            
            <div className="flex justify-between">
                <span className="text-gray-400">نهاية المهلة:</span>
                <span className="text-white font-mono">
                    {calculateGracePeriodEndDate(debtorNotificationDate)
                        .toLocaleDateString('ar-IQ')}
                    <span className="text-gray-500 mr-1">(بعد 7 أيام)</span>
                </span>
            </div>
            
            <div className="border-t border-blue-700/30 pt-2 mt-2">
                <div className="flex justify-between items-center">
                    <span className="text-gray-400">الأيام المنقضية:</span>
                    <span className={`font-bold font-mono ${
                        daysSinceNotice > 7 ? 'text-red-400' : 'text-amber-400'
                    }`}>
                        {daysSinceNotice} / 7 أيام
                    </span>
                </div>
                
                <div className="flex justify-between items-center mt-1">
                    <span className="text-gray-400">الأيام المتبقية:</span>
                    <span className={`font-bold font-mono ${
                        daysRemainingInGracePeriod === 0 ? 'text-red-400' : 'text-green-400'
                    }`}>
                        {daysRemainingInGracePeriod} أيام
                    </span>
                </div>
            </div>
            
            {isGracePeriodExpiredNow && (
                <div className="bg-red-950/30 border border-red-700/50 rounded p-2 mt-2">
                    <div className="flex items-center gap-1 text-red-400">
                        <AlertTriangle size={14} />
                        <span className="text-xs font-semibold">
                            انتهت المهلة - يمكن البدء بالتنفيذ الجبري
                        </span>
                    </div>
                </div>
            )}
        </div>
    </div>
)}
```

---

## 📊 **أمثلة عملية:**

### **مثال 1: التبليغ اليوم**
```
تاريخ اليوم: 2026-03-14
تاريخ التبليغ الذي اختاره المحامي: 2026-03-14

✅ الحساب الصحيح:
- بداية الاحتساب: 2026-03-15 (اليوم التالي)
- نهاية المهلة: 2026-03-21 (بعد 7 أيام)
- الأيام المنقضية: 0 أيام (لم يبدأ الاحتساب بعد)
- الأيام المتبقية: 7 أيام
- الحالة: GRACE_PERIOD
```

### **مثال 2: التبليغ قبل 5 أيام**
```
تاريخ اليوم: 2026-03-14
تاريخ التبليغ الذي اختاره المحامي: 2026-03-09

✅ الحساب الصحيح:
- بداية الاحتساب: 2026-03-10 (اليوم التالي)
- نهاية المهلة: 2026-03-16 (بعد 7 أيام)
- الأيام المنقضية: 4 أيام (من 03-10 إلى 03-14)
- الأيام المتبقية: 3 أيام
- الحالة: GRACE_PERIOD
```

### **مثال 3: التبليغ قبل 10 أيام**
```
تاريخ اليوم: 2026-03-14
تاريخ التبليغ الذي اختاره المحامي: 2026-03-04

✅ الحساب الصحيح:
- بداية الاحتساب: 2026-03-05 (اليوم التالي)
- نهاية المهلة: 2026-03-11 (بعد 7 أيام)
- الأيام المنقضية: 9 أيام (من 03-05 إلى 03-14)
- الأيام المتبقية: 0 أيام
- الحالة: READY_FOR_COERCIVE
- رسم التحصيل 3%: يُضاف تلقائياً ✅
```

---

## 🎯 **ملخص التعديلات المطلوبة:**

### **الملفات التي تحتاج تعديل:**

1. ✅ `/src/app/utils/executionStateMachine.ts`
   - إضافة `calculateActualDaysElapsed()`
   - إضافة `calculateGracePeriodEndDate()`
   - إضافة `calculateDaysRemaining()`
   - إضافة `isGracePeriodExpired()`
   - تحديث `calculateExecutionStatus()`

2. ✅ `/src/app/components/lawyer/ExecutionDashboard.tsx`
   - إصلاح حساب `daysSinceNotice` باستخدام useMemo
   - إضافة `daysRemainingInGracePeriod`
   - إضافة `isGracePeriodExpiredNow`
   - تحديث عرض معلومات التبليغ

3. ✅ `/src/app/components/lawyer/ExecutionCreationView.tsx`
   - التأكد من حفظ `debtorNotificationDate` بشكل صحيح
   - تمرير القيمة الصحيحة للـ ExecutionDashboard

---

## ⚠️ **ملاحظات هامة:**

1. **الاحتساب يبدأ من اليوم التالي للتبليغ** - وليس يوم التبليغ نفسه
2. **7 أيام فعلية** - وليس أيام عمل (حسب القانون العراقي)
3. **تاريخ التبليغ يختاره المحامي** - وليس تاريخ الدخول للتطبيق
4. **إذا كان التبليغ اليوم** - الاحتساب يبدأ غداً
5. **إذا مرت 7 أيام** - يبدأ التنفيذ الجبري ويُضاف رسم 3%

---

**جاهز للتطبيق!** 🚀
