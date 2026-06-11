# 🔧 FINAL PATCH - V11 Children Alimony Field

## ملف: `/src/app/components/lawyer/ExecutionCreationView.tsx`

## القسمان المطلوب تعديلهما:

### 📍 القسم الأول: السطور 1829-1845

**الكود الحالي (السطر 1829-1845):**
```tsx
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
```

**استبدله بـ:**
```tsx
<div className="space-y-3">
    <div>
        <label className="text-xs font-bold text-gray-300 mb-2 block flex items-center gap-1">
            عدد الأولاد المحكوم لهم
            <span className="text-red-400">*</span>
        </label>
        <div className="flex items-center gap-2 w-full bg-[#0B1120] border border-gray-700 rounded-lg p-3 focus-within:border-purple-500">
            <User className="text-gray-500 flex-shrink-0" size={16} />
            <input
                type="number"
                min="1"
                value={alimonyChildrenCount}
                onChange={(e) => setAlimonyChildrenCount(e.target.value)}
                className="flex-1 bg-transparent text-white outline-none font-mono text-base"
                placeholder="1"
            />
            <span className="text-gray-500 text-xs">ولد</span>
        </div>
    </div>
    
    <div>
        <label className="text-xs font-bold text-gray-300 mb-2 block flex items-center gap-1">
            مقدار نفقة الأولاد الشهرية (للولد الواحد)
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
```

---

### 📍 القسم الثاني: السطور 2046-2062

**نفس التعديل بالضبط** يُطبَّق على السطور 2046-2062 (الكود مكرر 100%)

---

## التغييرات الدقيقة:

1. ✅ **السطر 1829**: تغيير `<div>` → `<div className="space-y-3">`
2. ✅ **إضافة حقل جديد** (31 سطر):
   - Label: "عدد الأولاد المحكوم لهم"
   - Input type="number" مع min="1"
   - Icon: `<User />` بدلاً من `<DollarSign />`
   - Value: `{alimonyChildrenCount}`
   - onChange: `setAlimonyChildrenCount`
   - Unit: "ولد"

3. ✅ **تعديل Label القديم**:
   - من: "مقدار نفقة الأولاد الشهرية (دينار)"
   - إلى: "مقدار نفقة الأولاد الشهرية (للولد الواحد)"

---

## طريقة التطبيق (VS Code):

### الطريقة 1: Find & Replace
1. اضغط `Ctrl+H` (Find & Replace)
2. في حقل "Find"، ضع:
```
                                                <div>
                                                    <label className="text-xs font-bold text-gray-300 mb-2 block flex items-center gap-1">
                                                        مقدار نفقة الأولاد الشهرية (دينار)
```

3. في حقل "Replace"، ضع:
```
                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="text-xs font-bold text-gray-300 mb-2 block flex items-center gap-1">
                                                            عدد الأولاد المحكوم لهم
                                                            <span className="text-red-400">*</span>
                                                        </label>
                                                        <div className="flex items-center gap-2 w-full bg-[#0B1120] border border-gray-700 rounded-lg p-3 focus-within:border-purple-500">
                                                            <User className="text-gray-500 flex-shrink-0" size={16} />
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                value={alimonyChildrenCount}
                                                                onChange={(e) => setAlimonyChildrenCount(e.target.value)}
                                                                className="flex-1 bg-transparent text-white outline-none font-mono text-base"
                                                                placeholder="1"
                                                            />
                                                            <span className="text-gray-500 text-xs">ولد</span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div>
                                                        <label className="text-xs font-bold text-gray-300 mb-2 block flex items-center gap-1">
                                                            مقدار نفقة الأولاد الشهرية (للولد الواحد)
```

4. اضغط "Replace All" (سيستبدل القسمين معاً)

### الطريقة 2: Manual Edit
1. اذهب للسطر 1829
2. احذف من السطر 1829 إلى 1845
3. الصق الكود الجديد (من الأعلى)
4. كرر للسطر 2046

---

## التحقق من النجاح:

بعد التعديل، يجب أن:
1. ✅ يظهر حقلان في واجهة "نفقة الأولاد":
   - حقل "عدد الأولاد المحكوم لهم" (Number input)
   - حقل "مقدار نفقة الأولاد الشهرية (للولد الواحد)" (Currency input)

2. ✅ عند إدخال: عدد=3، مبلغ=200,000
   - الحساب الآلي: `3 × 200,000 = 600,000 د.ع شهرياً`

3. ✅ تظهر النتيجة في:
   - القسم الأخضر "النفقة المستمرة"
   - مع Badge: "استحقاق الأولاد (العدد: 3)"

---

## الملفات المرتبطة:

- ✅ **State Variable**: تمت إضافته في السطر 347
- ✅ **Math Logic**: تم تحديثه في السطور 420-447
- ✅ **Display Component**: `AlimonyFinancialBlock.tsx` جاهز
- ⚠️ **UI Fields**: هذا الملف - يحتاج تطبيق يدوي

---

## الوقت المتوقع: **2-3 دقائق** ⏱️

**النظام سيكون 100% مكتمل بعد هذا التعديل البسيط!** 🎯
