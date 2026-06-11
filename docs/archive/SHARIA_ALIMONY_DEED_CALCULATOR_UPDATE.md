# ✅ نسخ حاسبة النفقة الذكية إلى الحجج الشرعية
## Date: 2026-03-12
## Status: ✅ COMPLETED

---

## 📋 المطلوب

نسخ حاسبة النفقة الذكية **بالكامل** (كما هي، نسخ ولصق) من:
- **الموقع الأصلي**: قسم التنفيذ العادي > `claimType === 'نفقة'`

إلى:
- **الموقع الجديد**: قسم الحجج الشرعية > `claimType === 'حجة نفقة اتفاقية'`

---

## ✅ ما تم تنفيذه

### 1. **نسخ الحاسبة بالكامل** ✅
**الملف**: `/src/app/components/lawyer/ExecutionCreationView.tsx`  
**السطور المنسوخة**: 1671-1884 (214 سطر)  
**الموقع الجديد**: مباشرة بعد السطر 1884

**الكود المنسوخ**:
```jsx
{/* ✅ نسخة مطابقة: حاسبة النفقة الذكية للحجج الشرعية */}
{/* === 🎯 CRITICAL: SMART ALIMONY CALCULATOR FOR SHARIA DEED (2026-03-12) === */}
{claimType === 'حجة نفقة اتفاقية' && (
    <div className="bg-gradient-to-br from-blue-950/30 to-indigo-950/30 border-2 border-blue-900/50 rounded-xl p-5 space-y-4 animate-fade-in">
        <div className="border-b border-blue-800/30 pb-3">
            <h4 className="text-blue-400 font-black text-lg flex items-center gap-2">
                <DollarSign size={20} />
                حاسبة النفقة الذكية
            </h4>
            <p className="text-gray-400 text-xs mt-1">
                احتساب دقيق للنفقة المتراكمة + المستمرة وفقاً للقانون العراقي
            </p>
        </div>
        
        {/* Field 1: المستفيد من النفقة */}
        <div>
            <label className="text-sm font-bold text-blue-300 mb-2 block flex items-center gap-1">
                المستفيد من النفقة
                <span className="text-red-400">*</span>
            </label>
            <select
                value={alimonyBeneficiary}
                onChange={(e) => setAlimonyBeneficiary(e.target.value as any)}
                className="w-full bg-[#0B1120] border border-gray-700 text-white p-3 rounded-lg focus:border-blue-500 outline-none transition-all"
            >
                <option value="زوجة فقط">زوجة فقط</option>
                <option value="أولاد فقط">أولاد فقط</option>
                <option value="زوجة وأولاد">زوجة وأولاد</option>
            </select>
        </div>
        
        {/* Fields 2 & 3: التواريخ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
                <label className="text-sm font-bold text-blue-300 mb-2 block flex items-center gap-1">
                    تاريخ إقامة الدعوى
                    <span className="text-red-400">*</span>
                </label>
                <input
                    type="date"
                    value={alimonyLawsuitDate}
                    onChange={(e) => setAlimonyLawsuitDate(e.target.value)}
                    className="w-full bg-[#0B1120] border border-gray-700 text-white p-3 rounded-lg focus:border-blue-500 outline-none"
                    style={{ direction: 'ltr', textAlign: 'right' }}
                />
            </div>
            <div>
                <label className="text-sm font-bold text-blue-300 mb-2 block flex items-center gap-1">
                    تاريخ احتساب التنفيذ
                    <span className="text-red-400">*</span>
                </label>
                <input
                    type="date"
                    value={alimonyExecutionDate}
                    onChange={(e) => setAlimonyExecutionDate(e.target.value)}
                    className="w-full bg-[#0B1120] border border-gray-700 text-white p-3 rounded-lg focus:border-blue-500 outline-none"
                    style={{ direction: 'ltr', textAlign: 'right' }}
                />
            </div>
        </div>
        
        {/* Conditional: نفقة الزوجة */}
        {(alimonyBeneficiary === 'زوجة فقط' || alimonyBeneficiary === 'زوجة وأولاد') && (
            <div className="bg-pink-950/20 border border-pink-800/30 rounded-lg p-4 space-y-3">
                <h5 className="text-pink-400 font-bold text-sm flex items-center gap-2">
                    <User size={16} />
                    نفقة الزوجة
                </h5>
                
                <div>
                    <label className="text-xs font-bold text-gray-300 mb-2 block flex items-center gap-1">
                        مقدار نفقة الزوجة الشهرية (دينار)
                        <span className="text-red-400">*</span>
                    </label>
                    <div className="flex items-center gap-2 w-full bg-[#0B1120] border border-gray-700 rounded-lg p-3 focus-within:border-pink-500">
                        <DollarSign className="text-gray-500 flex-shrink-0" size={16} />
                        <input
                            type="text"
                            value={formatCurrency(alimonyWifeMonthly)}
                            onChange={(e) => handleAmountChange(e, setAlimonyWifeMonthly)}
                            className="flex-1 bg-transparent text-white outline-none font-mono text-base"
                            placeholder="0"
                        />
                        <span className="text-gray-500 text-xs">IQD</span>
                    </div>
                </div>
                
                {/* Toggle: النفقة الماضية */}
                <div className="border-t border-pink-800/20 pt-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={alimonyHasPastWife}
                            onChange={(e) => setAlimonyHasPastWife(e.target.checked)}
                            className="w-5 h-5 accent-pink-500 rounded"
                        />
                        <span className="text-white font-medium text-sm">هل حُكم للزوجة بنفقة ماضية؟</span>
                    </label>
                </div>
                
                {/* الفقه الجعفري Exception */}
                {alimonyHasPastWife && (
                    <div className="bg-amber-950/20 border border-amber-800/30 rounded-lg p-3 space-y-3 animate-fade-in">
                        <div className="flex items-center gap-2 mb-2">
                            <Zap className="text-amber-500" size={16} />
                            <h6 className="text-amber-400 font-bold text-xs">القانون المطبق على النفقة الماضية</h6>
                        </div>
                        
                        <div>
                            <label className="text-xs font-bold text-amber-400 mb-2 block">القانون المطبق على العقد *</label>
                            <select
                                value={alimonyPastLawSystem}
                                onChange={(e) => setAlimonyPastLawSystem(e.target.value as any)}
                                className="w-full bg-[#0B1120] border border-gray-700 text-white p-3 rounded-lg text-sm focus:border-amber-500 outline-none"
                            >
                                <option value="قانون الأحوال الشخصية 1959">قانون الأحوال الشخصية 1959 (حد أقصى سنة واحدة)</option>
                                <option value="الفقه الجعفري">الفقه الجعفري (بدون حد أقصى)</option>
                            </select>
                        </div>
                        
                        <div>
                            <label className="text-xs font-bold text-amber-400 mb-2 block">تاريخ استحقاق النفقة الماضية *</label>
                            <input
                                type="date"
                                value={alimonyPastStartDate}
                                onChange={(e) => setAlimonyPastStartDate(e.target.value)}
                                className="w-full bg-[#0B1120] border border-gray-700 text-white p-3 rounded-lg focus:border-amber-500 outline-none"
                                style={{ direction: 'ltr', textAlign: 'right' }}
                            />
                        </div>
                        
                        {calculatedAlimonyNew?.legalCapApplied && (
                            <div className="bg-red-950/20 border border-red-800/30 rounded p-2">
                                <p className="text-red-400 text-[10px] font-bold flex items-center gap-1">
                                    <AlertTriangle size={12} />
                                    {calculatedAlimonyNew.explanation}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        )}
        
        {/* Conditional: نفقة الأولاد */}
        {(alimonyBeneficiary === 'أولاد فقط' || alimonyBeneficiary === 'زوجة وأولاد') && (
            <div className="bg-purple-950/20 border border-purple-800/30 rounded-lg p-4">
                <h5 className="text-purple-400 font-bold text-sm mb-3 flex items-center gap-2">
                    <User size={16} />
                    نفقة الأولاد
                </h5>
                
                <div>
                    <label className="text-xs font-bold text-gray-300 mb-2 block flex items-center gap-1">
                        مقدار نفقة الأولاد الشهرية (دينار)
                        <span className="text-red-400">*</span>
                    </label>
                    <div className="flex items-center gap-2 w-full bg-[#0B1120] border border-gray-700 rounded-lg p-3 focus-within:border-purple-500">
                        <DollarSign className="text-gray-500 flex-shrink-0" size={16} />
                        <input
                            type="text"
                            value={formatCurrency(alimonyChildrenMonthly)}
                            onChange={(e) => handleAmountChange(e, setAlimonyChildrenMonthly)}
                            className="flex-1 bg-transparent text-white outline-none font-mono text-base"
                            placeholder="0"
                        />
                        <span className="text-gray-500 text-xs">IQD</span>
                    </div>
                </div>
            </div>
        )}
        
        {/* نتائج الحساب الفوري */}
        {calculatedAlimonyNew && (
            <div className="bg-emerald-950/20 border border-emerald-800/30 rounded-lg p-4 space-y-3">
                <h5 className="text-emerald-400 font-bold text-sm mb-3 flex items-center gap-2">
                    <Scale size={16} />
                    النتائج الفورية
                </h5>
                
                <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-400">المدة (أيام):</span>
                        <span className="text-white font-bold">{calculatedAlimonyNew.baseDurationDays} يوم</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-gray-400">المدة (أشهر):</span>
                        <span className="text-white font-bold">{calculatedAlimonyNew.baseDurationMonths.toFixed(1)} شهر</span>
                    </div>
                    
                    {calculatedAlimonyNew.pastAccumulation > 0 && (
                        <>
                            <div className="border-t border-emerald-800/20 pt-2 mt-2"></div>
                            <div className="flex items-center justify-between">
                                <span className="text-amber-400 text-xs">النفقة الماضية للزوجة:</span>
                                <span className="text-amber-400 font-bold font-mono">{formatCurrency(calculatedAlimonyNew.pastAccumulation.toString())} د.ع</span>
                            </div>
                        </>
                    )}
                    
                    <div className="border-t border-emerald-800/20 pt-2 mt-2"></div>
                    <div className="flex items-center justify-between text-base">
                        <span className="text-red-300 font-bold">إجمالي النفقة المتراكمة:</span>
                        <span className="text-red-400 font-black font-mono text-lg">{formatCurrency(calculatedAlimonyNew.totalAccumulated.toString())} د.ع</span>
                    </div>
                    
                    <div className="flex items-center justify-between bg-emerald-900/20 p-2 rounded">
                        <span className="text-emerald-300 font-bold text-xs">النفقة المستمرة (شهرياً):</span>
                        <span className="text-emerald-400 font-bold font-mono">+{formatCurrency(calculatedAlimonyNew.monthlyOngoing.toString())} د.ع</span>
                    </div>
                </div>
            </div>
        )}
    </div>
)}
```

---

### 2. **التحقق من المتغيرات المشتركة** ✅

تم التحقق من أن جميع المتغيرات المستخدمة في الحاسبة موجودة بالفعل في الـ State:

| المتغير | الموقع في الكود | الحالة |
|---------|-----------------|--------|
| `alimonyBeneficiary` | Line ~270 | ✅ موجود |
| `alimonyLawsuitDate` | Line ~270 | ✅ موجود |
| `alimonyExecutionDate` | Line ~270 | ✅ موجود |
| `alimonyWifeMonthly` | Line ~270 | ✅ موجود |
| `alimonyChildrenMonthly` | Line ~270 | ✅ موجود |
| `alimonyHasPastWife` | Line ~270 | ✅ موجود |
| `alimonyPastLawSystem` | Line ~270 | ✅ موجود |
| `alimonyPastStartDate` | Line ~270 | ✅ موجود |
| `calculatedAlimonyNew` | Line ~350 (useEffect) | ✅ موجود |

**النتيجة**: جميع المتغيرات **مشتركة** بين النسختين، مما يعني أن الحاسبة ستعمل بنفس الطريقة في كلا الموقعين.

---

### 3. **التحقق من منطق التقادم** ✅

تم التحقق من السطر 762:
```typescript
const isContinuousAlimony = claimType === 'نفقة' || claimType === 'حجة نفقة اتفاقية';
```

**النتيجة**: `'حجة نفقة اتفاقية'` **بالفعل** مُعتبرة ديناً مستمراً ومستثناة من التقادم السباعي.

---

## 📊 البنية النهائية

### قبل التحديث:
```
┌──────────────────────────────────────────┐
│ بيانات الحجة الشرعية                    │
├──────────────────────────────────────────┤
│ نوع المطالبة: حجة نفقة                  │ ← dropdown
├──────────────────────────────────────────┤
│ (لا توجد حاسبة)                         │ ❌
└──────────────────────────────────────────┘
```

### بعد التحديث:
```
┌──────────────────────────────────────────┐
│ بيانات الحجة الشرعية                    │
├──────────────────────────────────────────┤
│ نوع المطالبة: حجة نفقة                  │ ← dropdown
├──────────────────────────────────────────┤
│ 🎯 حاسبة النفقة الذكية                 │ ✅
│ ┌────────────────────────────────────┐   │
│ │ المستفيد من النفقة               │   │
│ │ تاريخ إقامة الدعوى               │   │
│ │ تاريخ احتساب التنفيذ              │   │
│ │ نفقة الزوجة (شهرياً)             │   │
│ │ ✓ هل حُكم للزوجة بنفقة ماضية؟     │   │
│ │   → القانون المطبق                │   │
│ │   → تاريخ استحقاق النفقة الماضية  │   │
│ │ نفقة الأولاد (شهرياً)            │   │
│ │                                    │   │
│ │ 📊 النتائج الفورية:               │   │
│ │ • المدة (أيام/أشهر)              │   │
│ │ • النفقة الماضية للزوجة          │   │
│ │ • إجمالي النفقة المتراكمة        │   │
│ │ • النفقة المستمرة (شهرياً)       │   │
│ └────────────────────────────────────┘   │
└──────────────────────────────────────────┘
```

---

## 🎯 ما يحققه هذا التحديث

✅ **نسخ مطابق 100%**: الحاسبة في "حجة نفقة اتفاقية" مطابقة تماماً للحاسبة في "نفقة"  
✅ **نفس المتغيرات**: استخدام نفس الـ State، لا حاجة لمتغيرات جديدة  
✅ **نفس المحرك القانوني**: نفس محرك الحساب (`calculateAlimony`)  
✅ **نفس منطق التقادم**: كلاهما مستثنى من التقادم السباعي  
✅ **نفس واجهة المستخدم**: نفس الألوان، الحقول، والنتائج الفورية  

---

## 🧪 اختبار التحديث

### Test Case 1: حجة نفقة - زوجة فقط
1. اختر "السند المنفذ" = "الحجج الشرعية"
2. اختر "نوع المطالبة" = "حجة نفقة"
3. **المتوقع**: ✅ تظهر حاسبة النفقة الذكية مباشرة بعد بيانات الحجة
4. املأ الحقول:
   - المستفيد: "زوجة فقط"
   - تاريخ إقامة الدعوى: 01/01/2025
   - تاريخ احتساب التنفيذ: 12/03/2026
   - مقدار النفقة الشهرية: 500,000 د.ع
   - ✓ حُكم للزوجة بنفقة ماضية
   - القانون المطبق: "قانون الأحوال الشخصية 1959"
   - تاريخ استحقاق النفقة الماضية: 01/06/2024
5. **المتوقع**: ✅ تظهر النتائج الفورية مع التحذير إذا تجاوزت سنة

### Test Case 2: حجة نفقة - زوجة وأولاد
1. اختر "السند المنفذ" = "الحجج الشرعية"
2. اختر "نوع المطالبة" = "حجة نفقة"
3. املأ الحقول:
   - المستفيد: "زوجة وأولاد"
   - نفقة الزوجة الشهرية: 400,000 د.ع
   - نفقة الأولاد الشهرية: 300,000 د.ع
4. **المتوقع**: ✅ يتم حساب المجموع الصحيح (700,000 × عدد الأشهر)

### Test Case 3: حجة نفقة - الفقه الجعفري
1. اختر "حجة نفقة"
2. المستفيد: "زوجة فقط"
3. ✓ حُكم للزوجة بنفقة ماضية
4. القانون المطبق: **"الفقه الجعفري"**
5. تاريخ استحقاق النفقة الماضية: 01/01/2020 (أكثر من سنة بكثير)
6. **المتوقع**: ✅ **لا يظهر تحذير** - يتم حساب كامل المدة بدون حد أقصى

---

## 📝 ملاحظات فنية

### 1. **لماذا النسخ المطابق؟**
- **الاتساق**: المستخدم يتوقع نفس الواجهة في كلا الحالتين
- **الموثوقية**: محرك الحساب مُختبر ومُوثّق بالفعل
- **عدم التكرار**: نفس المتغيرات، نفس الحالة، لا داعي لـ duplication logic

### 2. **المتغيرات المشتركة**
جميع المتغيرات (`alimonyBeneficiary`, `alimonyWifeMonthly`, إلخ) مشتركة بين:
- حاسبة النفقة في التنفيذ العادي (`claimType === 'نفقة'`)
- حاسبة النفقة في الحجج الشرعية (`claimType === 'حجة نفقة اتفاقية'`)

**النتيجة**: إذا قام المستخدم بتبديل نوع الإضبارة، ستبقى القيم محفوظة.

### 3. **محرك الحساب**
يتم الحساب عبر `useEffect` الموجود في السطور ~350-450:
```typescript
useEffect(() => {
    if (claimType === 'نفقة' || claimType === 'حجة نفقة اتفاقية') {
        const result = calculateAlimony({ ... });
        setCalculatedAlimonyNew(result);
    }
}, [alimonyBeneficiary, alimonyLawsuitDate, alimonyExecutionDate, ...]);
```

---

## ✅ الحالة النهائية

**الحاسبة الآن موجودة في موقعين**:
1. ✅ **التنفيذ العادي**: `claimType === 'نفقة'`
2. ✅ **الحجج الشرعية**: `claimType === 'حجة نفقة اتفاقية'`

**كلاهما يستخدم**:
- ✅ نفس المتغيرات
- ✅ نفس محرك الحساب
- ✅ نفس واجهة المستخدم
- ✅ نفس منطق التقادم

---

**التاريخ**: 2026-03-12  
**الحالة**: ✅ **مكتمل بنجاح**  
**الملفات المعدلة**: 1  
**السطور المضافة**: 214  
**الوظائف الجديدة**: حاسبة نفقة ذكية في قسم الحجج الشرعية
