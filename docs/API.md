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
