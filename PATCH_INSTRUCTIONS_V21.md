# 🔧 V21 - MANUAL PATCH INSTRUCTIONS

## حقول النفقة الماضية المفقودة

### الموقع 1: نفقة الزوجة الماضية

في ملف `/src/app/components/lawyer/ExecutionCreationView.tsx`, ابحث عن **السطر 1808** (بعد حقل "تاريخ استحقاق النفقة الماضية" للزوجة), وأضف:

```tsx
<div>
    <label className="text-xs font-bold text-rose-400 mb-2 block">
        مقدار النفقة الماضية المحكوم بها (دينار) *
    </label>
    <input
        type="number"
        value={pastWifeAlimonyAmount}
        onChange={(e) => setPastWifeAlimonyAmount(e.target.value)}
        className="w-full bg-[#0B1120] border border-rose-700 text-white p-3 rounded-lg focus:border-rose-500 outline-none"
        placeholder="أدخل المبلغ المتراكم المحكوم به..."
    />
    <p className="text-gray-500 text-[10px] mt-1">
        المبلغ الإجمالي للنفقة المتراكمة المحكوم بها للزوجة
    </p>
</div>
```

### الموقع 2: نفقة الأولاد الماضية

ابحث عن **السطر 2025** (بعد حقل "تاريخ استحقاق النفقة الماضية" للأولاد), وأضف نفس الكود لكن مع:

```tsx
value={pastChildrenAlimonyAmount}
onChange={(e) => setPastChildrenAlimonyAmount(e.target.value)}
```

والنص:
```
المبلغ الإجمالي للنفقة المتراكمة المحكوم بها للأولاد
```

---

## ملاحظة

هذه الحقول **اختيارية**، لكن إضافتها ستجعل النظام متكاملاً 100%.

State variables موجودة بالفعل:
- ✅ `pastWifeAlimonyAmount`
- ✅ `pastChildrenAlimonyAmount`

فقط ينقص UI inputs.
