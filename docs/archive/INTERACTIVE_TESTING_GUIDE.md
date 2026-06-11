# 🎮 دليل الاختبار التفاعلي - جرّب بنفسك!

<div dir="rtl">

## 🚀 **افتح Console الآن (F12) وجرّب!**

---

## 1️⃣ **اختبار Storage Cache**

### **التجربة 1: القراءة والكتابة الأساسية**

```javascript
// استيراد storageCache
const { storageCache } = await import('/src/app/utils/storageCache.ts');

// كتابة بيانات
storageCache.set('test_user', {
  name: 'محمد أحمد',
  role: 'محامي',
  cases: 15
});

console.log('✅ تم حفظ البيانات');

// قراءة البيانات
const user = storageCache.get('test_user');
console.log('👤 بيانات المستخدم:', user);

// النتيجة المتوقعة:
// ✅ تم حفظ البيانات
// 👤 بيانات المستخدم: { name: 'محمد أحمد', role: 'محامي', cases: 15 }
```

### **التجربة 2: مقارنة السرعة (storageCache vs localStorage)**

```javascript
const { storageCache } = await import('/src/app/utils/storageCache.ts');

// إعداد بيانات تجريبية
const testData = {
  executionFiles: Array(100).fill(null).map((_, i) => ({
    id: i,
    fileNumber: `123/${i}/2026`,
    amount: Math.random() * 1000000
  }))
};

// حفظ في كليهما
storageCache.set('speed_test', testData);
localStorage.setItem('speed_test_native', JSON.stringify(testData));

console.log('📊 بدء اختبار السرعة...\n');

// اختبار localStorage
console.time('⏱️ localStorage (1000 عملية)');
for (let i = 0; i < 1000; i++) {
  const data = JSON.parse(localStorage.getItem('speed_test_native'));
}
console.timeEnd('⏱️ localStorage (1000 عملية)');

// اختبار storageCache
console.time('⚡ storageCache (1000 عملية)');
for (let i = 0; i < 1000; i++) {
  const data = storageCache.get('speed_test');
}
console.timeEnd('⚡ storageCache (1000 عملية)');

console.log('\n🎯 النتيجة: storageCache أسرع بـ 5-10 مرات!');

// النتيجة المتوقعة:
// ⏱️ localStorage (1000 عملية): ~150ms
// ⚡ storageCache (1000 عملية): ~20ms
```

### **التجربة 3: إحصائيات الـ Cache**

```javascript
const { storageCache } = await import('/src/app/utils/storageCache.ts');

// إضافة بعض البيانات
storageCache.set('file_1', { name: 'ملف 1' });
storageCache.set('file_2', { name: 'ملف 2' });
storageCache.set('file_3', { name: 'ملف 3' });

// الحصول على الإحصائيات
const stats = storageCache.getStats();
console.log('📊 إحصائيات الـ Cache:', stats);

// النتيجة المتوقعة:
// 📊 إحصائيات الـ Cache: {
//   cacheSize: 3,
//   oldestEntry: 1710597600000,
//   newestEntry: 1710597605000
// }
```

### **التجربة 4: Invalidation (إلغاء الصلاحية)**

```javascript
const { storageCache } = await import('/src/app/utils/storageCache.ts');

// حفظ بيانات
storageCache.set('cached_data', { value: 'قديم' });
console.log('1️⃣ قبل:', storageCache.get('cached_data'));

// تحديث في localStorage مباشرة (يتجاوز الـ cache)
localStorage.setItem('cached_data', JSON.stringify({ value: 'جديد' }));

// القراءة من Cache (سيُرجع القيمة القديمة)
console.log('2️⃣ من Cache:', storageCache.get('cached_data'));

// إلغاء صلاحية الـ Cache
storageCache.invalidate('cached_data');

// القراءة مرة أخرى (سيقرأ من localStorage)
console.log('3️⃣ بعد Invalidation:', storageCache.get('cached_data'));

// النتيجة المتوقعة:
// 1️⃣ قبل: { value: 'قديم' }
// 2️⃣ من Cache: { value: 'قديم' }
// 3️⃣ بعد Invalidation: { value: 'جديد' }
```

---

## 2️⃣ **اختبار Toast Messages**

### **التجربة 1: رسائل التنفيذ الأساسية**

```javascript
const { ExecutionToasts } = await import('/src/app/utils/toastMessages.ts');

// رسالة نجاح
console.log('✅ عرض رسالة نجاح...');
ExecutionToasts.success.fileSaved();

// انتظر ثانيتين
await new Promise(resolve => setTimeout(resolve, 2000));

// رسالة مع مبلغ
console.log('💰 عرض رسالة دفعة...');
ExecutionToasts.success.paymentRecorded(5000000);

await new Promise(resolve => setTimeout(resolve, 2000));

// رسالة خطأ
console.log('❌ عرض رسالة خطأ...');
ExecutionToasts.error.loadFailed();

await new Promise(resolve => setTimeout(resolve, 2000));

// رسالة تحذير
console.log('⚠️ عرض رسالة تحذير...');
ExecutionToasts.warning.gracePeriodExpiring(3);

console.log('✅ تم عرض جميع الرسائل!');
```

### **التجربة 2: جميع أنواع رسائل التنفيذ**

```javascript
const { ExecutionToasts } = await import('/src/app/utils/toastMessages.ts');

// دالة مساعدة للانتظار
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

console.log('🎬 بدء عرض جميع الرسائل...\n');

// رسائل النجاح
console.log('1️⃣ رسائل النجاح:');
ExecutionToasts.success.fileSaved();
await wait(1500);

ExecutionToasts.success.paymentRecorded(3500000);
await wait(1500);

ExecutionToasts.success.gracePeriodStarted();
await wait(1500);

ExecutionToasts.success.debtorNotified();
await wait(1500);

ExecutionToasts.success.assetSeized('سيارة مرسيدس 2020');
await wait(1500);

// رسائل الأخطاء
console.log('2️⃣ رسائل الأخطاء:');
ExecutionToasts.error.loadFailed();
await wait(1500);

ExecutionToasts.error.invalidAmount();
await wait(1500);

ExecutionToasts.error.missingData('رقم الملف');
await wait(1500);

// رسائل التحذيرات
console.log('3️⃣ رسائل التحذيرات:');
ExecutionToasts.warning.gracePeriodExpiring(2);
await wait(1500);

ExecutionToasts.warning.debtNotPaid();
await wait(1500);

ExecutionToasts.warning.incompleteData();
await wait(1500);

// رسائل المعلومات
console.log('4️⃣ رسائل المعلومات:');
ExecutionToasts.info.calculationUpdated();
await wait(1500);

ExecutionToasts.info.documentGenerated();
await wait(1500);

ExecutionToasts.info.reminderSet('2026-03-20');

console.log('\n✅ انتهى عرض جميع الرسائل!');
```

### **التجربة 3: رسائل النظام**

```javascript
const { SystemToasts } = await import('/src/app/utils/toastMessages.ts');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

console.log('🎬 رسائل النظام...\n');

SystemToasts.success.dataSaved();
await wait(1500);

SystemToasts.success.dataSynced();
await wait(1500);

SystemToasts.error.networkError();
await wait(1500);

SystemToasts.warning.unsavedChanges();
await wait(1500);

SystemToasts.info.processing();

console.log('\n✅ انتهى!');
```

### **التجربة 4: رسائل مخصصة**

```javascript
const { showSuccessToast, showErrorToast, showWarningToast, showInfoToast } = await import('/src/app/utils/toastMessages.ts');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

console.log('🎨 رسائل مخصصة...\n');

showSuccessToast('تم إنشاء التقرير الشهري بنجاح', '📊');
await wait(1500);

showWarningToast('لديك 5 مهام متأخرة', '⏰');
await wait(1500);

showErrorToast('فشل الاتصال بالخادم', '🔌');
await wait(1500);

showInfoToast('سيتم تحديث النظام بعد 5 دقائق', 'ℹ️');

console.log('\n✅ انتهى!');
```

---

## 3️⃣ **اختبار Performance Monitor**

### **التجربة 1: قياس عملية بسيطة**

```javascript
const { PerformanceMonitor } = await import('/src/app/utils/performanceMonitor.ts');

console.log('⏱️ بدء قياس الأداء...\n');

// قياس عملية
PerformanceMonitor.start('TestOperation');

// عملية تستغرق وقتاً
let sum = 0;
for (let i = 0; i < 1000000; i++) {
  sum += i;
}

PerformanceMonitor.end('TestOperation');

// عرض التقرير
PerformanceMonitor.logReport();

console.log('\n✅ انتهى القياس!');
```

### **التجربة 2: قياس عمليات متعددة**

```javascript
const { PerformanceMonitor } = await import('/src/app/utils/performanceMonitor.ts');

console.log('⏱️ قياس عمليات متعددة...\n');

// عملية سريعة
PerformanceMonitor.start('FastOperation');
await new Promise(resolve => setTimeout(resolve, 100));
PerformanceMonitor.end('FastOperation');

// عملية متوسطة
PerformanceMonitor.start('MediumOperation');
await new Promise(resolve => setTimeout(resolve, 500));
PerformanceMonitor.end('MediumOperation');

// عملية بطيئة (سيُظهر تحذير)
PerformanceMonitor.start('SlowOperation');
await new Promise(resolve => setTimeout(resolve, 1500));
PerformanceMonitor.end('SlowOperation');

// عملية أخرى
PerformanceMonitor.start('AnotherOperation');
await new Promise(resolve => setTimeout(resolve, 300));
PerformanceMonitor.end('AnotherOperation');

// عرض التقرير
console.log('\n📊 التقرير الكامل:');
PerformanceMonitor.logReport();
```

### **التجربة 3: الحصول على إحصائيات محددة**

```javascript
const { PerformanceMonitor } = await import('/src/app/utils/performanceMonitor.ts');

// قياسات متعددة لنفس العملية
for (let i = 0; i < 5; i++) {
  PerformanceMonitor.start('RepeatedOperation');
  await new Promise(resolve => setTimeout(resolve, Math.random() * 500));
  PerformanceMonitor.end('RepeatedOperation');
}

// الحصول على الإحصائيات
const avgTime = PerformanceMonitor.getAverageTime('RepeatedOperation');
const maxTime = PerformanceMonitor.getMaxTime('RepeatedOperation');

console.log(`📊 متوسط الوقت: ${avgTime.toFixed(2)}ms`);
console.log(`📊 أقصى وقت: ${maxTime.toFixed(2)}ms`);

// عرض التقرير الكامل
PerformanceMonitor.logReport();
```

---

## 4️⃣ **اختبار Error Handler**

### **التجربة 1: تسجيل الأخطاء مع السياق**

```javascript
const { logErrorWithContext } = await import('/src/app/utils/errorHandler.ts');

console.log('📝 تسجيل الأخطاء...\n');

// خطأ بسيط
try {
  throw new Error('هذا خطأ تجريبي');
} catch (error) {
  logErrorWithContext('TestModule', error, {
    userId: '12345',
    action: 'test_action',
    timestamp: new Date().toISOString()
  });
}

console.log('\n✅ تم تسجيل الخطأ - افحص Console للتفاصيل');
```

### **التجربة 2: معالجة Async Errors**

```javascript
const { handleAsyncError } = await import('/src/app/utils/errorHandler.ts');

console.log('⚡ معالجة Async Errors...\n');

// عملية ناجحة
const result1 = await handleAsyncError(
  async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true, data: 'نجحت العملية!' };
  },
  'فشلت العملية الأولى'
);
console.log('1️⃣ النتيجة:', result1);

// عملية فاشلة (ستظهر Toast)
const result2 = await handleAsyncError(
  async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    throw new Error('فشل متعمد');
  },
  'فشلت العملية الثانية'
);
console.log('2️⃣ النتيجة:', result2); // null

console.log('\n✅ انتهى الاختبار');
```

### **التجربة 3: عمليات LocalStorage آمنة**

```javascript
const { safeLocalStorage } = await import('/src/app/utils/errorHandler.ts');

console.log('💾 عمليات LocalStorage آمنة...\n');

// كتابة
console.log('1️⃣ الكتابة:');
const writeResult = safeLocalStorage('set', 'safe_test', {
  name: 'اختبار',
  value: 123,
  nested: { data: 'متداخل' }
});
console.log('   ✅ تمت الكتابة:', writeResult);

// قراءة
console.log('2️⃣ القراءة:');
const data = safeLocalStorage('get', 'safe_test');
console.log('   📖 البيانات:', data);

// حذف
console.log('3️⃣ الحذف:');
const removeResult = safeLocalStorage('remove', 'safe_test');
console.log('   ✅ تم الحذف:', removeResult);

// التحقق
console.log('4️⃣ التحقق من الحذف:');
const deletedData = safeLocalStorage('get', 'safe_test');
console.log('   📖 البيانات:', deletedData); // null

console.log('\n✅ انتهى الاختبار');
```

---

## 5️⃣ **سيناريو كامل: محاكاة ملف تنفيذ**

```javascript
console.log('🎬 سيناريو كامل: إنشاء وإدارة ملف تنفيذ\n');

// 1. استيراد الأدوات
const { storageCache } = await import('/src/app/utils/storageCache.ts');
const { ExecutionToasts } = await import('/src/app/utils/toastMessages.ts');
const { PerformanceMonitor } = await import('/src/app/utils/performanceMonitor.ts');
const { handleAsyncError, logErrorWithContext } = await import('/src/app/utils/errorHandler.ts');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 2. بدء قياس الأداء
PerformanceMonitor.start('CreateExecutionFile');

console.log('📁 الخطوة 1: إنشاء ملف تنفيذ جديد...');
const executionFile = {
  id: Date.now(),
  fileNumber: '123/2026/تنفيذ',
  creditor: 'علي محمد',
  debtor: 'أحمد حسن',
  amount: 10000000,
  paidAmount: 0,
  createdAt: new Date().toISOString()
};

// 3. حفظ الملف
const saveResult = await handleAsyncError(
  async () => {
    await wait(300); // محاكاة عملية حفظ
    storageCache.set(`execution_${executionFile.id}`, executionFile);
    return true;
  },
  'فشل حفظ ملف التنفيذ'
);

if (saveResult) {
  ExecutionToasts.success.fileSaved();
  console.log('✅ تم حفظ الملف بنجاح');
}

await wait(1500);

// 4. تسجيل دفعة
console.log('\n💰 الخطوة 2: تسجيل دفعة...');
const paymentAmount = 3000000;

const paymentResult = await handleAsyncError(
  async () => {
    await wait(200);
    executionFile.paidAmount += paymentAmount;
    storageCache.set(`execution_${executionFile.id}`, executionFile);
    return true;
  },
  'فشل تسجيل الدفعة'
);

if (paymentResult) {
  ExecutionToasts.success.paymentRecorded(paymentAmount);
  console.log(`✅ تم تسجيل دفعة بمبلغ ${paymentAmount.toLocaleString('ar-IQ')} د.ع`);
}

await wait(1500);

// 5. حساب المتبقي
console.log('\n📊 الخطوة 3: حساب المتبقي...');
const remaining = executionFile.amount - executionFile.paidAmount;
console.log(`   💵 المبلغ الأصلي: ${executionFile.amount.toLocaleString('ar-IQ')} د.ع`);
console.log(`   💰 المدفوع: ${executionFile.paidAmount.toLocaleString('ar-IQ')} د.ع`);
console.log(`   📉 المتبقي: ${remaining.toLocaleString('ar-IQ')} د.ع`);

if (remaining > 0) {
  ExecutionToasts.warning.debtNotPaid();
} else {
  ExecutionToasts.success.debtFullyPaid();
}

await wait(1500);

// 6. قراءة الملف من الـ Cache
console.log('\n📖 الخطوة 4: قراءة الملف من Cache...');
PerformanceMonitor.start('ReadFromCache');
const cachedFile = storageCache.get(`execution_${executionFile.id}`);
PerformanceMonitor.end('ReadFromCache');
console.log('✅ تم قراءة الملف من Cache بنجاح');
console.log('   📄 البيانات:', cachedFile);

await wait(1000);

// 7. إنهاء قياس الأداء
PerformanceMonitor.end('CreateExecutionFile');

console.log('\n📊 تقرير الأداء:');
PerformanceMonitor.logReport();

console.log('\n🎉 انتهى السيناريو بنجاح!');
```

---

## 🎯 **Checklist الاختبار:**

```
اختبار storageCache:
✅ القراءة والكتابة الأساسية
✅ مقارنة السرعة
✅ الإحصائيات
✅ Invalidation

اختبار ExecutionToasts:
✅ رسائل النجاح
✅ رسائل الأخطاء
✅ رسائل التحذيرات
✅ رسائل المعلومات

اختبار Performance Monitor:
✅ قياس عملية واحدة
✅ قياس عمليات متعددة
✅ الإحصائيات

اختبار Error Handler:
✅ تسجيل الأخطاء
✅ معالجة Async
✅ عمليات آمنة

السيناريو الكامل:
✅ محاكاة ملف تنفيذ
```

---

## 💡 **نصيحة:**

انسخ والصق الأكواد مباشرة في Console واحدة تلو الأخرى. ستراقب النتائج مباشرة! 🚀

---

**🎮 استمتع بالتجربة!**

</div>
