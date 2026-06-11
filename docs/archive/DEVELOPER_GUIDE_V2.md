# 👨‍💻 دليل المطور - نظام حامي القانوني v2.0

**آخر تحديث:** 16 مارس 2026  
**الإصدار:** 2.0.0

---

## 📚 المحتويات

1. [البدء السريع](#البدء-السريع)
2. [بنية المشروع](#بنية-المشروع)
3. [إدارة الحالة (State Management)](#إدارة-الحالة)
4. [التخزين المحلي](#التخزين-المحلي)
5. [تحسينات الأداء](#تحسينات-الأداء)
6. [معالجة الأخطاء](#معالجة-الأخطاء)
7. [أفضل الممارسات](#أفضل-الممارسات)

---

## 🚀 البدء السريع

### التثبيت
```bash
npm install
```

### التشغيل (Development)
```bash
npm run dev
```

### البناء (Production)
```bash
npm run build
```

### تحليل Bundle
```bash
npm run build:analyze
# سيفتح dist/stats.html تلقائياً
```

### الاختبارات
```bash
npm run test              # Unit tests
npm run test:e2e          # End-to-end tests
npm run test:coverage     # Coverage report
```

---

## 🏗️ بنية المشروع

```
src/app/
├── components/          # المكونات
│   ├── lawyer/         # مكونات المحامي
│   ├── client/         # مكونات العميل
│   ├── shared/         # مكونات مشتركة
│   └── ui/             # مكتبة UI
├── stores/             # ✅ Zustand stores (موحّد)
│   ├── appStore.ts
│   ├── executionDashboardStore.ts
│   ├── executionFormStore.ts
│   ├── ghostStore.ts
│   ├── caseStore.ts
│   ├── notificationStore.ts
│   ├── ragStore.ts
│   └── index.ts
├── services/           # الخدمات
│   ├── DataService.ts
│   ├── IndexedDBService.ts  # ✅ جديد
│   ├── SupabaseService.ts
│   └── index.ts
├── hooks/              # Custom Hooks
│   ├── useExecutionDashboard.ts  # ✅ جديد
│   └── index.ts
├── utils/              # أدوات مساعدة
│   ├── reactOptimizations.ts  # ✅ جديد
│   └── ...
└── types/              # TypeScript Types
```

---

## 🗄️ إدارة الحالة

### استخدام Zustand Stores

#### 1. Global App Store
```typescript
import { useAppStore } from '@/app/stores';

function MyComponent() {
  const isAuthenticated = useAppStore(state => state.isAuthenticated);
  const login = useAppStore(state => state.login);
  
  // استخدام selectors محسّنة
  const currentUser = useAppStore(selectCurrentUser);
}
```

#### 2. Execution Dashboard Store
```typescript
import { useExecutionDashboard } from '@/app/hooks';

function ExecutionDashboard() {
  const {
    modals,
    openModal,
    closeModal,
    activeBottomTab,
    setActiveBottomTab,
  } = useExecutionDashboard();

  return (
    <div>
      <button onClick={() => openModal('notes')}>
        فتح الملاحظات
      </button>
      {modals.notes && (
        <NotesModal onClose={() => closeModal('notes')} />
      )}
    </div>
  );
}
```

#### 3. Case Store
```typescript
import { useCaseStore } from '@/app/stores';

function CaseList() {
  const cases = useCaseStore(state => state.cases);
  const addCase = useCaseStore(state => state.addCase);
  const deleteCase = useCaseStore(state => state.deleteCase);
}
```

---

## 💾 التخزين المحلي

### IndexedDB Service (للبيانات الكبيرة)

#### حفظ ملفات التنفيذ
```typescript
import { indexedDBService } from '@/app/services';

// حفظ ملف واحد
await indexedDBService.saveExecutionFile(executionFile);

// جلب جميع الملفات
const files = await indexedDBService.getAllExecutionFiles();

// جلب ملف محدد
const file = await indexedDBService.getExecutionFile('file-id');

// حذف ملف
await indexedDBService.deleteExecutionFile('file-id');
```

#### حفظ المستندات الكبيرة
```typescript
// حفظ PDF أو صورة
const pdfBlob = new Blob([pdfData], { type: 'application/pdf' });

await indexedDBService.saveDocument(
  'doc-123',           // Document ID
  'execution-456',     // Execution ID
  'عقد.pdf',           // File name
  'application/pdf',   // MIME type
  pdfBlob              // File data
);

// جلب مستندات ملف تنفيذ معين
const docs = await indexedDBService.getDocumentsByExecution('execution-456');
```

#### معرفة حجم التخزين
```typescript
const { usage, quota, percentage } = 
  await indexedDBService.getStorageEstimate();

console.log(`Used: ${(usage / 1024 / 1024).toFixed(2)} MB`);
console.log(`Quota: ${(quota / 1024 / 1024).toFixed(2)} MB`);
console.log(`Percentage: ${percentage.toFixed(2)}%`);
```

### LocalStorage (للبيانات الصغيرة فقط)
```typescript
import { storageCache } from '@/app/utils/storageCache';

// حفظ
storageCache.set('key', value);

// جلب
const value = storageCache.get('key');

// حذف
storageCache.remove('key');
```

---

## ⚡ تحسينات الأداء

### 1. React.memo الذكي

```typescript
import { smartMemo } from '@/app/utils/reactOptimizations';

// إعادة الرسم فقط عند تغيير 'id'
const MyComponent = smartMemo(({ id, name, data }) => {
  return <div>{name}</div>;
}, ['id']);
```

### 2. useStableCallback

```typescript
import { useStableCallback } from '@/app/utils/reactOptimizations';

function MyComponent() {
  // لن تتغير هذه الدالة في كل render
  const handleClick = useStableCallback(() => {
    console.log('Clicked!');
  });

  return <button onClick={handleClick}>Click</button>;
}
```

### 3. Debounced Input

```typescript
import { useDebounce } from '@/app/utils/reactOptimizations';

function SearchBar() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    // سيتم استدعاء البحث فقط بعد 300ms من آخر تغيير
    performSearch(debouncedSearch);
  }, [debouncedSearch]);

  return <input value={search} onChange={e => setSearch(e.target.value)} />;
}
```

### 4. Lazy Loading مع إعادة المحاولة

```typescript
import { lazyWithRetry } from '@/app/utils/reactOptimizations';

const HeavyComponent = lazyWithRetry(
  () => import('./HeavyComponent'),
  3 // عدد المحاولات
);
```

---

## 🛡️ معالجة الأخطاء

### Error Boundaries المتخصصة

#### 1. Execution Error Boundary
```typescript
import { ExecutionErrorBoundary } from '@/app/components/shared/ExecutionErrorBoundary';

<ExecutionErrorBoundary 
  onReset={() => setRefresh(true)}
  onBackToDashboard={() => navigate('/dashboard')}
>
  <ExecutionDashboard file={file} />
</ExecutionErrorBoundary>
```

#### 2. Lawyer Dashboard Error Boundary
```typescript
import { LawyerDashboardErrorBoundary } from '@/app/components/shared/LawyerDashboardErrorBoundary';

<LawyerDashboardErrorBoundary onLogout={handleLogout}>
  <LawyerDashboard />
</LawyerDashboardErrorBoundary>
```

---

## 📋 أفضل الممارسات

### ✅ DO (افعل)

1. **استخدم Zustand للـ state المشترك**
   ```typescript
   // ✅ جيد
   const user = useAppStore(state => state.currentUser);
   
   // ❌ سيء
   const [user, setUser] = useState(null);
   ```

2. **استخدم IndexedDB للبيانات الكبيرة**
   ```typescript
   // ✅ جيد (غير محدود)
   await indexedDBService.saveExecutionFile(file);
   
   // ❌ سيء (محدود بـ 5 MB)
   localStorage.setItem('file', JSON.stringify(file));
   ```

3. **استخدم React.memo للمكونات الثقيلة**
   ```typescript
   // ✅ جيد
   export const HeavyComponent = memo(({ data }) => {
     // ... expensive rendering
   });
   ```

4. **استخدم selectors محددة**
   ```typescript
   // ✅ جيد (re-render فقط عند تغيير isLoading)
   const isLoading = useAppStore(state => state.isLoading);
   
   // ❌ سيء (re-render عند أي تغيير)
   const store = useAppStore();
   const isLoading = store.isLoading;
   ```

### ❌ DON'T (لا تفعل)

1. **لا تستخدم 72+ useState في مكون واحد**
   ```typescript
   // ❌ سيء
   const [modal1, setModal1] = useState(false);
   const [modal2, setModal2] = useState(false);
   // ... 70 more states
   
   // ✅ جيد
   const { modals, openModal } = useExecutionDashboard();
   ```

2. **لا تحذف console.log يدوياً**
   ```typescript
   // Vite config سيحذفها تلقائياً في production
   console.log('Debug info'); // OK في development
   ```

3. **لا تستخدم inline functions في props**
   ```typescript
   // ❌ سيء (دالة جديدة في كل render)
   <Button onClick={() => handleClick(id)} />
   
   // ✅ جيد
   const onClick = useCallback(() => handleClick(id), [id]);
   <Button onClick={onClick} />
   ```

---

## 🐛 التصحيح (Debugging)

### عد مرات الرسم
```typescript
import { useRenderCount } from '@/app/utils/reactOptimizations';

function MyComponent() {
  const renderCount = useRenderCount('MyComponent');
  
  return <div>Rendered {renderCount} times</div>;
}
```

### اكتشاف Props المتغيرة
```typescript
import { useWhyDidYouUpdate } from '@/app/utils/reactOptimizations';

function MyComponent({ id, name, data }) {
  useWhyDidYouUpdate('MyComponent', { id, name, data });
  // سيطبع في console أي prop تغيّر
}
```

### تحليل Bundle
```bash
npm run build:analyze
```
سيفتح ملف `dist/stats.html` يوضح:
- حجم كل مكتبة
- حجم كل مكون
- التوزيع على الـ chunks

---

## 🎯 نصائح الأداء

1. **استخدم Code Splitting**
   - المكونات الثقيلة: `React.lazy()`
   - المسارات: Route-based splitting

2. **قلل Re-renders**
   - استخدم `React.memo`
   - استخدم `useCallback` و `useMemo`
   - استخدم selectors محددة في Zustand

3. **حجم Bundle**
   - استخدم `npm run build:analyze`
   - احذف المكتبات الثقيلة غير الضرورية
   - استخدم tree shaking

4. **التخزين**
   - IndexedDB للبيانات الكبيرة (> 100 KB)
   - LocalStorage للبيانات الصغيرة (< 100 KB)

---

## 📞 الدعم

إذا واجهت مشكلة:
1. افحص `dist/stats.html` (Bundle Analysis)
2. استخدم `useRenderCount` و `useWhyDidYouUpdate`
3. افحص IndexedDB في DevTools → Application → Storage
4. راجع `/OPTIMIZATION_REPORT_V2.md`

---

**مُعد بواسطة:** فريق التطوير - نظام حامي القانوني  
**التاريخ:** 16 مارس 2026  
**الإصدار:** 2.0.0
