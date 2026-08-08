# 🎯 حاسبة النفقة الذكية - سجل التغييرات الاحترافي
## التاريخ: 2026-03-12
## النسخة: v2.0 - النظام القانوني المتقدم

---

## 📋 ملخص التحديث

تم بناء **نظام حاسبة النفقة الذكية** بشكل كامل ومحترف، يشمل:
1. ✅ **واجهة إدخال ذكية** مع حقول مشروطة
2. ✅ **محرك حساب قانوني دقيق** يدعم الفقه الجعفري
3. ✅ **عرض احترافي** في لوحة التحكم (Dashboard)
4. ✅ **حفظ واسترجاع** البيانات بشكل منظم

---

## 🔥 التغييرات الرئيسية

### 1️⃣ تحديث التسميات (Label Simplification)

**الملف**: `ExecutionCreationView.tsx`

#### التغييرات:
- ✅ **قبل**: `✅ حجة نفقة (مستمرة / متراكمة)`
- ✅ **بعد**: `✅ حجة نفقة`

- ✅ **قبل**: `استحصال نفقة مستمرة ومتراكمة`
- ✅ **بعد**: `استحصال نفقة`

**السطور المعدلة**: 551, 582

---

### 2️⃣ محرك الحساب القانوني (Math Engine)

**الملف**: `ExecutionCreationView.tsx`

#### الدالة الجديدة: `calculateAlimonyAccumulation()`

**الموقع**: بعد السطر 130

```typescript
interface AlimonyCalculationParams {
    lawsuitDate: string;
    executionDate: string;
    wifeMonthly: number;
    childrenMonthly: number;
    hasPastWife: boolean;
    pastLawSystem: 'قانون الأحوال الشخصية 1959' | 'الفقه الجعفري';
    pastStartDate: string;
}

interface AlimonyCalculationResult {
    baseDurationMonths: number;
    baseDurationDays: number;
    baseAccumulation: number;
    pastDurationMonths: number;
    pastAccumulation: number;
    totalAccumulated: number;
    monthlyOngoing: number;
    legalCapApplied: boolean;
    explanation: string;
}
```

#### المنطق القانوني:
- 📅 **حساب المدة**: من تاريخ إقامة الدعوى إلى تاريخ التنفيذ (بالأيام والأشهر)
- 💰 **النفقة المتراكمة**: (نفقة الزوجة + نفقة الأولاد) × عدد الأشهر
- ⚖️ **النفقة الماضية للزوجة**:
  - إذا كان القانون: `قانون الأحوال الشخصية 1959` → **حد أقصى 12 شهر**
  - إذا كان القانون: `الفقه الجعفري` → **بدون حد أقصى**
- 📊 **النتيجة النهائية**: المتراكمة + الماضية + المستمرة الشهرية

---

### 3️⃣ متغيرات الحالة الجديدة (State Variables)

**الموقع**: بعد السطر 257

```typescript
const [alimonyBeneficiary, setAlimonyBeneficiary] = useState<'زوجة فقط' | 'أولاد فقط' | 'زوجة وأولاد'>('زوجة وأولاد');
const [alimonyLawsuitDate, setAlimonyLawsuitDate] = useState('');
const [alimonyExecutionDate, setAlimonyExecutionDate] = useState(new Date().toISOString().split('T')[0]);
const [alimonyWifeMonthly, setAlimonyWifeMonthly] = useState('');
const [alimonyChildrenMonthly, setAlimonyChildrenMonthly] = useState('');
const [alimonyHasPastWife, setAlimonyHasPastWife] = useState(false);
const [alimonyPastLawSystem, setAlimonyPastLawSystem] = useState<'قانون الأحوال الشخصية 1959' | 'الفقه الجعفري'>('قانون الأحوال الشخصية 1959');
const [alimonyPastStartDate, setAlimonyPastStartDate] = useState('');
```

---

### 4️⃣ الحساب التلقائي (useMemo)

**الموقع**: بعد السطر 409

```typescript
const calculatedAlimonyNew = useMemo(() => {
    if (claimType !== 'نفقة' || !alimonyLawsuitDate || !alimonyExecutionDate) {
        return null;
    }
    
    const wifeMonthly = parseFloat(alimonyWifeMonthly.replace(/,/g, '')) || 0;
    const childrenMonthly = parseFloat(alimonyChildrenMonthly.replace(/,/g, '')) || 0;
    
    if (wifeMonthly === 0 && childrenMonthly === 0) {
        return null;
    }
    
    return calculateAlimonyAccumulation({...});
}, [dependencies]);
```

---

### 5️⃣ واجهة الإدخال الذكية (Smart UI)

**الموقع**: استبدال السطور 1669-1860

#### المكونات الرئيسية:

```jsx
{claimType === 'نفقة' && (
    <div className="bg-gradient-to-br from-blue-950/30 to-indigo-950/30 border-2 border-blue-900/50 rounded-xl p-5 space-y-4">
        {/* العنوان */}
        <h4>حاسبة النفقة الذكية</h4>
        
        {/* 1. المستفيد (Dropdown) */}
        <select value={alimonyBeneficiary} onChange={...}>
            <option>زوجة فقط</option>
            <option>أولاد فقط</option>
            <option>زوجة وأولاد</option>
        </select>
        
        {/* 2. التواريخ */}
        <input type="date" value={alimonyLawsuitDate} />
        <input type="date" value={alimonyExecutionDate} />
        
        {/* 3. نفقة الزوجة (مشروط) */}
        {(alimonyBeneficiary === 'زوجة فقط' || alimonyBeneficiary === 'زوجة وأولاد') && (
            <div className="bg-pink-950/20">
                <input value={alimonyWifeMonthly} />
                
                {/* Toggle: النفقة الماضية */}
                <input type="checkbox" checked={alimonyHasPastWife} />
                
                {/* الفقه الجعفري */}
                {alimonyHasPastWife && (
                    <select value={alimonyPastLawSystem} />
                    <input type="date" value={alimonyPastStartDate} />
                )}
            </div>
        )}
        
        {/* 4. نفقة الأولاد (مشروط) */}
        {(alimonyBeneficiary === 'أولاد فقط' || alimonyBeneficiary === 'زوجة وأولاد') && (
            <div className="bg-purple-950/20">
                <input value={alimonyChildrenMonthly} />
            </div>
        )}
        
        {/* 5. النتائج الفورية */}
        {calculatedAlimonyNew && (
            <div className="bg-emerald-950/20">
                <p>المدة: {calculatedAlimonyNew.baseDurationMonths} شهر</p>
                <p>النفقة المتراكمة: {calculatedAlimonyNew.totalAccumulated} د.ع</p>
                <p>النفقة المستمرة: +{calculatedAlimonyNew.monthlyOngoing} د.ع</p>
            </div>
        )}
    </div>
)}
```

#### المزايا:
- ✅ **Conditional Rendering**: الحقول تظهر فقط عند الحاجة
- ✅ **Real-time Calculation**: النتائج تُحسب فوراً
- ✅ **Legal Accuracy**: دعم الفقه الجعفري مع عرض التحذيرات

---

### 6️⃣ حفظ البيانات (Data Persistence)

**الموقع**: استبدال السطور 1155-1183 في `handleSubmit`

```typescript
if (claimType === 'نفقة') {
    executionData.alimony = {
        beneficiary: alimonyBeneficiary,
        lawsuitDate: alimonyLawsuitDate,
        executionDate: alimonyExecutionDate,
        wifeMonthly: alimonyWifeMonthly,
        childrenMonthly: alimonyChildrenMonthly,
        hasPastWife: alimonyHasPastWife,
        pastLawSystem: alimonyPastLawSystem,
        pastStartDate: alimonyPastStartDate,
        calculated: calculatedAlimonyNew ? {
            baseDurationMonths: calculatedAlimonyNew.baseDurationMonths,
            baseDurationDays: calculatedAlimonyNew.baseDurationDays,
            baseAccumulation: calculatedAlimonyNew.baseAccumulation,
            pastDurationMonths: calculatedAlimonyNew.pastDurationMonths,
            pastAccumulation: calculatedAlimonyNew.pastAccumulation,
            totalAccumulated: calculatedAlimonyNew.totalAccumulated,
            monthlyOngoing: calculatedAlimonyNew.monthlyOngoing,
            legalCapApplied: calculatedAlimonyNew.legalCapApplied,
            explanation: calculatedAlimonyNew.explanation
        } : null
    };
    
    // للتوافق مع Dashboard
    executionData.totalAmount = calculatedAlimonyNew?.totalAccumulated.toString() || '0';
    executionData.monthlyAlimony = calculatedAlimonyNew?.monthlyOngoing || 0;
}
```

---

### 7️⃣ عرض النفقة في Dashboard (Split View)

**الملف**: `ExecutionDashboard.tsx`

**الموقع**: استبدال السطور 4315-4357

#### العرض الجديد:

```jsx
{data?.claimType === 'نفقة' && data?.alimony?.calculated ? (
    // النفقة: عرض مقسم
    <div className="space-y-4">
        {/* النفقة المتراكمة - الرقم الكبير */}
        <div className="bg-red-950/30 border-2 border-red-800/50 rounded-lg p-4">
            <p className="text-red-400 text-3xl font-black font-mono">
                {data.alimony.calculated.totalAccumulated.toLocaleString()}
            </p>
            <p>دينار عراقي (للتسديد الفوري)</p>
            
            {/* Breakdown */}
            {data.alimony.calculated.pastAccumulation > 0 && (
                <div className="mt-3 pt-3 border-t">
                    <div>نفقة ماضية: {data.alimony.calculated.pastAccumulation} د.ع</div>
                    <div>نفقة من الدعوى: {data.alimony.calculated.baseAccumulation} د.ع</div>
                </div>
            )}
        </div>
        
        {/* النفقة المستمرة - Badge أخضر */}
        <div className="bg-emerald-950/20 border-2 border-emerald-700/50 rounded-lg p-3">
            <p className="text-emerald-400 font-bold text-xl font-mono">
                +{data.alimony.calculated.monthlyOngoing.toLocaleString()} د.ع
            </p>
            <p>تتجدد شهرياً</p>
        </div>
    </div>
) : (
    // الديون العادية: عرض تقليدي
    <div className="grid grid-cols-3 gap-4">
        {/* المطلوب، المسدد، المتبقي */}
    </div>
)}
```

#### المزايا:
- 🔴 **الرقم الكبير الأحمر**: للنفقة المتراكمة المستحقة فوراً
- 🟢 **Badge أخضر**: للنفقة المستمرة الشهرية
- 📊 **Breakdown**: تفاصيل النفقة الماضية إن وجدت
- ℹ️ **Tooltip**: زر معلومات لعرض تفاصيل الحساب

---

## 📊 البيانات المحفوظة (Data Structure)

```typescript
executionData = {
    // ... بيانات أخرى
    alimony: {
        beneficiary: 'زوجة وأولاد',
        lawsuitDate: '2024-01-15',
        executionDate: '2026-03-12',
        wifeMonthly: '500000',
        childrenMonthly: '300000',
        hasPastWife: true,
        pastLawSystem: 'الفقه الجعفري',
        pastStartDate: '2023-06-01',
        calculated: {
            baseDurationMonths: 25.9,
            baseDurationDays: 788,
            baseAccumulation: 20720000,
            pastDurationMonths: 7.5,
            pastAccumulation: 3750000,
            totalAccumulated: 24470000,
            monthlyOngoing: 800000,
            legalCapApplied: false,
            explanation: 'نفقة ماضية (الفقه الجعفري - بدون حد): 7.5 شهر'
        }
    },
    totalAmount: '24470000',
    monthlyAlimony: 800000
}
```

---

## 🎨 التصميم والألوان

### واجهة الإنشاء:
- **الخلفية**: `bg-gradient-to-br from-blue-950/30 to-indigo-950/30`
- **الحدود**: `border-2 border-blue-900/50`
- **نفقة الزوجة**: `bg-pink-950/20 border-pink-800/30`
- **نفقة الأولاد**: `bg-purple-950/20 border-purple-800/30`
- **الفقه الجعفري**: `bg-amber-950/20 border-amber-800/30`
- **النتائج**: `bg-emerald-950/20 border-emerald-800/30`

### لوحة التحكم:
- **النفقة المتراكمة**: `bg-red-950/30 border-2 border-red-800/50`
- **النفقة المستمرة**: `bg-emerald-950/20 border-2 border-emerald-700/50`

---

## ✅ اختبارات التحقق

### سيناريو 1: زوجة فقط + نفقة ماضية (قانون 1959)
```
المستفيد: زوجة فقط
تاريخ الدعوى: 2024-01-01
تاريخ التنفيذ: 2026-03-12
نفقة الزوجة: 500,000 د.ع/شهر
نفقة ماضية: نعم
القانون: قانون الأحوال الشخصية 1959
تاريخ النفقة الماضية: 2022-01-01

النتيجة المتوقعة:
- المدة من الدعوى: 26.4 شهر
- نفقة الدعوى: 13,200,000 د.ع
- النفقة الماضية: 6,000,000 د.ع (12 شهر فقط - تطبيق الحد الأقصى)
- المجموع المتراكم: 19,200,000 د.ع
- المستمرة: +500,000 د.ع/شهر
```

### سيناريو 2: زوجة وأولاد + فقه جعفري
```
المستفيد: زوجة وأولاد
تاريخ الدعوى: 2024-06-01
تاريخ التنفيذ: 2026-03-12
نفقة الزوجة: 400,000 د.ع/شهر
نفقة الأولاد: 600,000 د.ع/شهر
نفقة ماضية: نعم
القانون: الفقه الجعفري
تاريخ النفقة الماضية: 2022-01-01

النتيجة المتوقعة:
- المدة من الدعوى: 21.4 شهر
- نفقة الدعوى: 21,400,000 د.ع
- النفقة الماضية: 11,600,000 د.ع (29 شهر - بدون حد)
- المجموع المتراكم: 33,000,000 د.ع
- المستمرة: +1,000,000 د.ع/شهر
```

---

## 🔧 الملفات المعدلة

### ملفات رئيسية:
1. ✅ `/src/app/components/lawyer/ExecutionCreationView.tsx` (700+ سطر معدل)
2. ✅ `/src/app/components/lawyer/ExecutionDashboard.tsx` (100+ سطر معدل)

### أقسام محدثة:
- ✅ التسميات (Labels)
- ✅ متغيرات الحالة (State)
- ✅ محرك الحساب (Math Engine)
- ✅ الحساب التلقائي (useMemo)
- ✅ واجهة الإدخال (UI Form)
- ✅ حفظ البيانات (Submit Handler)
- ✅ عرض Dashboard (Render Logic)

---

## 🚀 المزايا القانونية

### 1. دقة قانونية عالية:
- ✅ دعم **قانون الأحوال الشخصية 1959** مع حد أقصى سنة واحدة للنفقة الماضية
- ✅ دعم **الفقه الجعفري** بدون حد أقصى
- ✅ احتساب دقيق **بالأيام والأشهر** (لا يعتمد على الأشهر الكاملة فقط)

### 2. تجربة مستخدم محسنة:
- ✅ **Conditional UI**: عرض الحقول فقط عند الحاجة
- ✅ **Real-time Results**: النتائج الفورية أثناء الإدخال
- ✅ **Clear Breakdown**: تفصيل واضح للنفقة الماضية والمتراكمة

### 3. منطق منفصل:
- ✅ **نفقة ≠ دين**: عرض مختلف كلياً عن الديون العادية
- ✅ **متراكمة + مستمرة**: فصل واضح بين النوعين
- ✅ **تحذيرات قانونية**: عرض القيود القانونية المطبقة

---

## 📚 المراجع القانونية

1. **قانون الأحوال الشخصية العراقي رقم 188 لسنة 1959**
   - المادة 25: النفقة الماضية للزوجة (حد أقصى سنة واحدة)

2. **الفقه الجعفري**
   - لا يوجد حد أقصى للنفقة الماضية

3. **قانون التنفيذ رقم 45 لسنة 1980**
   - المادتان 13 و 14: تنفيذ الحجج الشرعية

---

## 📝 ملاحظات للمطورين

### التوافقية:
- ✅ النظام الجديد يحفظ البيانات بهيكل منفصل (`alimony`)
- ✅ يتم حفظ `totalAmount` و `monthlyAlimony` للتوافق مع أقسام أخرى
- ✅ النظام القديم لا يزال موجوداً في الكود لملفات قديمة (backward compatibility)

### الأداء:
- ✅ استخدام `useMemo` لتجنب إعادة الحساب غير الضرورية
- ✅ الحسابات تتم في الـ frontend (لا حاجة للـ backend)

### الصيانة:
- ✅ كود منظم ومعلق بالعربية والإنجليزية
- ✅ TypeScript interfaces لضمان سلامة البيانات
- ✅ دوال قابلة لإعادة الاستخدام

---

## 🎯 خلاصة

تم بناء **نظام حاسبة النفقة الذكية** بشكل كامل ومحترف:
- ✅ واجهة إدخال متقدمة
- ✅ محرك حساب قانوني دقيق
- ✅ عرض احترافي في Dashboard
- ✅ حفظ واسترجاع البيانات
- ✅ دعم القانون العراقي والفقه الجعفري

النظام جاهز للاختبار والإنتاج! 🚀

---

**تاريخ الإنجاز**: 2026-03-12  
**الحالة**: ✅ **مكتمل بنجاح**  
**الإصدار**: v2.0 - Smart Alimony Calculator
