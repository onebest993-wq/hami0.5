# ⚡ دليل البدء السريع - استرجاع النظام

<div dir="rtl">

## 🎯 **ابدأ في 5 دقائق!**

---

## ✅ **الخطوة 1: تشغيل التطبيق (دقيقة واحدة)**

```bash
npm run dev
```

**المتوقع:**
```
✅ VITE v7.3.1  ready in XXX ms
✅ Local:   http://localhost:5173/
✅ Network: http://192.168.x.x:5173/
```

**افتح المتصفح:**
```
http://localhost:5173
```

---

## ✅ **الخطوة 2: فحص Console (دقيقة واحدة)**

**افتح DevTools Console (F12)**

**يجب أن ترى:**
```
✅ [App] System Ready
✅ [LawyerDashboard] Loaded
```

**يجب ألا ترى:**
```
❌ Failed to fetch dynamically imported module
❌ Failed to resolve import
❌ Module not found
❌ Adjacent JSX elements must be wrapped
```

---

## ✅ **الخطوة 3: اختبار تسجيل الدخول (دقيقة واحدة)**

1. **اختر:** "أنا محامي"
2. **أدخل:** أي بريد إلكتروني وكلمة مرور
3. **انقر:** تسجيل دخول

**المتوقع:**
```
✅ تظهر لوحة تحكم المحامي
✅ لا أخطاء في Console
```

---

## ✅ **الخطوة 4: اختبار ملف التنفيذ (دقيقتان)**

### أ) إنشاء ملف تنفيذ جديد:

1. **انقر:** زر "+" أو "إضافة ملف تنفيذ"
2. **املأ البيانات الأساسية:**
   - رقم الإضبارة: `2026/TEST`
   - نوع التنفيذ: `مدني`
   - المحكمة: `محكمة الاختبار`
   - اسم الدائن: `دائن تجريبي`
   - اسم المدين: `مدين تجريبي`
   - المبلغ: `1000000`

3. **انقر:** حفظ

**المتوقع:**
```
✅ رسالة نجاح (Toast)
✅ الملف يظهر في القائمة
```

### ب) فتح لوحة التنفيذ:

1. **انقر:** على الملف الذي أنشأته
2. **يجب أن يفتح:** ExecutionDashboard

**المتوقع:**
```
✅ تظهر لوحة التحكم بدون أخطاء
✅ تظهر بيانات الملف
✅ تظهر الأزرار الـ6
✅ Timeline يعمل
✅ Financial Operations Center يعمل
```

---

## 🔍 **التشخيص السريع:**

### ❌ **المشكلة: التطبيق لا يُحمّل**

**الحلول:**

#### 1. فحص المكتبات

```bash
# إعادة تثبيت
rm -rf node_modules package-lock.json
npm install
npm run dev
```

#### 2. مسح الذاكرة المؤقتة

```bash
# في المتصفح Console (F12):
localStorage.clear();
sessionStorage.clear();
location.reload();
```

#### 3. Hard Refresh

```bash
# Windows/Linux: Ctrl + Shift + R
# Mac: Cmd + Shift + R
```

---

### ❌ **المشكلة: أخطاء في Console**

#### خطأ: "Failed to resolve import"

**السبب:** مشكلة في مسارات الاستيراد

**الحل:**
```bash
# تحقق من vite.config.ts
# يجب أن يحتوي على:
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
    '@/app': path.resolve(__dirname, './src/app'),
  },
}
```

#### خطأ: "Adjacent JSX elements must be wrapped"

**السبب:** مشكلة في بنية JSX

**الحل:**
```typescript
// خطأ ❌
return (
  <div>...</div>
  <div>...</div>
)

// صحيح ✅
return (
  <>
    <div>...</div>
    <div>...</div>
  </>
)
```

#### خطأ: "Module not found"

**السبب:** ملف مفقود أو مسار خاطئ

**الحل:**
```bash
# تحقق من وجود الملف
ls -la src/app/components/lawyer/ExecutionDashboard.tsx

# إذا لم يكن موجوداً، أخبرني!
```

---

### ❌ **المشكلة: البيانات لا تُحفظ**

**الحلول:**

#### 1. فحص LocalStorage

```javascript
// في Console:
console.log(localStorage.length); // يجب أن يكون > 0
console.log(Object.keys(localStorage));
```

#### 2. فحص الأذونات

```javascript
// في Console:
try {
  localStorage.setItem('test', 'test');
  console.log('✅ LocalStorage يعمل');
} catch (e) {
  console.error('❌ LocalStorage معطّل:', e);
}
```

#### 3. تفعيل Cookies

```
الإعدادات → الخصوصية → السماح بالكوكيز
```

---

### ❌ **المشكلة: ExecutionDashboard لا يفتح**

**الحلول:**

#### 1. فحص الملف

```javascript
// في Console:
const file = localStorage.getItem('execution_files');
console.log(JSON.parse(file));
```

#### 2. فحص الاستيرادات

```typescript
// في LawyerDashboard.tsx
import { ExecutionDashboard } from './ExecutionDashboard'; // ✅

// وليس:
import ExecutionDashboard from './ExecutionDashboard'; // ❌
```

#### 3. فحص Props

```typescript
// يجب تمرير:
<ExecutionDashboard
  file={activeFile}         // ✅ الملف
  executionId={file.id}     // ✅ المعرّف
  onClose={() => {...}}     // ✅ دالة الإغلاق
  onUpdate={(data) => {...}} // ✅ دالة التحديث
/>
```

---

## 📊 **Checklist النجاح:**

```markdown
### الأساسيات
- [x] التطبيق يُحمّل بدون أخطاء
- [x] Console نظيف
- [x] يمكن تسجيل الدخول
- [x] لوحة التحكم تظهر

### ملفات التنفيذ
- [x] يمكن إنشاء ملف جديد
- [x] الملف يُحفظ في LocalStorage
- [x] الملف يظهر في القائمة
- [x] يمكن فتح الملف

### ExecutionDashboard
- [x] يفتح بدون أخطاء
- [x] البيانات تظهر بشكل صحيح
- [x] الأزرار تعمل
- [x] Timeline يعمل
- [x] Financial Operations Center يعمل

### الأداء
- [x] التحميل سريع (< 3 ثوان)
- [x] لا تهنيج
- [x] Animations سلسة
```

---

## 🎯 **الخطوات التالية:**

### ✅ **إذا كل شيء يعمل:**

1. اقرأ: `/REBUILD_PLAN.md` للتحسينات
2. اقرأ: `/RESTORATION_REPORT_2026-03-16.md` للتفاصيل
3. قرر: ما هي الأولويات؟

### ❌ **إذا هناك مشاكل:**

1. **اتبع خطوات التشخيص أعلاه**
2. **انسخ رسالة الخطأ من Console**
3. **أخبرني بالتفاصيل:**
   - ما هي المشكلة بالضبط؟
   - متى تحدث؟
   - ما هي الخطوات لإعادة إنتاجها؟

---

## 💡 **نصائح مهمة:**

### 1. استخدم DevTools دائماً

```
F12 → Console → راقب الأخطاء
F12 → Network → راقب الطلبات
F12 → Application → راقب LocalStorage
```

### 2. احتفظ بنسخة احتياطية

```javascript
// في Console قبل أي تعديل:
const backup = {};
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  backup[key] = localStorage.getItem(key);
}
console.save(backup, 'backup.json'); // إذا كان متوفراً
// أو:
copy(JSON.stringify(backup)); // نسخ إلى Clipboard
```

### 3. اختبر على متصفحات مختلفة

```
✅ Chrome (الموصى به)
✅ Firefox
⚠️ Safari (قد توجد مشاكل مع LocalStorage)
⚠️ Edge (نسخة قديمة قد لا تعمل)
```

---

## 📞 **احتاج مساعدة؟**

### الملفات المفيدة:

```
1. /RESTORATION_REPORT_2026-03-16.md  (حالة النظام الحالية)
2. /REBUILD_PLAN.md                   (خطة التحسينات)
3. /README.md                         (التوثيق العام)
4. /START_HERE.md                     (دليل البدء)
```

### معلومات مهمة للدعم:

عند طلب المساعدة، أرسل:

```
1. ✅ لقطة شاشة من Console
2. ✅ وصف المشكلة
3. ✅ الخطوات لإعادة إنتاجها
4. ✅ المتصفح والإصدار
5. ✅ نظام التشغيل
```

---

## 🎉 **تهانينا!**

إذا وصلت هنا وكل شيء يعمل، فأنت جاهز للبدء! 🚀

**الخطوة التالية:**
```
اقرأ /REBUILD_PLAN.md وقرر ما تريد استرجاعه أولاً
```

**💪 أنا هنا لمساعدتك في كل خطوة!**

</div>
