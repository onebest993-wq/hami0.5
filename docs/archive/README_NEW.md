# 🏛️ نظام ملف الدعوى الذكي - Hami Legal System

<div dir="rtl">

## 📋 ما هو هذا النظام؟

نظام متكامل لإدارة الملفات القانونية للقانون العراقي، مع واجهة احترافية وذكاء اصطناعي.

### الميزات الرئيسية:
- ✅ **ملفات الدعاوى** (مدني/شرعي/جزائي) - 3 مراحل (بداءة/استئناف/تمييز)
- ✅ **ملفات التنفيذ** (منفصلة تماماً عن الدعاوى)
- ✅ **حاسبات قانونية** (نفقة/ميراث/مزادات)
- ✅ **ذكاء اصطناعي** (Gemini + OpenAI)
- ✅ **واجهة Royal** (كحلي وذهبي)
- ✅ **يعمل offline** (مع مزامنة تلقائية)

---

## 🚀 البدء السريع

### 1. التثبيت
```bash
npm install
```

### 2. إعداد Environment Variables
أنشئ ملف `.env` في المجلد الرئيسي:
```env
# Supabase (إلزامي)
SUPABASE_URL=your_project_url
SUPABASE_ANON_KEY=your_anon_key

# AI (اختياري)
GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key
```

### 3. التشغيل
```bash
npm run dev
```
افتح: http://localhost:5173

---

## 🗄️ قاعدة البيانات

### إنشاء الجداول في Supabase

1. افتح لوحة تحكم Supabase
2. اذهب إلى SQL Editor
3. نفّذ الملف: `/supabase/migrations/001_create_legal_tables.sql`

الجداول المنشأة:
- `execution_files` - ملفات التنفيذ
- `lawsuit_files` - ملفات الدعاوى
- `global_notes` - الملاحظات

**الأمان:** Row-Level Security مفعّل تلقائياً ✅

---

## 📦 البنية

```
src/app/
├── components/        # المكونات
│   ├── lawyer/        # لوحة المحامي
│   └── client/        # بوابة العميل
├── services/          # الخدمات
│   ├── DataService.ts # ✨ جديد - طبقة موحدة للبيانات
│   └── ...
└── types/             # TypeScript Types

supabase/
├── functions/server/  # Backend (Hono)
└── migrations/        # Database migrations
```

---

## 🔌 استخدام DataService

### قراءة البيانات
```typescript
import { dataService } from '@/app/services';

// قراءة ملفات التنفيذ
const executionFiles = await dataService.getExecutionFiles();

// قراءة ملفات الدعاوى
const lawsuitFiles = await dataService.getLawsuitFiles();
```

### حفظ البيانات
```typescript
await dataService.saveExecutionFile({
  id: 'unique-id',
  case_no: '2026/123',
  execution_type: 'مدني',
  court: 'محكمة بداءة الكرخ',
  creditor: { name: 'الدائن' },
  debtor: { name: 'المدين' },
  totalAmount: '10000000'
});
```

### حذف البيانات
```typescript
await dataService.deleteExecutionFile('file-id');
```

**ملاحظة:** النظام يعمل offline-first ويزامن تلقائياً عند توفر الاتصال!

---

## 🧪 الاختبارات

```bash
# اختبارات Unit
npm test

# اختبارات E2E
npm run test:e2e

# تقرير التغطية
npm run test:coverage
```

---

## 🔐 الأمان

### ما تم تنفيذه:
- ✅ **Row-Level Security** في Supabase
- ✅ **Rate Limiting** للحماية من DDoS
- ✅ **Input Sanitization** للحماية من XSS
- ✅ **تشفير بسيط** للبيانات الحساسة
- ✅ **Authentication** عبر Supabase Auth

### ما لم يتم تنفيذه (غير ضروري لـ MVP):
- ❌ WebAuthn (بصمة/وجه)
- ❌ تشفير معقد E2EE
- ❌ Privacy Mode

---

## 📚 الوثائق المفيدة

- **[REFACTORING_PLAN.md](REFACTORING_PLAN.md)** - خطة الإصلاح الجذري
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - البنية المعمارية
- **[docs/API.md](docs/API.md)** - توثيق الـ API

---

## 🛠️ التطوير

### هيكل الكود
- **المكونات:** React + TypeScript
- **التنسيق:** Tailwind CSS v4
- **الحركة:** Motion (Framer Motion)
- **الأيقونات:** Lucide React
- **Backend:** Hono (على Supabase Edge Functions)
- **Database:** PostgreSQL (Supabase)

### قواعد الكود
1. **البساطة أولاً** - لا تعقيد غير ضروري
2. **Offline-first** - كل شيء يجب أن يعمل بدون إنترنت
3. **TypeScript Strict** - لا `any` إلا للضرورة
4. **اختبار قبل النشر** - لا مزيد من hotfixes

---

## 🐛 المشاكل الشائعة

### مشكلة: البيانات لا تظهر
**الحل:**
1. تأكد من تسجيل الدخول
2. افحص Console للأخطاء
3. تأكد من إنشاء الجداول في Supabase

### مشكلة: الذكاء الاصطناعي لا يعمل
**الحل:**
1. تأكد من إضافة `GEMINI_API_KEY` في `.env`
2. فعّل Generative Language API في Google Cloud

### مشكلة: Offline mode لا يعمل
**الحل:**
1. DataService يحفظ تلقائياً في localStorage
2. افحص Application → Local Storage في DevTools

---

## 📊 الإحصائيات

```
السطور:       ~15,000 سطر TypeScript
المكونات:     ~60 مكون React
الملفات:      ~150 ملف
الحجم:        ~2MB (مضغوط)
```

---

## 🤝 المساهمة

1. Fork المشروع
2. أنشئ branch جديد (`git checkout -b feature/amazing-feature`)
3. اختبر التعديلات (`npm test`)
4. Commit (`git commit -m 'Add amazing feature'`)
5. Push (`git push origin feature/amazing-feature`)
6. افتح Pull Request

**ملاحظة:** يرجى قراءة [REFACTORING_PLAN.md](REFACTORING_PLAN.md) لفهم الاتجاه الجديد للمشروع.

---

## 📄 الترخيص

هذا المشروع مملوك لـ Hami Legal Tech.

---

## 📞 الدعم

للمشاكل والأسئلة، افتح Issue في GitHub.

---

**تم بناؤه بحب في العراق 🇮🇶**

**الإصدار:** 2.0.0  
**آخر تحديث:** 6 مارس 2026

</div>
