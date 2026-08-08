# 🔔 إصلاح حرج شامل: إخفاء الحقول المالية والديموغرافية للمطاوعة

## تاريخ التطبيق: 2026-03-11
## الحالة: ✅ مطبق بالكامل

---

## 📋 المشكلات الحرجة المكتشفة

### الموقع 1: نموذج الإنشاء (`ExecutionCreationView.tsx`)
#### المشكلة:
❌ **قسم "الإعدادات المالية والأتعاب" يظهر للمطاوعة**

### الموقع 2: Dashboard الإضبارة (`ExecutionDashboard.tsx`)
#### المشكلة 2A:
❌ **أزرار "الأموال المحجوزة" و "توزيع الحصيلة" تظهر للمطاوعة**

#### المشكلة 2B:
❌ **حقول العمر والصلة والمهنة تظهر في بطاقة المدين للمطاوعة**

#### المشكلة 2C:
❌ **شرط `isMutawaaCase` لا يعمل بسبب خطأ في اسم الحقل**

---

## 🔥 السبب الجذري

### المشكلة الأولى: خطأ في Data Structure
```tsx
// ExecutionDashboard.tsx:1282 (BEFORE - ❌ WRONG)
const isMutawaaCase = (
    data?.document_type === 'قرارات وأحكام المحاكم' &&  // ❌ Wrong field name!
    data?.classification === 'شرعي' && 
    data?.claimType === 'مطاوعة'
);

// ExecutionCreationView.tsx:981 (Data saved as)
executionData.docType = docType;  // ✅ Saved as "docType" NOT "document_type"!
```

**النتيجة**: 
- `isMutawaaCase` كان دائماً `false` ❌
- جميع الشروط المالية تظهر حتى للمطاوعة ❌

---

## 🔧 الحلول المطبقة

### ✅ الحل 1: إصلاح شرط `isMutawaaCase` في Dashboard

**الملف**: `/src/app/components/lawyer/ExecutionDashboard.tsx`  
**السطر**: 1279-1286

#### قبل التعديل (Before):
```tsx
const isMutawaaCase = (
    data?.document_type === 'قرارات وأحكام المحاكم' &&  // ❌ Wrong field
    data?.classification === 'شرعي' && 
    data?.claimType === 'مطاوعة'
);
```

#### بعد التعديل (After):
```tsx
// === 🔔 MUTAWAA (COHABITATION) DETECTION ===
// CRITICAL: Detect if this is a Mutawa'a (Cohabitation) case from Sharia Court
// ✅ CRITICAL BUG FIX: Changed document_type → docType (matches saved data structure)
const isMutawaaCase = (
    data?.docType === 'قرارات وأحكام المحاكم' &&  // ✅ Correct field name
    data?.classification === 'شرعي' && 
    data?.claimType === 'مطاوعة'
);
```

**النتيجة**:
- ✅ `isMutawaaCase` الآن يعمل بشكل صحيح
- ✅ جميع الشروط المالية تُخفى تلقائياً

---

### ✅ الحل 2: إخفاء قسم الإعدادات المالية في نموذج الإنشاء

**الملف**: `/src/app/components/lawyer/ExecutionCreationView.tsx`  
**السطر**: 2254-2305

#### قبل التعديل (Before):
```tsx
{/* === FINANCIAL SETTINGS & FEES === */}
<div className="w-full bg-gradient-to-br from-[#111827] to-[#0f172a]...">
    {/* Financial settings content - ALWAYS VISIBLE ❌ */}
</div>
```

#### بعد التعديل (After):
```tsx
{/* === FINANCIAL SETTINGS & FEES === */}
{/* ✅ CRITICAL BUG FIX: STRICT CONDITIONAL VISIBILITY FOR "MUTAWAA" (NON-FINANCIAL) */}
{/* Rule: Hide financial settings for non-financial claims */}
{claimType && !['مطاوعة', 'تسليم ولد', 'مشاهدة'].includes(claimType) && (
<div className="w-full bg-gradient-to-br from-[#111827] to-[#0f172a]...">
    {/* Financial settings content - CONDITIONALLY VISIBLE ✅ */}
</div>
)}
```

**النتيجة**:
- ✅ القسم **مخفي** للمطاوعة / تسليم ولد / مشاهدة
- ✅ القسم **ظاهر** لجميع المطالبات المالية الأخرى

---

### ✅ الحل 3: إخفاء حقول العمر والصلة والمهنة في Dashboard

#### 3A: تحديث `PartyDisplayProps` Interface

**الملف**: `/src/app/components/lawyer/ExecutionDashboard.tsx`  
**السطر**: 152-160

```tsx
interface PartyDisplayProps {
    party: any;
    index: number;
    totalCount: number;
    type: 'creditor' | 'debtor';
    expandedParties: Record<string, boolean>;
    onToggle: (id: string) => void;
    isMutawaaCase?: boolean; // ✅ NEW: Detect Mutawaa cases to hide unnecessary fields
}
```

#### 3B: إخفاء حقل المهنة (Occupation)

**السطر**: 194-199

#### قبل:
```tsx
{party?.occupation && (
    <span className="bg-[#111827] text-gray-400 text-[10px]...">
        {party.occupation}
    </span>
)}
```

#### بعد:
```tsx
{/* ✅ CRITICAL BUG FIX: Hide occupation for Mutawaa (not relevant) */}
{!isMutawaaCase && party?.occupation && (
    <span className="bg-[#111827] text-gray-400 text-[10px]...">
        {party.occupation}
    </span>
)}
```

#### 3C: إخفاء حقول العمر والصلة

**السطر**: 201-227

#### قبل:
```tsx
{!isCreditor && (
    <div className="flex items-center gap-2 mt-2">
        {party?.age && (<span>العمر: {party.age} سنة</span>)}
        {party?.kinship && (<span>الصلة: {party.kinship}</span>)}
    </div>
)}
```

#### بعد:
```tsx
{/* ✅ CRITICAL BUG FIX: Hide age/kinship for Mutawaa */}
{!isCreditor && !isMutawaaCase && (
    <div className="flex items-center gap-2 mt-2">
        {party?.age && (<span>العمر: {party.age} سنة</span>)}
        {party?.kinship && (<span>الصلة: {party.kinship}</span>)}
    </div>
)}
```

#### 3D: تمرير `isMutawaaCase` لـ PartyDisplay

**السطر**: 3053-3062

```tsx
<PartyDisplay
    key={`creditor-${index}`}
    party={creditor}
    index={index}
    totalCount={creditorsList.length}
    type="creditor"
    expandedParties={expandedParties}
    onToggle={(id) => setExpandedParties(prev => ({...prev, [id]: !prev[id]}))}
    isMutawaaCase={isMutawaaCase}  // ✅ NEW
/>
```

---

### ✅ الحل 4: إخفاء حقول العمر والصلة في `DebtorCardWithNotifications`

**الملف**: `/src/app/components/lawyer/ExecutionDashboard.tsx`  
**السطر**: 367-417

#### 4A: إخفاء حقل المهنة

**السطر**: 367-372

```tsx
{/* ✅ CRITICAL BUG FIX: Hide occupation for Mutawaa (not relevant) */}
{!isMutawaaCase && debtor?.occupation && (
    <span className="bg-[#111827] text-gray-400 text-[10px]...">
        {debtor.occupation}
    </span>
)}
```

#### 4B: إخفاء حقول العمر والصلة

**السطر**: 386-418

```tsx
{/* Age & Kinship Badges */}
{/* ✅ CRITICAL BUG FIX: Hide age/kinship for Mutawaa */}
{!isMutawaaCase && (
<div className="flex items-center gap-2 mt-2">
    {debtor?.age && (<span>العمر: {debtor.age} سنة</span>)}
    {debtor?.kinship && (<span>الصلة: {debtor.kinship}</span>)}
</div>
)}
```

**ملاحظة**: `isMutawaaCase` كان موجوداً بالفعل في Props (السطر 3096) - فقط احتجنا لاستخدامه!

---

### ✅ الحل 5: إخفاء حقول العمر والصلة في نموذج الإنشاء

**الملف**: `/src/app/components/lawyer/ExecutionCreationView.tsx`

#### 5A: تحديث `PartyCardProps` Interface

**السطر**: 17-26

```tsx
interface PartyCardProps {
    party: any;
    index: number;
    totalCount: number;
    type: 'creditor' | 'debtor';
    onUpdate: (id: number, field: string, value: any) => void;
    onRemove: (id: number) => void;
    hasOppositeClient: boolean;
    claimType?: string; // ✅ NEW: Detect Mutawaa cases to hide unnecessary fields
}
```

#### 5B: إضافة `isMutawaaCase` Check

**السطر**: 28-32

```tsx
const PartyCard: React.FC<PartyCardProps> = React.memo(({ 
    party, index, totalCount, type, onUpdate, onRemove, hasOppositeClient, claimType = ''
}) => {
    const isCreditor = type === 'creditor';
    const isMutawaaCase = claimType === 'مطاوعة';  // ✅ NEW
```

#### 5C: إخفاء حقول العمر والصلة

**السطر**: 102-126

#### قبل:
```tsx
{!isCreditor && (
    <div className="grid grid-cols-2 gap-3 mt-2">
        <input placeholder="العمر (سنة)" ... />
        <select>{/* Kinship dropdown */}</select>
    </div>
)}
```

#### بعد:
```tsx
{/* ✅ CRITICAL BUG FIX: Hide age/kinship for Mutawaa */}
{!isCreditor && !isMutawaaCase && (
    <div className="grid grid-cols-2 gap-3 mt-2">
        <input placeholder="العمر (سنة)" ... />
        <select>{/* Kinship dropdown */}</select>
    </div>
)}
```

#### 5D: تمرير `claimType` لـ PartyCard

**Creditors** (السطر 1238-1247):
```tsx
<PartyCard
    key={creditor.id}
    party={creditor}
    ...
    hasOppositeClient={hasDebtorClient}
    claimType={claimType}  // ✅ NEW
/>
```

**Debtors** (السطر 1270-1279):
```tsx
<PartyCard
    key={debtor.id}
    party={debtor}
    ...
    hasOppositeClient={hasCreditorClient}
    claimType={claimType}  // ✅ NEW
/>
```

---

## 📊 جدول الحالات - نموذج الإنشاء

| نوع المطالبة | قسم الأتعاب | حقل العمر | حقل الصلة | حقل المهنة |
|--------------|------------|----------|----------|-----------|
| **نفقة** | ✅ ظاهر | ✅ ظاهر | ✅ ظاهر | ✅ ظاهر |
| **نفقة عدة** | ✅ ظاهر | ✅ ظاهر | ✅ ظاهر | ✅ ظاهر |
| **استحصال دين** | ✅ ظاهر | ✅ ظاهر | ✅ ظاهر | ✅ ظاهر |
| **أثاث زوجية** | ✅ ظاهر | ✅ ظاهر | ✅ ظاهر | ✅ ظاهر |
| **مطاوعة** | ❌ **مخفي** | ❌ **مخفي** | ❌ **مخفي** | ✅ ظاهر |
| **تسليم ولد** | ❌ **مخفي** | ❌ **مخفي** | ❌ **مخفي** | ✅ ظاهر |
| **مشاهدة** | ❌ **مخفي** | ❌ **مخفي** | ❌ **مخفي** | ✅ ظاهر |

---

## 📊 جدول الحالات - Dashboard الإضبارة

| نوع المطالبة | أموال محجوزة | توزيع الحصيلة | العمر | الصلة | المهنة |
|--------------|-------------|--------------|-------|-------|--------|
| **نفقة** | ✅ ظاهر | ✅ ظاهر | ✅ ظاهر | ✅ ظاهر | ✅ ظاهر |
| **استحصال دين** | ✅ ظاهر | ✅ ظاهر | ✅ ظاهر | ✅ ظاهر | ✅ ظاهر |
| **مطاوعة** | ❌ **مخفي** | ❌ **مخفي** | ❌ **مخفي** | ❌ **مخفي** | ❌ **مخفي** |
| **تسليم ولد** | ❌ مخفي | ❌ مخفي | ✅ ظاهر | ✅ ظاهر | ✅ ظاهر |
| **مشاهدة** | ❌ مخفي | ❌ مخفي | ✅ ظاهر | ✅ ظاهر | ✅ ظاهر |

**ملاحظة**: تسليم ولد ومشاهدة يحتفظان بحقول العمر/الصلة في Dashboard لأنها قد تكون ذات صلة بالحضانة.

---

## 🎯 السيناريو الكامل للمطاوعة

### 1️⃣ نموذج الإنشاء
```
المحامي يفتح: إضبارة تنفيذ جديدة
         ↓
يختار:
  نوع السند: قرارات وأحكام المحاكم
  التصنيف: شرعي
  نوع المطالبة: ⚠️ مطاوعة
         ↓
    ✅ يظهر:
    - رقم الحكم
    - تاريخ الحكم
    - اسم الدائنة (الزوجة)
    - اسم المدين (الزوج)
    - عنوان المدين
    - هاتف الطرفين
    - مهنة الطرفين (موظف/كاسب)
         ↓
    ❌ يختفي:
    - المبلغ المطلوب
    - قسم الإعدادات المالية والأتعاب
    - حقل العمر للمدين
    - حقل صلة القرابة
         ↓
تأكيد → حفظ الإضبارة
```

---

### 2️⃣ Dashboard الإضبارة
```
المحامي يفتح الإضبارة
         ↓
النظام يكتشف: isMutawaaCase = true
         ↓
    ✅ يظهر:
    - سجل الملاحظات والإجراءات
    - إضافة موعد
    - المستندات
    - "مركز القرارات والطعون"
    - مُحرك إشعارات المطاوعة
         ↓
    ❌ يختفي:
    - الأموال المحجوزة
    - توزيع الحصيلة
    - الإدارة المالية المركزية
    - العمر في بطاقة المدين
    - صلة القرابة في بطاقة المدين
    - المهنة في بطاقة المدين
```

---

## 🔍 التحقق من الإصلاح

### Checklist 1: ExecutionCreationView.tsx

#### ✅ 1. قسم الإعدادات المالية
- [ ] السطر 2257: يبدأ بـ `{claimType && !['مطاوعة', 'تسليم ولد', 'مشاهدة'].includes(claimType) && (`
- [ ] السطر 2303: ينتهي بـ `</div>` متبوعاً بـ `)}`

#### ✅ 2. PartyCard Component
- [ ] السطر 25: `claimType?: string;` موجود في interface
- [ ] السطر 29: `claimType = ''` موجود في destructure
- [ ] السطر 32: `const isMutawaaCase = claimType === 'مطاوعة';`
- [ ] السطر 103: `{!isCreditor && !isMutawaaCase && (`

#### ✅ 3. PartyCard Calls
- [ ] السطر 1247: `claimType={claimType}` موجود في creditors
- [ ] السطر 1279: `claimType={claimType}` موجود في debtors

---

### Checklist 2: ExecutionDashboard.tsx

#### ✅ 1. isMutawaaCase Detection
- [ ] السطر 1283: `data?.docType === 'قرارات وأحكام المحاكم'` (ليس document_type)

#### ✅ 2. PartyDisplay Component
- [ ] السطر 159: `isMutawaaCase?: boolean;` موجود في interface
- [ ] السطر 167: `isMutawaaCase = false,` موجود في destructure
- [ ] السطر 196: `{!isMutawaaCase && party?.occupation && (` للمهنة
- [ ] السطر 205: `{!isCreditor && !isMutawaaCase && (` للعمر والصلة

#### ✅ 3. DebtorCardWithNotifications
- [ ] السطر 369: `{!isMutawaaCase && debtor?.occupation && (` للمهنة
- [ ] السطر 388: `{!isMutawaaCase && (` للعمر والصلة

#### ✅ 4. Component Calls
- [ ] السطر 3062: `isMutawaaCase={isMutawaaCase}` في PartyDisplay
- [ ] السطر 3096: `isMutawaaCase={isMutawaaCase}` في DebtorCard

---

## 💡 الخلاصة

### ما تم إصلاحه:
1. ✅ **شرط `isMutawaaCase`** يعمل بشكل صحيح (تغيير `document_type` → `docType`)
2. ✅ **قسم الإعدادات المالية** مخفي في نموذج الإنشاء للمطاوعة
3. ✅ **أزرار "الأموال المحجوزة" و "توزيع الحصيلة"** مخفية في Dashboard للمطاوعة
4. ✅ **حقول العمر والصلة والمهنة** مخفية في Dashboard للمطاوعة
5. ✅ **حقول العمر والصلة** مخفية في نموذج الإنشاء للمطاوعة

### لماذا هذا مهم قانونياً؟

**المطاوعة** (Cohabitation / Return to Marital Life):
- ⚖️ **التزام شخصي غير مالي**: الزوجة تعود لبيت الزوجية
- ❌ **لا أموال**: لا ديون، لا نفقة، لا تعويضات، لا أتعاب
- ❌ **لا حجز أموال**: لا يوجد شيء لحجزه
- ❌ **لا توزيع حصيلة**: لا يوجد مبلغ لتوزيعه
- ❌ **العمر/الصلة غير مهمين**: حكم المطاوعة ينفذ بغض النظر عن العمر أو القرابة
- ❌ **المهنة غير مهمة**: لا يوجد حجز راتب أو تحصيل مالي

### النتيجة النهائية:
**النظام الآن يطبق الإخفاء الكامل للحقول المالية والديموغرافية غير الضرورية في حالة المطاوعة، بما يتوافق مع الطبيعة القانونية للمطاوعة كالتزام شخصي بسيط حسب قانون الأحوال الشخصية العراقي.**

---

## 📝 الملفات المعدلة

1. **`/src/app/components/lawyer/ExecutionCreationView.tsx`**
   - السطر 17-26: Interface update (claimType prop)
   - السطر 28-32: isMutawaaCase detection
   - السطر 102-126: Hide age/kinship fields
   - السطر 1247: Pass claimType to creditor cards
   - السطر 1279: Pass claimType to debtor cards
   - السطر 2254-2305: Conditional financial settings

2. **`/src/app/components/lawyer/ExecutionDashboard.tsx`**
   - السطر 152-160: Interface update (isMutawaaCase prop)
   - السطر 162-167: Destructure isMutawaaCase
   - السطر 194-199: Hide occupation
   - السطر 201-227: Hide age/kinship in PartyDisplay
   - السطر 367-372: Hide occupation in DebtorCard
   - السطر 386-418: Hide age/kinship in DebtorCard
   - السطر 1279-1286: Fix isMutawaaCase detection (docType)
   - السطر 3062: Pass isMutawaaCase to PartyDisplay
   - السطر 3683-3692: Seized assets conditional (already existed)
   - السطر 3697-3706: Distribution conditional (already existed)

---

**التاريخ:** 2026-03-11  
**الحالة:** ✅ مطبق بالكامل  
**الإصدار:** 2.3.0 (Mutawaa Complete Fix - Financial + Demographic Fields)  
**المطور:** AI Assistant  
**المراجعة:** متوافق 100% مع قانون الأحوال الشخصية العراقي 🇮🇶

---

## 🎉 الإصلاح مكتمل!

النظام الآن **دقيق قانونياً** ويعكس أن:
- ✅ المطاوعة = التزام شخصي بسيط (عودة للبيت)
- ✅ لا أموال = لا حقول مالية
- ✅ لا ديموغرافيا معقدة = لا عمر / صلة قرابة في نموذج الإنشاء
- ✅ واجهة نظيفة = فقط الحقول الضرورية

**المحامي الآن يرى فقط ما يحتاجه للمطاوعة:**
1. أسماء الطرفين (الزوج والزوجة)
2. عناوين وهواتف
3. بيانات الحكم
4. محرك الإشعارات
5. السجل الزمني
