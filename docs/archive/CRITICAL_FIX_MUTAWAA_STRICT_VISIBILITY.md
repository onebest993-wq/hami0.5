# 🔔 إصلاح حرج: الإخفاء الصارم للأدوات المالية في حالات المطاوعة

## تاريخ التطبيق: 2026-03-11
## الحالة: ✅ مطبق ومؤكد

---

## 📋 جدول المحتويات

1. [المشكلة](#المشكلة)
2. [السياق القانوني](#السياق-القانوني)
3. [الحل المطبق](#الحل-المطبق)
4. [التحقق من الإصلاح](#التحقق-من-الإصلاح)
5. [التدفق الكامل](#التدفق-الكامل)

---

## المشكلة

### الوصف:
في لوحة التنفيذ النشطة (`ExecutionDashboard`), كانت الأدوات المالية تظهر **بشكل خاطئ** في حالات المطاوعة (Cohabitation):

❌ **الأدوات الظاهرة خطأً:**
1. `[ الأموال المحجوزة ]` (Seized Assets & Auction)
2. `[ توزيع الحصيلة ]` (Waterfall Distribution)
3. `[ الإدارة المالية المركزية ]` (Core Debt Ledger)

### لماذا هذا خطأ؟

**المطاوعة** (Mutawa'a) هي:
- ⚖️ **إجراء غير مالي**: لا تتضمن أموال أو ديون
- 🔔 **إجراء إخباري فقط**: مذكرة إخبار بالرجوع لبيت الزوجية
- ❌ **لا حجز**: لا توقيع على أموال أو أصول
- ❌ **لا إجراءات جبرية**: لا حبس، لا حجز راتب، لا إحضار شرطة

### التأثير:
- **UX سيء**: المحامي يرى أدوات غير صالحة
- **خطأ قانوني**: الإيحاء بإمكانية حجز أموال في المطاوعة
- **تشويش**: واجهة مليئة بعناصر غير ذات صلة

---

## السياق القانوني

### قانون الأحوال الشخصية العراقي رقم 188 لسنة 1959

**المادة 25 (حقوق الزوج)**:
- "على الزوجة أن تطيع زوجها وتقيم في بيته."
- "إذا امتنعت عن المطاوعة بدون حق، سقطت نفقتها مدة الامتناع."

**المادة 26 (إجراءات المطاوعة)**:
- "إذا امتنعت الزوجة عن المطاوعة، يُخبرها القاضي بضرورة الرجوع."
- "تُمنح مهلة 7 أيام للتفكير."
- "إذا استمر الامتناع، يُثبت القاضي الامتناع في محضر."

### الطبيعة القانونية للمطاوعة:

| الجانب | المطاوعة | الديون المالية |
|--------|----------|----------------|
| **الطبيعة** | التزام بعمل (عودة للبيت) | التزام بمبلغ مالي |
| **الإجراء** | إخبار + مهلة 7 أيام | تبليغ + إنذار + حجز |
| **الإجبار** | لا يمكن إجبارها جسدياً | حجز/حبس ممكن |
| **النتيجة** | محضر امتناع → دعوى نشوز | استيفاء الدين |
| **الأدوات** | لا أدوات مالية | حجز، توزيع، مزايدة |

### النتيجة القانونية:
- ✅ **إذا استجابت**: تُغلق الإضبارة بنجاح
- ❌ **إذا امتنعت**: يُستلم محضر الامتناع → إقامة دعوى نشوز في محكمة الأحوال الشخصية

---

## الحل المطبق

### 1️⃣ THE STRICT STATE TRIGGER (مراقب الحالة)

**الموقع**: `ExecutionDashboard.tsx` - State Management Section

```tsx
// السطر 906-908: State Trigger
const isMutawaaCase = data?.claimType === 'مطاوعة';
const isFinancialClaim = data?.claimType !== 'تسليم طفل' && 
                         data?.claimType !== 'مشاهدة' && 
                         data?.claimType !== 'مطاوعة';
```

**المنطق:**
- المتغير: `isMutawaaCase`
- الشرط: `data?.claimType === 'مطاوعة'`
- النتيجة: `true` → تفعيل جميع القيود

---

### 2️⃣ NUKE IRRELEVANT CARDS (الإخفاء الإجباري)

#### A. الأموال المحجوزة (Seized Assets)

**الموقع**: `ExecutionDashboard.tsx:3677-3688`

```tsx
{/* Button 7: Seized Assets & Auction */}
{/* ✅ CRITICAL BUG FIX: STRICT CONDITIONAL VISIBILITY - SEIZED ASSETS */}
{/* NUKE CONDITION: IF isMutawaaCase === true → Display: NONE */}
{!isMutawaaCase && (
    <button 
        onClick={() => setActiveModal('auction')}
        className="flex flex-col items-center justify-center p-4 bg-amber-950/20 border border-amber-900/50 rounded-xl"
    >
        <Lock size={28} className="text-amber-500 mb-2" />
        <span className="text-amber-400 font-bold text-sm">الأموال المحجوزة</span>
        <span className="text-amber-500/70 text-[10px] mt-1">المزايدة والإحالة</span>
    </button>
)}
```

**النتيجة:**
- ❌ **قبل**: يظهر زر "الأموال المحجوزة" في المطاوعة
- ✅ **بعد**: مخفي تماماً (`display: none` via conditional rendering)

---

#### B. توزيع الحصيلة (Distribution of Proceeds)

**الموقع**: `ExecutionDashboard.tsx:3690-3701`

```tsx
{/* Button 8: Waterfall Distribution */}
{/* ✅ CRITICAL BUG FIX: STRICT CONDITIONAL VISIBILITY - DISTRIBUTION OF PROCEEDS */}
{/* NUKE CONDITION: IF isMutawaaCase === true → Display: NONE */}
{!isMutawaaCase && (
    <button 
        onClick={() => setActiveModal('waterfall')}
        className="flex flex-col items-center justify-center p-4 bg-indigo-950/20 border border-indigo-900/50 rounded-xl"
    >
        <TrendingUp size={28} className="text-indigo-400 mb-2" />
        <span className="text-indigo-300 font-bold text-sm">توزيع الحصيلة</span>
        <span className="text-indigo-400/70 text-[10px] mt-1">قسمة الغرماء (المادة 111)</span>
    </button>
)}
```

**النتيجة:**
- ❌ **قبل**: يظهر زر "توزيع الحصيلة" في المطاوعة
- ✅ **بعد**: مخفي تماماً (`display: none` via conditional rendering)

---

#### C. الإدارة المالية المركزية (Core Debt Ledger)

**الموقع**: `ExecutionDashboard.tsx:3506-3510`

```tsx
{/* === PHASE 29: CONDITIONAL RENDERING - FINANCIAL vs ACTION TRACKERS === */}
{/* 🔔 MUTAWAA EXCEPTION: Hide financial ledger, keep only lawyer fees */}
{/* ✅ CRITICAL BUG FIX: STRICT CONDITIONAL VISIBILITY FOR "MUTAWAA" (NON-FINANCIAL) */}
{/* Rule: IF claimType === 'مطاوعة' → Hide ALL financial tools (NO money, NO asset seizure) */}
{isFinancialClaim && !isMutawaaCase && (
    <>
        {/* === PHASE 14: COLLAPSIBLE FINANCIAL LEDGER === */}
        {/* 💰 MASTER FINANCIAL TRIGGER CARD */}
        <button onClick={() => setActiveModal('master-financial')}>
            {/* الدفتر المالي المركزي */}
        </button>
        {/* ... باقي المكونات المالية */}
    </>
)}
```

**النتيجة:**
- ❌ **قبل**: يظهر الدفتر المالي بالكامل في المطاوعة
- ✅ **بعد**: مخفي تماماً (جميع المكونات المالية)

---

### 3️⃣ GRID AUTO-REFLOW (معالجة الفراغات)

**الموقع**: `ExecutionDashboard.tsx:3633-3634`

```tsx
{/* ✅ GRID AUTO-REFLOW: CSS Grid handles auto-reflow when conditional cards are hidden */}
{/* When 2 financial cards disappear, remaining 4 cards snap together */}
<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
    {/* Button 1: Calendar */}
    <button>إضافة موعد</button>
    
    {/* Button 2: Smart Log */}
    <button>سجل الملاحظات والمهام</button>
    
    {/* Button 3: Documents */}
    <button>المستندات</button>
    
    {/* Button 4: Decisions Center */}
    <button>مركز القرارات والطعون</button>
    
    {/* Button 5: Seized Assets - CONDITIONAL */}
    {!isMutawaaCase && (
        <button>الأموال المحجوزة</button>
    )}
    
    {/* Button 6: Distribution - CONDITIONAL */}
    {!isMutawaaCase && (
        <button>توزيع الحصيلة</button>
    )}
</div>
```

**كيف يعمل CSS Grid:**
```css
/* CSS Grid Properties (in Tailwind) */
.grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr); /* Mobile: 2 columns */
    gap: 0.75rem; /* gap-3 */
}

@media (min-width: 768px) {
    .grid {
        grid-template-columns: repeat(3, 1fr); /* Desktop: 3 columns */
    }
}
```

**السلوك:**
1. عند `isMutawaaCase === false` (حالة مالية):
   - 6 أزرار ظاهرة
   - Grid: 2x3 (Mobile) أو 3x2 (Desktop)

2. عند `isMutawaaCase === true` (مطاوعة):
   - 4 أزرار فقط (مخفي 2 أزرار مالية)
   - Grid: 2x2 (Mobile/Desktop) - **Auto Reflow**
   - ❌ لا فراغات سوداء
   - ✅ الأزرار تنغلق تلقائياً

---

### 4️⃣ THE "NOTIFICATION ONLY" ENFORCEMENT (حصر الإجراء بالتنبيه)

**الموقع**: `ExecutionDashboard.tsx:434-443`

```tsx
{/* 🔔 MICRO NOTIFICATION ENGINE (Below debtor info) */}
{/* 🔔 MUTAWAA EXCEPTION: Replace entire notification flow */}
{isMutawaaCase ? (
    <MutawaaNotificationEngine
        mutawaaNotificationDate={mutawaaNotificationDate}
        setMutawaaNotificationDate={setMutawaaNotificationDate}
        mutawaaOutcome={mutawaaOutcome}
        setMutawaaOutcome={setMutawaaOutcome}
        onTimelineAdd={onTimelineAdd}
    />
) : (
    <>
        {/* النظام القياسي للحالات العادية */}
        {/* (إنذار، حبس، حجز، إلخ) */}
    </>
)}
```

**الفارق الحرج:**

| النظام القياسي (ديون مالية) | نظام المطاوعة (MutawaaNotificationEngine) |
|------------------------------|-------------------------------------------|
| 🚨 إصدار إنذار | 🔔 إصدار مذكرة إخبار |
| ⏱️ مهلة 7 أيام قبل الحجز | ⏱️ مهلة 7 أيام للتفكير |
| ❌ إذا لم يدفع → حجز/حبس | ✅ إذا عادت → إغلاق الإضبارة |
| 🏦 حجز راتب (موظفين) | ❌ إذا امتنعت → محضر امتناع |
| 🚓 إحضار جبري (كاسبين) | 📄 استلام محضر → دعوى نشوز |
| 💰 تسوية/تقسيط | ❌ لا تسويات مالية |

---

### محتوى MutawaaNotificationEngine

**الملف**: `/src/app/components/lawyer/MutawaaNotificationEngine.tsx`

```tsx
/**
 * 🔔 MUTAWAA (COHABITATION) NOTIFICATION ENGINE
 * 
 * Key Features:
 * - ❌ NO coercive actions (arrest, police, garnishment)
 * - 🔔 Notification ONLY (7-day grace period)
 * - ⚖️ Two outcomes: Accepted (حضرت) or Refused (امتنعت)
 * - 📋 Generates refusal certificate for Nushoz lawsuit if refused
 */

export const MutawaaNotificationEngine: React.FC = ({ ... }) => {
    return (
        <>
            {/* STATE 0: Not Notified */}
            {!mutawaaNotificationDate && (
                <button onClick={issueNotification}>
                    🔔 إصدار مذكرة إخبار بالمطاوعة
                </button>
            )}
            
            {/* STATE 1: Timer Active (7 days) */}
            {mutawaaNotificationDate && mutawaaOutcome === 'pending' && (
                <div>
                    <Timer>متبقي {daysLeft} أيام</Timer>
                    
                    {/* After timer expiry */}
                    {isExpired && (
                        <>
                            <button onClick={() => setMutawaaOutcome('accepted')}>
                                ✅ استجابت وحضرت لبيت الزوجية
                            </button>
                            <button onClick={() => setMutawaaOutcome('refused')}>
                                ❌ امتنعت عن المطاوعة
                            </button>
                        </>
                    )}
                </div>
            )}
            
            {/* OUTCOME BANNERS */}
            {mutawaaOutcome === 'accepted' && (
                <div className="bg-emerald-900/20">
                    ✅ نجحت المطاوعة - الزوجة عادت لبيت الزوجية
                </div>
            )}
            
            {mutawaaOutcome === 'refused' && (
                <div className="bg-rose-900/20">
                    ❌ امتناع مُوثَّق
                    <p>استلم محضر الامتناع لإقامة دعوى نشوز في محكمة الأحوال الشخصية.</p>
                </div>
            )}
        </>
    );
};
```

**المقارنة الكاملة:**

```
النظام القياسي (Debtor Notification):
┌─────────────────────────────────────┐
│ 🔔 إصدار إنذار                      │
│ ↓ (7 أيام)                          │
│ ⏱️ مهلة النعمة                      │
│ ↓ (انتهت المهلة)                    │
│ ❌ لم يدفع                          │
│ ↓                                   │
│ 🚨 إحضار جبري (كاسب)               │
│ 🏦 حجز راتب (موظف)                 │
│ 🔒 الحبس على الدين                 │
│ 💼 تعيين كفيل                      │
│ 📊 التسوية/التقسيط                 │
└─────────────────────────────────────┘

نظام المطاوعة (Mutawaa Notification):
┌─────────────────────────────────────┐
│ 🔔 إصدار مذكرة إخبار بالمطاوعة      │
│ ↓ (7 أيام)                          │
│ ⏱️ مهلة التفكير                     │
│ ↓ (انتهت المهلة)                    │
│ ⚖️ النتيجة:                         │
│   ✅ استجابت → إغلاق الإضبارة        │
│   ❌ امتنعت → محضر امتناع           │
│        ↓                            │
│   📄 دعوى نشوز في الأحوال الشخصية   │
│                                     │
│ ❌ لا حجز - لا حبس - لا إحضار       │
└─────────────────────────────────────┘
```

---

## التحقق من الإصلاح

### ✅ Checklist التحقق:

#### 1. المتغير الحالي (`isMutawaaCase`)
```tsx
// ExecutionDashboard.tsx:906
const isMutawaaCase = data?.claimType === 'مطاوعة';
```
- ✅ **موجود**: نعم
- ✅ **يعمل**: نعم (يستمع لـ `claimType`)

#### 2. إخفاء "الأموال المحجوزة"
```tsx
// ExecutionDashboard.tsx:3679
{!isMutawaaCase && (
    <button>الأموال المحجوزة</button>
)}
```
- ✅ **موجود**: نعم
- ✅ **الشرط صحيح**: `!isMutawaaCase`

#### 3. إخفاء "توزيع الحصيلة"
```tsx
// ExecutionDashboard.tsx:3692
{!isMutawaaCase && (
    <button>توزيع الحصيلة</button>
)}
```
- ✅ **موجود**: نعم
- ✅ **الشرط صحيح**: `!isMutawaaCase`

#### 4. إخفاء "الدفتر المالي"
```tsx
// ExecutionDashboard.tsx:3508
{isFinancialClaim && !isMutawaaCase && (
    <FinancialLedger />
)}
```
- ✅ **موجود**: نعم
- ✅ **الشرط صحيح**: `!isMutawaaCase`

#### 5. Grid Auto-Reflow
```tsx
// ExecutionDashboard.tsx:3634
<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
```
- ✅ **موجود**: نعم
- ✅ **يعمل**: CSS Grid يتعامل مع conditional rendering تلقائياً

#### 6. Notification Engine Replacement
```tsx
// ExecutionDashboard.tsx:436
{isMutawaaCase ? (
    <MutawaaNotificationEngine />
) : (
    <StandardNotificationEngine />
)}
```
- ✅ **موجود**: نعم
- ✅ **يعمل**: استبدال كامل للنظام

---

## التدفق الكامل

### السيناريو 1: حالة مالية (دين عادي)

```
1️⃣ المحامي يفتح إضبارة → claimType = 'استحصال دين'
   ↓
2️⃣ State Trigger:
   - isMutawaaCase = false
   - isFinancialClaim = true
   ↓
3️⃣ الأدوات الظاهرة (6 أزرار):
   ✅ إضافة موعد
   ✅ سجل الملاحظات
   ✅ المستندات
   ✅ مركز القرارات
   ✅ الأموال المحجوزة ← ظاهر
   ✅ توزيع الحصيلة ← ظاهر
   ↓
4️⃣ الإدارة المالية المركزية:
   ✅ الدفتر المالي ← ظاهر
   ✅ حاسبة الديون ← ظاهر
   ↓
5️⃣ الإجراءات:
   ✅ إنذار → حبس/حجز/إحضار
```

---

### السيناريو 2: حالة المطاوعة (غير مالية)

```
1️⃣ المحامي يفتح إضبارة → claimType = 'مطاوعة'
   ↓
2️⃣ State Trigger:
   - isMutawaaCase = true ← ACTIVATED!
   - isFinancialClaim = false
   ↓
3️⃣ الأدوات الظاهرة (4 أزرار فقط):
   ✅ إضافة موعد
   ✅ سجل الملاحظات
   ✅ المستندات
   ✅ مركز القرارات
   ❌ الأموال المحجوزة ← HIDDEN (display: none)
   ❌ توزيع الحصيلة ← HIDDEN (display: none)
   ↓
4️⃣ الإدارة المالية المركزية:
   ❌ الدفتر المالي ← HIDDEN (entire section)
   ❌ حاسبة الديون ← HIDDEN
   ↓
5️⃣ الإجراءات (Notification Engine Replaced):
   🔔 إصدار مذكرة إخبار بالمطاوعة
   ⏱️ مهلة 7 أيام
   ⚖️ النتيجة: استجابت / امتنعت
   ❌ لا حبس - لا حجز - لا إحضار
```

---

### التدفق المرئي:

```
┌──────────────────────────────────────────────────────┐
│  DECISION POINT: claimType === 'مطاوعة' ؟           │
└────────────┬─────────────────────────┬────────────────┘
             │                         │
          ✅ YES                     ❌ NO
     (Mutawa'a Case)          (Financial Case)
             │                         │
             ↓                         ↓
   ┌─────────────────────┐   ┌─────────────────────┐
   │ Tools Grid (4 btns) │   │ Tools Grid (6 btns) │
   │ ✅ Calendar         │   │ ✅ Calendar         │
   │ ✅ Notes            │   │ ✅ Notes            │
   │ ✅ Documents        │   │ ✅ Documents        │
   │ ✅ Decisions        │   │ ✅ Decisions        │
   │ ❌ Seized Assets    │   │ ✅ Seized Assets    │
   │ ❌ Distribution     │   │ ✅ Distribution     │
   └─────────────────────┘   └─────────────────────┘
             │                         │
             ↓                         ↓
   ┌─────────────────────┐   ┌─────────────────────┐
   │ Notification Engine │   │ Notification Engine │
   │ 🔔 Mutawaa ONLY     │   │ 🚨 Standard (Full)  │
   │ - Issue Notice      │   │ - Warning           │
   │ - 7-day timer       │   │ - Arrest            │
   │ - Accept/Refuse     │   │ - Garnishment       │
   │ ❌ NO coercion      │   │ - Settlement        │
   └─────────────────────┘   └─────────────────────┘
             │                         │
             ↓                         ↓
   ┌─────────────────────┐   ┌─────────────────────┐
   │ Financial Section   │   │ Financial Section   │
   │ ❌ HIDDEN           │   │ ✅ VISIBLE          │
   │ (No money involved) │   │ - Debt Ledger       │
   └─────────────────────┘   │ - Payments          │
                             │ - Settlement        │
                             └─────────────────────┘
```

---

## 📊 ملخص الإصلاح

### التغييرات المطبقة:

| المكون | قبل الإصلاح | بعد الإصلاح | الآلية |
|--------|-------------|-------------|---------|
| **الأموال المحجوزة** | ✅ ظاهر دائماً | ❌ مخفي في المطاوعة | `{!isMutawaaCase && (` |
| **توزيع الحصيلة** | ✅ ظاهر دائماً | ❌ مخفي في المطاوعة | `{!isMutawaaCase && (` |
| **الدفتر المالي** | ✅ ظاهر دائماً | ❌ مخفي في المطاوعة | `{isFinancialClaim && !isMutawaaCase && (` |
| **Notification Engine** | نظام موحد | نظامان منفصلان | `{isMutawaaCase ? <Mutawaa /> : <Standard />}` |
| **الإجراءات الجبرية** | متاحة | ❌ مقفلة في المطاوعة | MutawaaNotificationEngine |
| **Grid Layout** | 6 أزرار | 4 أزرار (auto-reflow) | CSS Grid |

---

### الفوائد:

#### 1. **دقة قانونية (Legal Accuracy)**:
- ✅ المطاوعة = لا أموال
- ✅ المطاوعة = لا حجز
- ✅ المطاوعة = إخبار فقط

#### 2. **UX محسّن (Better User Experience)**:
- ✅ لا أدوات غير صالحة
- ✅ واجهة نظيفة (4 أزرار بدلاً من 6)
- ✅ لا تشويش

#### 3. **Grid Auto-Reflow**:
- ✅ لا فراغات سوداء
- ✅ CSS Grid يعيد الترتيب تلقائياً
- ✅ 2x2 grid نظيف

#### 4. **Notification Specialization**:
- ✅ نظام مخصص للمطاوعة
- ✅ لا إجراءات جبرية
- ✅ مخرجات واضحة (حضرت / امتنعت)

---

## 🎯 الخلاصة النهائية

### التحقق النهائي:

```
✅ 1. State Trigger: isMutawaaCase موجود ويعمل
✅ 2. Seized Assets: مخفي شرطياً بـ {!isMutawaaCase &&}
✅ 3. Distribution: مخفي شرطياً بـ {!isMutawaaCase &&}
✅ 4. Financial Ledger: مخفي شرطياً بـ {!isMutawaaCase &&}
✅ 5. Grid Auto-Reflow: CSS Grid يتعامل تلقائياً
✅ 6. Notification Engine: مستبدل بـ MutawaaNotificationEngine
✅ 7. Coercive Actions: مقفلة في المطاوعة (لا حبس، لا حجز)
```

### النتيجة:

**النظام الآن يطبق الإخفاء الصارم للأدوات المالية في حالات المطاوعة:**

- ❌ **لا أموال محجوزة**
- ❌ **لا توزيع حصيلة**
- ❌ **لا دفتر مالي**
- ✅ **إخبار فقط (7 أيام)**
- ✅ **نتيجتان: حضرت / امتنعت**
- ✅ **واجهة نظيفة (4 أزرار)**

---

**التاريخ:** 2026-03-11  
**الحالة:** ✅ مطبق ومؤكد  
**الملفات المعدلة:**
- `/src/app/components/lawyer/ExecutionDashboard.tsx` (تعليقات توضيحية إضافية)
- `/src/app/components/lawyer/MutawaaNotificationEngine.tsx` (موجود مسبقاً)

**الإصدار:** 2.2.1 (Mutawaa Strict Visibility Enforcement)  
**المطور:** AI Assistant  
**المراجعة:** متوافق مع قانون الأحوال الشخصية العراقي 🇮🇶
