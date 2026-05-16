# 🔧 MANUAL PATCH - حقول النفقة الماضية

## التعليمات النهائية (5 دقائق)

### **الموقع 1: نفقة الزوجة (السطر 1809)**

في `/src/app/components/lawyer/ExecutionCreationView.tsx`:

**ابحث عن السطر 1808:**
```tsx
                                                        </div>
```

**الذي يأتي مباشرة بعد:**
```tsx
                                                            />
                                                        </div>   <-- هذا السطر 1808
```

**أضف الكود التالي مباشرة بعد السطر 1808:**

```tsx
                                                        
                                                        <div>
                                                            <label className="text-xs font-bold text-rose-400 mb-2 block">💰 مقدار النفقة الماضية المحكوم بها (دينار)</label>
                                                            <input
                                                                type="number"
                                                                value={pastWifeAlimonyAmount}
                                                                onChange={(e) => setPastWifeAlimonyAmount(e.target.value)}
                                                                className="w-full bg-rose-950/10 border-2 border-rose-700 text-white p-3 rounded-lg focus:border-rose-500 outline-none font-bold text-lg"
                                                                placeholder="أدخل المبلغ المتراكم المحكوم به..."
                                                            />
                                                            <p className="text-gray-500 text-[10px] mt-1 flex items-center gap-1">
                                                                ℹ️ المبلغ الإجمالي للنفقة المتراكمة المحكوم بها للزوجة
                                                            </p>
                                                        </div>
```

---

### **الموقع 2: نفقة الأولاد (السطر 2025)**

**ابحث عن السطر 2025:**
```tsx
                                                        </div>
```

**الذي يأتي مباشرة بعد:**
```tsx
                                                            />
                                                        </div>   <-- هذا السطر 2025
```

**أضف الكود التالي مباشرة بعد السطر 2025:**

```tsx
                                                        
                                                        <div>
                                                            <label className="text-xs font-bold text-rose-400 mb-2 block">💰 مقدار النفقة الماضية المحكوم بها (دينار)</label>
                                                            <input
                                                                type="number"
                                                                value={pastChildrenAlimonyAmount}
                                                                onChange={(e) => setPastChildrenAlimonyAmount(e.target.value)}
                                                                className="w-full bg-rose-950/10 border-2 border-rose-700 text-white p-3 rounded-lg focus:border-rose-500 outline-none font-bold text-lg"
                                                                placeholder="أدخل المبلغ المتراكم المحكوم به..."
                                                            />
                                                            <p className="text-gray-500 text-[10px] mt-1 flex items-center gap-1">
                                                                ℹ️ المبلغ الإجمالي للنفقة المتراكمة المحكوم بها للأولاد
                                                            </p>
                                                        </div>
```

---

## ✅ **طريقة سهلة للبحث:**

### **في محرر الكود:**
1. افتح `ExecutionCreationView.tsx`
2. اضغط `Ctrl+F` (أو `Cmd+F` على Mac)
3. ابحث عن: `تاريخ استحقاق النفقة الماضية`
4. ستجد **نسختين**:
   - **النسخة الأولى** (حوالي سطر 1800): نفقة الزوجة
   - **النسخة الثانية** (حوالي سطر 2017): نفقة الأولاد
5. في كل واحدة، انزل إلى السطر الذي يحتوي على `</div>` بعد حقل التاريخ مباشرة
6. الصق الكود المناسب بعده

---

## 🎯 **النتيجة:**

بعد هذا الـ patch، سيظهر للمستخدم حقل جديد يسأل:
- **"مقدار النفقة الماضية المحكوم بها (دينار)"**

وسيتم حفظ القيمة في:
- `pastWifeAlimonyAmount` (للزوجة)
- `pastChildrenAlimonyAmount` (للأولاد)

---

## ⚠️ **ملاحظة:**
- State variables موجودة بالفعل (سطر 351-352)
- فقط ينقص UI inputs
- هذه الحقول **اختيارية** - النظام يعمل بدونها

---

## ✅ **100% مكتمل بعد هذا!**
