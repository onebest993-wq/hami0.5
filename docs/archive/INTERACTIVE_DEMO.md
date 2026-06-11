# 🎮 العرض التفاعلي - جرّب v10.5 الآن!

<div dir="rtl">

## 🚀 **ابدأ في 30 ثانية!**

---

## 📋 **الطريقة الأولى: Test Playground (الأسهل!)**

### **الخطوة 1: افتح Console (F12)**

### **الخطوة 2: انسخ والصق هذا السطر:**

```javascript
import('/src/app/test-playground.ts').then(m => window.playground = m.playground);
```

### **الخطوة 3: اكتب:**

```javascript
playground.runAll()
```

### **🎉 استمتع بالعرض التلقائي (30 ثانية)!**

يجب أن ترى:
- ✅ اختبارات Storage Cache
- ✅ عرض جميع أنواع Toast
- ✅ قياسات Performance
- ✅ معالجة الأخطاء
- ✅ سيناريو كامل لملف تنفيذ

---

## 🎯 **الطريقة الثانية: اختبارات فردية**

### **1. اختبار Storage Cache فقط:**

```javascript
// في Console:
playground.testStorage()
```

**ماذا ستراه:**
```
✅ حفظ وقراءة البيانات
⚡ مقارنة السرعة (localStorage vs storageCache)
📊 إحصائيات الـ Cache
```

---

### **2. اختبار Toast Messages فقط:**

```javascript
// في Console:
playground.testToast()
```

**ماذا ستراه:**
```
✅ رسالة حفظ ملف
💰 رسالة دفعة بمبلغ
❌ رسالة خطأ
⚠️ رسالة تحذير
ℹ️ رسالة معلومات
```

---

### **3. اختبار Performance Monitor فقط:**

```javascript
// في Console:
playground.testPerformance()
```

**ماذا ستراه:**
```
⏱️ قياس عمليات سريعة ومتوسطة وبطيئة
⚠️ تحذير تلقائي للعمليات البطيئة
📊 جدول بالإحصائيات الكاملة
```

---

### **4. اختبار Error Handler فقط:**

```javascript
// في Console:
playground.testErrors()
```

**ماذا ستراه:**
```
📝 تسجيل أخطاء مع سياق كامل
✅ معالجة Async Errors
💾 عمليات LocalStorage آمنة
```

---

### **5. السيناريو الكامل (الأفضل!):**

```javascript
// في Console:
playground.testScenario()
```

**ماذا ستراه:**
```
📁 إنشاء ملف تنفيذ
✅ حفظ في Cache
💰 تسجيل دفعة
📊 حساب المتبقي
📖 قراءة من Cache بسرعة فائقة
📊 تقرير أداء كامل
```

---

## 🔧 **الطريقة الثالثة: استخدام مباشر**

### **استخدام Storage Cache:**

```javascript
// بعد تحميل playground:
const cache = playground.cache;

// حفظ
cache.set('my_data', { name: 'محمد', age: 30 });

// قراءة
const data = cache.get('my_data');
console.log(data);

// حذف
cache.remove('my_data');

// إحصائيات
const stats = cache.getStats();
console.table(stats);
```

---

### **استخدام Toast Messages:**

```javascript
const toast = playground.toast;
const system = playground.system;

// رسائل التنفيذ
toast.success.fileSaved();
toast.success.paymentRecorded(5000000);
toast.error.loadFailed();
toast.warning.gracePeriodExpiring(3);

// رسائل النظام
system.success.dataSaved();
system.error.networkError();
```

---

### **استخدام Performance Monitor:**

```javascript
const perf = playground.perf;

// قياس عملية
perf.start('MyOperation');
// ... عمل شيء
await playground.wait(1000);
perf.end('MyOperation');

// عرض التقرير
perf.logReport();

// إحصائيات محددة
const avgTime = perf.getAverageTime('MyOperation');
const maxTime = perf.getMaxTime('MyOperation');
console.log(`متوسط: ${avgTime}ms، أقصى: ${maxTime}ms`);
```

---

## 🎬 **أمثلة عملية سريعة:**

### **مثال 1: حفظ وقراءة ملفات تنفيذ**

```javascript
const { cache, toast } = playground;

// إنشاء ملف
const file = {
  id: Date.now(),
  fileNumber: '456/2026',
  creditor: 'علي',
  debtor: 'أحمد',
  amount: 8000000
};

// حفظ
cache.set(`execution_${file.id}`, file);
toast.success.fileSaved();

// قراءة
const saved = cache.get(`execution_${file.id}`);
console.log('الملف المحفوظ:', saved);
```

---

### **مثال 2: قياس سرعة عملية**

```javascript
const { perf, wait, log } = playground;

// قياس عملية حسابية
perf.start('Calculation');

let sum = 0;
for (let i = 0; i < 1000000; i++) {
  sum += i;
}

perf.end('Calculation');
log(`النتيجة: ${sum}`);

// عرض التقرير
perf.logReport();
```

---

### **مثال 3: محاكاة تسجيل دفعة**

```javascript
const { cache, toast, wait } = playground;

async function recordPayment(fileId, amount) {
  // قراءة الملف
  const file = cache.get(`execution_${fileId}`);
  
  if (!file) {
    toast.error.loadFailed();
    return;
  }
  
  // تحديث المبلغ المدفوع
  file.paidAmount = (file.paidAmount || 0) + amount;
  
  // حفظ
  cache.set(`execution_${fileId}`, file);
  
  // رسالة نجاح
  toast.success.paymentRecorded(amount);
  
  // حساب المتبقي
  const remaining = file.amount - file.paidAmount;
  
  console.log('📊 التفاصيل:');
  console.table({
    'المبلغ الأصلي': file.amount,
    'المدفوع': file.paidAmount,
    'المتبقي': remaining
  });
  
  if (remaining <= 0) {
    await wait(1000);
    toast.success.debtFullyPaid();
  }
}

// استخدام
// recordPayment(yourFileId, 2000000);
```

---

## 📊 **Checklist التجربة:**

### **اختبرت:**
```
✅ Test Playground (playground.runAll())
✅ Storage Cache (playground.testStorage())
✅ Toast Messages (playground.testToast())
✅ Performance Monitor (playground.testPerformance())
✅ Error Handler (playground.testErrors())
✅ السيناريو الكامل (playground.testScenario())
```

### **جربت:**
```
✅ حفظ وقراءة بيانات
✅ مقارنة السرعة
✅ عرض Toast مختلفة
✅ قياس الأداء
✅ معالجة الأخطاء
```

---

## 🎯 **النتيجة المتوقعة:**

بعد التجربة، يجب أن تكون واضحة لك:

```
✅ storageCache أسرع 5-10 مرات من localStorage
✅ ExecutionToasts رسائل منظمة وواضحة
✅ PerformanceMonitor يكشف المكونات البطيئة
✅ Error Handler يعالج الأخطاء بشكل احترافي
✅ جميع الميزات تعمل بسلاسة
```

---

## 💡 **نصائح للاستخدام:**

### **1. استخدم storageCache دائماً:**
```javascript
// ❌ بطيء
const data = JSON.parse(localStorage.getItem('key'));

// ✅ سريع
const data = playground.cache.get('key');
```

### **2. استخدم Toast Messages المنظمة:**
```javascript
// ❌ غير منظم
SmartToast.success('تم الحفظ');

// ✅ منظم وواضح
playground.toast.success.fileSaved();
```

### **3. راقب الأداء:**
```javascript
// في بداية المكون
playground.perf.start('MyComponent');

// في نهاية المكون
playground.perf.end('MyComponent');

// بعد فترة
playground.perf.logReport();
```

---

## 🐛 **مشكلة؟**

### **إذا لم يعمل playground:**

```javascript
// أعد التحميل:
import('/src/app/test-playground.ts').then(m => {
  window.playground = m.playground;
  console.log('✅ تم تحميل playground بنجاح!');
});
```

### **إذا لم تظهر Toast:**

```javascript
// تحقق من SmartToast:
const { SmartToast } = await import('/src/app/components/ui/SmartToast');
SmartToast.success('اختبار');
```

---

## 🎉 **الخلاصة:**

```
🎮 Test Playground     → أسهل طريقة للتجربة
📊 اختبارات فردية     → اختبار ميزة محددة
🔧 استخدام مباشر      → للاستخدام في الكود
📝 أمثلة عملية        → سيناريوهات حقيقية
```

---

## 🚀 **ابدأ الآن!**

```javascript
// انسخ والصق في Console:
import('/src/app/test-playground.ts')
  .then(m => window.playground = m.playground)
  .then(() => playground.runAll());
```

**💎 استمتع بالتجربة التفاعلية!**

---

**📖 للمزيد:**
- `/INTERACTIVE_TESTING_GUIDE.md` - دليل مفصل
- `/V10.5_QUICK_REFERENCE.md` - مرجع الاستخدام
- `/TEST_V10.5.md` - دليل الاختبار الشامل

</div>
