# API Documentation

<div dir="rtl">

## 📡 واجهات البرمجة (Backend API)

جميع الـ endpoints تعمل عبر Supabase Edge Functions.

**Base URL:**
```
https://{projectId}.supabase.co/functions/v1/make-server-f09713ba
```

**Authentication:**
```typescript
headers: {
  'Authorization': `Bearer ${publicAnonKey}`,
  'Content-Type': 'application/json'
}
```

---

## 1️⃣ Auto-Sync API

### POST `/sync`
**الوصف:** حفظ البيانات للمزامنة التلقائية

**Request Body:**
```typescript
{
  key: string;           // مفتاح البيانات (مثل: 'lawyer-files')
  data: any;             // البيانات المراد حفظها
  timestamp: number;     // وقت الإرسال (Unix timestamp)
}
```

**Response:**
```typescript
{
  success: boolean;
  key: string;
  timestamp: number;     // وقت الحفظ في الخادم
}
```

**مثال:**
```typescript
const response = await fetch(`${baseUrl}/sync`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${publicAnonKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    key: 'lawyer-files',
    data: filesArray,
    timestamp: Date.now()
  })
});

const result = await response.json();
// { success: true, key: 'lawyer-files', timestamp: 1709123456789 }
```

---

### GET `/sync/:key`
**الوصف:** استرجاع البيانات المحفوظة

**Parameters:**
- `key` (path parameter) - مفتاح البيانات

**Response:**
```typescript
{
  success: boolean;
  data: any;             // البيانات المحفوظة
  timestamp: number;     // وقت الحفظ الأصلي
  syncedAt: number;      // وقت الحفظ في الخادم
}
```

**مثال:**
```typescript
const response = await fetch(`${baseUrl}/sync/lawyer-files`, {
  headers: {
    'Authorization': `Bearer ${publicAnonKey}`
  }
});

const result = await response.json();
// { success: true, data: [...], timestamp: 1709123456789, syncedAt: 1709123456790 }
```

---

## 2️⃣ Legal Chat API

### POST `/chat`
**الوصف:** محادثة مع المستشار القانوني الذكي

**Request Body:**
```typescript
{
  message: string;                    // الرسالة النصية
  image?: string;                     // صورة (base64) - اختياري
  audio?: string;                     // صوت (base64) - اختياري
  audio_mime_type?: string;           // نوع الصوت - اختياري
  caseContext?: any;                  // سياق القضية - اختياري
  history?: Array<{                   // تاريخ المحادثة - اختياري
    role: 'user' | 'assistant';
    content: string;
  }>;
  screen_type?: string;               // نوع الشاشة - اختياري
}
```

**Response:**
```typescript
{
  reply: string;                      // الرد النصي
  citations?: string[];               // المصادر القانونية
  confidence?: number;                // درجة الثقة (0-1)
  relatedArticles?: string[];         // مواد قانونية ذات صلة
}
```

**مثال:**
```typescript
const response = await fetch(`${baseUrl}/chat`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${publicAnonKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: 'ما هي شروط قبول الاستئناف؟',
    caseContext: {
      type: 'lawsuit',
      stage: 'بداءة'
    }
  })
});

const result = await response.json();
// { reply: "شروط قبول الاستئناف هي...", citations: [...] }
```

---

## 3️⃣ Legal Memory Search API (RAG)

### POST `/legal-memory-search`
**الوصف:** البحث في القاعدة القانونية باستخدام RAG

**Request Body:**
```typescript
{
  query: string;                      // النص المراد البحث عنه
  filter?: {                          // فلاتر البحث - اختياري
    court?: string;
    year?: number;
    type?: string;
  };
  topK?: number;                      // عدد النتائج (افتراضي: 5)
}
```

**Response:**
```typescript
{
  matches: Array<{
    id: string;
    score: number;                    // درجة التطابق (0-1)
    metadata: {
      text: string;
      source: string;
      court?: string;
      date?: string;
    };
  }>;
  count: number;
}
```

**مثال:**
```typescript
const response = await fetch(`${baseUrl}/legal-memory-search`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${publicAnonKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: 'الاستئناف في الدعاوى المدنية',
    topK: 10
  })
});

const result = await response.json();
// { matches: [...], count: 10 }
```

---

## 4️⃣ AI Legal Brain API

### POST `/ai-legal-brain`
**الوصف:** تحليل قانوني متقدم باستخدام Gemini AI

**Request Body:**
```typescript
{
  type: 'text' | 'document' | 'audio';
  content: string;                    // المحتوى (نص أو base64)
  context?: {
    caseType?: string;
    parties?: string[];
    court?: string;
  };
}
```

**Response:**
```typescript
{
  analysis: string;                   // التحليل القانوني
  recommendations: string[];          // التوصيات
  risks: string[];                    // المخاطر المحتملة
  nextSteps: string[];                // الخطوات التالية
}
```

---

## 5️⃣ Smart Counterpart Prediction API

### POST `/smart-counterpart`
**الوصف:** التنبؤ بالطرف الآخر ونوع الدعوى

**Request Body:**
```typescript
{
  party1: string;                     // اسم الطرف الأول
  court: string;                      // اسم المحكمة
}
```

**Response:**
```typescript
{
  legalReasoning: string;             // التحليل القانوني
  firstPartyCorrection: string;       // تصحيح الاسم
  secondParty: string;                // الطرف الثاني المتوقع
  caseType: string;                   // نوع الدعوى المتوقع
  sourceLink?: string;                // مصدر قانوني
}
```

---

## 🔒 Authentication & Security

### API Key Management

**Frontend (Public):**
```typescript
// ✅ آمن - يمكن استخدامه في الـ frontend
const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

**Backend (Private):**
```typescript
// ⚠️ سري - للاستخدام في Edge Functions فقط
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
```

### Rate Limiting

- **Default:** 60 requests / minute
- **Burst:** 100 requests / minute
- **Daily limit:** 10,000 requests

### Error Handling

جميع الـ endpoints ترجع أخطاء موحدة:

```typescript
{
  error: string;                      // رسالة الخطأ
  code?: string;                      // كود الخطأ
  details?: any;                      // تفاصيل إضافية
}
```

**أكواد الأخطاء الشائعة:**
- `400` - Bad Request (بيانات غير صحيحة)
- `401` - Unauthorized (غير مصرح)
- `403` - Forbidden (ممنوع)
- `404` - Not Found (غير موجود)
- `429` - Too Many Requests (طلبات كثيرة)
- `500` - Internal Server Error (خطأ في الخادم)

---

## 📊 Usage Examples

### مثال كامل: حفظ ملف دعوى

```typescript
import { projectId, publicAnonKey } from '/utils/supabase/info';

const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-f09713ba`;

// 1. حفظ الملف
const caseFile = {
  id: 'case-123',
  caseNo: '2026/ب/100',
  court: 'بداءة الكرخ',
  parties: [...]
};

const saveResponse = await fetch(`${baseUrl}/sync`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${publicAnonKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    key: 'case-123',
    data: caseFile,
    timestamp: Date.now()
  })
});

if (!saveResponse.ok) {
  throw new Error('Failed to save case');
}

// 2. استرجاع الملف
const getResponse = await fetch(`${baseUrl}/sync/case-123`, {
  headers: {
    'Authorization': `Bearer ${publicAnonKey}`
  }
});

const { data } = await getResponse.json();
console.log('Retrieved case:', data);
```

---

## 🧪 Testing

### استخدام cURL

```bash
# حفظ بيانات
curl -X POST https://your-project.supabase.co/functions/v1/make-server-f09713ba/sync \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "test-key",
    "data": {"test": "value"},
    "timestamp": 1709123456789
  }'

# استرجاع بيانات
curl https://your-project.supabase.co/functions/v1/make-server-f09713ba/sync/test-key \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

---

## 📝 Best Practices

1. **استخدم Keys بشكل صحيح**
   - ANON_KEY للـ frontend
   - SERVICE_ROLE_KEY للـ backend فقط

2. **معالجة الأخطاء**
   ```typescript
   try {
     const response = await fetch(...);
     if (!response.ok) throw new Error(`HTTP ${response.status}`);
     const data = await response.json();
   } catch (error) {
     console.error('API Error:', error);
     // معالجة الخطأ
   }
   ```

3. **Retry Logic**
   ```typescript
   const fetchWithRetry = async (url, options, retries = 3) => {
     for (let i = 0; i < retries; i++) {
       try {
         return await fetch(url, options);
       } catch (error) {
         if (i === retries - 1) throw error;
         await new Promise(r => setTimeout(r, 1000 * (i + 1)));
       }
     }
   };
   ```

4. **Caching**
   ```typescript
   const cache = new Map();
   
   const fetchWithCache = async (key) => {
     if (cache.has(key)) return cache.get(key);
     
     const data = await fetch(...);
     cache.set(key, data);
     return data;
   };
   ```

---

**آخر تحديث:** 25 فبراير 2026

</div>
