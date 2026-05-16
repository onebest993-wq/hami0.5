# سياسة الأمان - Security Policy

<div dir="rtl">

## 🔒 الإبلاغ عن الثغرات الأمنية

نأخذ أمان التطبيق على محمل الجد. إذا اكتشفت ثغرة أمنية، يرجى **عدم** إنشاء Issue عام.

### كيفية الإبلاغ

1. **أرسل بريد إلكتروني إلى:** security@example.com
2. **استخدم GPG** إذا كانت المعلومات حساسة جداً
3. **قدم تفاصيل كاملة:**
   - وصف الثغرة
   - خطوات إعادة الإنتاج
   - التأثير المحتمل
   - الحل المقترح (إن وُجد)

### ما يمكنك توقعه

- ✅ **تأكيد الاستلام** خلال 24 ساعة
- ✅ **تقييم أولي** خلال 48 ساعة
- ✅ **تحديث منتظم** كل 5-7 أيام
- ✅ **إصلاح** للثغرات الحرجة خلال 7-14 يوماً

---

## 🛡️ الممارسات الأمنية المطبقة

### 1️⃣ **حماية البيانات**

#### Environment Variables
```bash
# ✅ جيد - في .env (مُستثنى من Git)
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=public_key_here

# ❌ خطر - لا ترفع أبداً
SUPABASE_SERVICE_ROLE_KEY=secret_key_here
```

#### Frontend vs Backend
- ✅ **Frontend**: ANON_KEY فقط (آمن للاستخدام العام)
- ❌ **Backend**: SERVICE_ROLE_KEY (سري جداً - في Edge Functions فقط)

### 2️⃣ **المصادقة والتفويض**

```typescript
// ✅ التحقق من المستخدم قبل العمليات الحساسة
const { data: { user }, error } = await supabase.auth.getUser(accessToken);
if (!user) {
  return { error: 'Unauthorized' };
}
```

### 3️⃣ **Input Validation**

```typescript
// ✅ التحقق من صحة البيانات
import { validateTaskData } from '@/app/utils/validationUtils';

const result = validateTaskData(task);
if (!result.isValid) {
  throw new Error(result.errors.join(', '));
}
```

### 4️⃣ **XSS Protection**

```tsx
// ✅ React يحمي تلقائياً من XSS
<div>{userInput}</div>

// ⚠️ استخدم بحذر شديد
<div dangerouslySetInnerHTML={{ __html: sanitizedHTML }} />
```

### 5️⃣ **CSRF Protection**

- ✅ استخدام Supabase Auth Tokens
- ✅ SameSite Cookies
- ✅ CORS محدود

---

## 🚨 الثغرات الشائعة المحمية

### ✅ SQL Injection
**الحماية:** استخدام Supabase Client (parameterized queries تلقائياً)

### ✅ XSS (Cross-Site Scripting)
**الحماية:** React يعمل escape تلقائياً للـ user input

### ✅ CSRF (Cross-Site Request Forgery)
**الحماية:** Supabase JWT Tokens + SameSite Cookies

### ✅ Insecure Direct Object References
**الحماية:** Row Level Security في Supabase

### ✅ Sensitive Data Exposure
**الحماية:** 
- Environment Variables للأسرار
- HTTPS فقط
- لا يوجد logging للبيانات الحساسة

---

## ⚠️ نقاط الضعف المعروفة

### 1. localStorage للبيانات الحساسة

**المشكلة:**
```typescript
// ⚠️ البيانات في localStorage غير مشفرة
localStorage.setItem('case-data', JSON.stringify(sensitiveData));
```

**الحل المخطط:**
- [ ] إضافة encryption للبيانات الحساسة
- [ ] استخدام Supabase للبيانات الحرجة فقط
- [x] Auto-Sync لحماية من الفقدان

### 2. API Keys في Frontend

**المشكلة:**
```typescript
// ⚠️ GEMINI_API_KEY قد يكون مرئياً في الـ bundle
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
```

**الحل الحالي:**
- ✅ استخدام Proxy عبر Edge Functions
- ✅ Rate Limiting في Backend
- ⚠️ يُنصح باستخدام Proxy كامل للـ Production

---

## 🔐 متطلبات الأمان للمساهمين

### قبل إرسال Pull Request

- [ ] لا توجد API Keys مكشوفة في الكود
- [ ] جميع الأسرار في `.env` (مُستثنى من Git)
- [ ] لا يوجد `console.log` للبيانات الحساسة
- [ ] استخدام `debug.log` بدلاً من `console.log`
- [ ] Validation لجميع المدخلات من المستخدم
- [ ] لا توجد SQL queries مباشرة (استخدم Supabase Client)

### مثال على كود آمن

```typescript
// ✅ آمن
import { debug } from '@/app/utils/debug';

async function saveCase(caseData: CaseFile) {
  // 1. Validate Input
  if (!caseData.id) {
    throw new Error('Invalid case data');
  }
  
  // 2. Get User (Authorization)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  
  // 3. Use Supabase Client (Secure)
  const { data, error } = await supabase
    .from('cases')
    .insert({
      ...caseData,
      user_id: user.id // RLS will enforce this
    });
  
  if (error) {
    debug.error('Save failed:', error.message); // لا تطبع البيانات الحساسة
    throw error;
  }
  
  return data;
}
```

---

## 🔍 مراجعة الأمان

### Self-Audit Checklist

قبل Deploy للـ Production، تحقق من:

- [ ] **Environment Variables**: جميع الأسرار في .env
- [ ] **HTTPS**: التطبيق يعمل على HTTPS فقط
- [ ] **Auth**: جميع الـ routes الحساسة محمية
- [ ] **Validation**: جميع المدخلات محققة
- [ ] **Logging**: لا يوجد logging للبيانات الحساسة
- [ ] **Error Messages**: لا تكشف عن معلومات نظام
- [ ] **Dependencies**: جميع الحزم محدثة (بدون ثغرات معروفة)
- [ ] **CORS**: محدود للـ domains الموثوقة فقط
- [ ] **Rate Limiting**: مفعل في Backend
- [ ] **Backups**: نظام backup يعمل بشكل صحيح

### أدوات الفحص المقترحة

```bash
# فحص Dependencies للثغرات الأمنية
pnpm audit

# تحديث الحزم (بحذر)
pnpm update

# فحص TypeScript
pnpm tsc --noEmit

# Linting
pnpm lint
```

---

## 📊 تصنيف الثغرات

### 🔴 **حرجة (Critical)**
- كشف SUPABASE_SERVICE_ROLE_KEY
- SQL Injection
- RCE (Remote Code Execution)
- Authentication Bypass

**الاستجابة:** فورية (< 24 ساعة)

### 🟠 **عالية (High)**
- XSS
- CSRF
- Insecure Direct Object References
- Sensitive Data Exposure

**الاستجابة:** 3-7 أيام

### 🟡 **متوسطة (Medium)**
- Missing Security Headers
- Weak Password Policy
- Rate Limiting Issues

**الاستجابة:** 7-14 يوماً

### 🟢 **منخفضة (Low)**
- Information Disclosure (minor)
- Missing HTTPS في بعض الأجزاء

**الاستجابة:** 14-30 يوماً

---

## 📜 الإصدارات المدعومة

| الإصدار | مدعوم | نهاية الدعم |
|---------|-------|-------------|
| 1.5.x   | ✅ نعم | -           |
| 1.4.x   | ✅ نعم | 2026-05-01  |
| 1.3.x   | ⚠️ محدود | 2026-04-01  |
| < 1.3   | ❌ لا   | منتهي       |

---

## 🏆 شكر وتقدير

نشكر الباحثين الأمنيين التاليين:

- (سيتم إضافة الأسماء عند الإبلاغ)

---

## 📞 الاتصال

- **للثغرات الأمنية:** security@example.com
- **للاستفسارات العامة:** support@example.com
- **للمساهمات:** راجع [CONTRIBUTING.md](CONTRIBUTING.md)

---

**آخر تحديث:** 25 فبراير 2026

</div>
