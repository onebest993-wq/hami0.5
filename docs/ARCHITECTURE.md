# Architecture Documentation

<div dir="rtl">

## 🏗️ البنية المعمارية للنظام

---

## 📋 جدول المحتويات

1. [نظرة عامة](#نظرة-عامة)
2. [الطبقات الأساسية](#الطبقات-الأساسية)
3. [نظام الملف الذكي](#نظام-الملف-الذكي)
4. [نظام التنفيذ](#نظام-التنفيذ)
5. [الذكاء الاصطناعي](#الذكاء-الاصطناعي)
6. [Data Flow](#data-flow)
7. [State Management](#state-management)

---

## 1️⃣ نظرة عامة

### الهندسة المعمارية العامة

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                    │
│              (React Components + UI)                    │
├─────────────────────────────────────────────────────────┤
│                   Business Logic Layer                   │
│         (Hooks, Utils, Calculators, Validators)         │
├─────────────────────────────────────────────────────────┤
│                   State Management Layer                 │
│              (Zustand Stores + Context API)             │
├─────────────────────────────────────────────────────────┤
│                   Data Access Layer                      │
│        (Supabase Client + LocalStorage + API)           │
├─────────────────────────────────────────────────────────┤
│                   Infrastructure Layer                   │
│         (Supabase Edge Functions + Database)            │
└─────────────────────────────────────────────────────────┘
```

### المبادئ الأساسية

1. **Separation of Concerns** - فصل المسؤوليات
2. **Single Responsibility** - مسؤولية واحدة لكل مكون
3. **DRY (Don't Repeat Yourself)** - عدم التكرار
4. **Immutability** - عدم تغيير البيانات الأصلية
5. **Composition over Inheritance** - التكوين بدلاً من الوراثة

---

## 2️⃣ الطبقات الأساسية

### A. Presentation Layer (طبقة العرض)

**المسؤولية:** عرض البيانات والتفاعل مع المستخدم

```
/src/app/components/
├── lawyer/              # مكونات المحامي
│   ├── LawyerDashboard.tsx
│   ├── SmartFileModal.tsx
│   ├── ExecutionDashboard.tsx
│   └── smart-modal/     # Modals متخصصة
├── client/              # مكونات العميل
├── shared/              # مكونات مشتركة
│   ├── ErrorBoundary.tsx
│   ├── SyncStatusBadge.tsx
│   └── SafeView.tsx
└── ui/                  # مكونات UI أساسية
    ├── SmartToast.tsx
    └── Button.tsx
```

**القواعد:**
- ✅ مكونات صغيرة وقابلة لإعادة الاستخدام
- ✅ استخدام Props للتواصل
- ✅ لا منطق أعمال في UI
- ✅ استخدام TypeScript Types

---

### B. Business Logic Layer (طبقة المنطق)

**المسؤولية:** الحسابات والقواعد القانونية

```
/src/app/
├── utils/
│   ├── calculations.ts       # الحسابات القانونية
│   ├── validationUtils.ts    # التحقق من الصحة
│   ├── dateUtils.ts          # التعامل مع التواريخ
│   └── debug.ts              # نظام Debug
├── constants/
│   └── legal.ts              # الثوابت القانونية
└── domain/
    └── rules/                # القواعد القانونية
        ├── appealRules.ts
        └── executionRules.ts
```

**مثال:**
```typescript
// ❌ سيء - منطق في UI
function CaseComponent() {
  const fees = amount * 0.02; // منطق مكرر
}

// ✅ جيد - منطق منفصل
import { calculateCourtFees } from '@/app/constants/legal';

function CaseComponent() {
  const fees = calculateCourtFees(amount);
}
```

---

### C. State Management Layer (إدارة الحالة)

**المسؤولية:** إدارة البيانات المشتركة

```
/src/app/
├── store/               # Zustand Stores
│   ├── useCaseStore.ts
│   ├── useNotificationStore.ts
│   └── useRagStore.ts
└── context/             # React Context
    ├── AppContext.tsx
    └── AIGuardianContext.tsx
```

**استراتيجية:**

1. **Local State** (useState) - للبيانات المحلية
   ```typescript
   const [isOpen, setIsOpen] = useState(false);
   ```

2. **Context** - للبيانات المشتركة بين مكونات قريبة
   ```typescript
   const { theme } = useAppTheme();
   ```

3. **Zustand Store** - للبيانات العامة
   ```typescript
   const { files, addFile } = useCaseStore();
   ```

---

### D. Data Access Layer (طبقة البيانات)

**المسؤولية:** التواصل مع مصادر البيانات

```
/src/app/
├── infrastructure/
│   ├── persistence/
│   │   └── LocalStorageRepository.ts
│   └── api/
│       └── supabaseClient.ts
├── hooks/
│   ├── useAutoSave.ts       # حفظ محلي
│   └── useAutoSync.ts       # مزامنة مع الخادم
└── services/
    └── lawyer-cloud.ts      # خدمات السحابة
```

**Data Sources:**
1. **localStorage** - التخزين المحلي
2. **Supabase Database** - قاعدة البيانات
3. **Supabase Edge Functions** - API Endpoints

---

## 3️⃣ نظام الملف الذكي (Smart File System)

### البنية الهرمية

```
CaseFile (الملف الرئيسي)
├── Parent Data (بيانات ثابتة)
│   ├── originalParties
│   ├── feesTotal / feesPaid
│   ├── docType
│   └── createdDate
├── Stage 1: البداءة
│   ├── parties (نسخة)
│   ├── timeline
│   ├── tasks
│   ├── documents
│   └── finalDecision
├── Stage 2: الاستئناف
│   ├── parties (معكوسة!)
│   ├── timeline
│   ├── tasks
│   └── finalDecision
└── Stage 3: التمييز
    └── ...
```

### الفلسفة المعمارية

#### 1. Parent-Child Architecture

**المبدأ:**
- **Parent Data** = البيانات الأصلية (لا تتغير أبداً)
- **Child Stages** = مراحل مستقلة (كل مرحلة = إضبارة)

```typescript
interface CaseFile {
  // Parent (ثابت)
  originalParties: Party[];
  feesTotal: number;
  createdDate: string;
  
  // Children (متغير)
  stages: CaseStage[];
  activeStageIndex: number;
}

interface CaseStage {
  id: string;
  stageName: 'البداءة' | 'الاستئناف' | 'التمييز';
  parties: Party[];      // نسخة تتغير حسب المرحلة
  timeline: Event[];
  tasks: Task[];
  finalDecision: Judgment | null;
}
```

#### 2. View State Pattern

**المبدأ:** فصل بين "المرحلة النشطة" و "المرحلة المعروضة"

```typescript
// المرحلة النشطة (التي يتم العمل عليها حالياً)
const [activeStageIndex, setActiveStageIndex] = useState(0);

// المرحلة المعروضة (التي يشاهدها المستخدم)
const [viewingStageIndex, setViewingStageIndex] = useState(0);

// يمكن للمستخدم تصفح المراحل دون تغيير النشطة
// مثل تصفح دفتر رقمي
```

#### 3. Immutability Principle

**المبدأ:** لا تعدل البيانات، بل أنشئ نسخة جديدة

```typescript
// ❌ سيء - تعديل مباشر
stages[0].parties.push(newParty);

// ✅ جيد - نسخة جديدة
const newStages = stages.map((stage, index) => 
  index === 0 
    ? { ...stage, parties: [...stage.parties, newParty] }
    : stage
);
setStages(newStages);
```

### انقلاب المراكز (Role Reversal)

**القاعدة:** عند الانتقال من البداءة للاستئناف:

```typescript
// البداءة
المدعي → المستأنف عليه
المدعى عليه → المستأنف

// الكود
import { getReverseRole, PARTY_ROLES } from '@/app/constants/legal';

const appellantRole = getReverseRole(PARTY_ROLES.DEFENDANT);
// → 'المستأنف'
```

---

## 4️⃣ نظام التنفيذ (Execution System)

### فصل كامل عن الدعاوى

**الفلسفة:** إضبارة التنفيذ ≠ إضبارة الدعوى

```
Lawsuit System            Execution System
├── parties               ├── creditor (الدائن)
├── plaintiff/defendant   ├── debtor (المدين)
├── stages                ├── status (voluntary/enforcement)
├── judgments             ├── attachments (الحجوزات)
└── timeline              ├── auctions (المزادات)
                          └── timeline
```

### البنية

```typescript
interface ExecutionFile {
  id: string;
  executionNo: string;
  executionCourt: string;
  
  // الأطراف (مختلفة عن الدعاوى)
  creditor: Party;
  debtor: Party;
  
  // المالية
  debtAmount: number;
  courtFees: number;
  paidDebt: number;
  remainingDebt: number;
  
  // الحالة
  status: 'voluntary' | 'enforcement' | 'completed';
  isHealthy: boolean;
  healthIssues: string[];
  
  // المجموعات
  attachments: Attachment[];
  auctions: Auction[];
  timeline: TimelineEvent[];
}
```

### المؤشرات القانونية

```typescript
// تتبع المواد القانونية
const indicators = {
  article18: boolean,  // المادة 18 - الحجز الاحتياطي
  article20: boolean,  // المادة 20 - حجز المنقول
  article50: boolean,  // المادة 50 - تحديد موعد البيع
  article112: boolean  // المادة 112 - التنفيذ على العقار
};
```

---

## 6️⃣ Data Flow (تدفق البيانات)

### سيناريو: إضافة مهمة جديدة

```
User Action
    │
    ▼
UI Component (SmartFileModal)
    │
    ├─ validateTaskData(task)          [Validation]
    │
    ├─ newTask = { ...task, id: ... }  [Business Logic]
    │
    ▼
setState (React)
    │
    ├─ setTasks([...tasks, newTask])
    │
    ▼
useAutoSave Hook                        [Local Persistence]
    │
    ├─ localStorage.setItem(...)
    │
    ▼
useAutoSync Hook                        [Cloud Sync]
    │
    ├─ fetch('/sync', { ... })
    │
    ▼
Supabase Edge Function
    │
    ├─ kv.set('tasks', tasks)
    │
    ▼
Supabase Database
    │
    └─ ✅ Data Persisted
```

---

## 7️⃣ State Management Strategy

### قواعد استخدام State

| نوع البيانات | الحل الأمثل | مثال |
|-------------|------------|------|
| UI State | useState | isOpen, isLoading |
| Form State | useState | form inputs |
| Shared (قريب) | Context | theme, user |
| Global | Zustand | files, notifications |
| Server | React Query | API data |

### مثال عملي

```typescript
// ❌ سيء - كل شيء في State واحد
const [state, setState] = useState({
  files: [],
  isOpen: false,
  user: {},
  theme: 'dark'
});

// ✅ جيد - فصل واضح
const [isOpen, setIsOpen] = useState(false);           // UI
const { theme } = useAppTheme();                       // Context
const { files } = useCaseStore();                      // Global
const { data: user } = useQuery('user', fetchUser);    // Server
```

---

## 🎯 Design Patterns المستخدمة

### 1. Repository Pattern
```typescript
// src/app/infrastructure/persistence/LocalStorageRepository.ts
export const persistenceRepository = {
  load: <T>(key: string): T | null => { ... },
  save: <T>(key: string, data: T): void => { ... }
};
```

### 2. Hook Pattern
```typescript
// Custom hooks لإعادة الاستخدام
function useAutoSync(key, data, options) { ... }
function useAutoSave(key, data) { ... }
```

### 3. Provider Pattern
```typescript
<AppProvider>
  <AIGuardianProvider>
    <YourApp />
  </AIGuardianProvider>
</AppProvider>
```

### 4. Error Boundary Pattern
```typescript
<ErrorBoundary>
  <CriticalComponent />
</ErrorBoundary>
```

---

## 📊 Performance Considerations

### Code Splitting
```typescript
// Lazy loading للمكونات الثقيلة
const AdminDashboard = React.lazy(() => 
  import('./components/AdminDashboard')
);
```

### Memoization
```typescript
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

const handleClick = useCallback(() => {
  doSomething();
}, []);
```

### Debouncing
```typescript
const debouncedSearch = useMemo(
  () => debounce((query) => search(query), 300),
  []
);
```

---

**آخر تحديث:** 25 فبراير 2026

</div>
