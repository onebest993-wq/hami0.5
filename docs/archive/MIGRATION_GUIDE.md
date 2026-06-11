# 🔄 دليل الترحيل - Migration Guide

**كيفية استخدام المكونات الجديدة المقسّمة**

---

## 📋 ExecutionDashboard - الاستخدام الجديد

### قبل التقسيم ❌

```typescript
// ExecutionDashboard.tsx (3,780 سطر - ملف واحد ضخم)
export const ExecutionDashboard = ({ file, onClose }) => {
  // 100+ سطر من useState
  const [showPayment, setShowPayment] = useState(false);
  const [showParties, setShowParties] = useState(false);
  // ... 98 أخرى

  return (
    <div>
      {/* 3,600 سطر من JSX */}
    </div>
  );
};
```

### بعد التقسيم ✅

```typescript
// ExecutionDashboard.tsx (الملف الرئيسي - 200 سطر فقط)
import React, { useState } from 'react';
import {
  ExecutionHeader,
  ExecutionPartiesSection,
  ExecutionPaymentsSection,
  ExecutionTimelineSection,
  ExecutionActionsBar
} from './ExecutionDashboard';
import type { ExecutionFile } from './ExecutionDashboard/types';

interface Props {
  file: ExecutionFile;
  onClose: () => void;
}

export const ExecutionDashboard: React.FC<Props> = ({ file, onClose }) => {
  // ─────────────────────────────────────────────────────────────────────────
  // STATE (مبسّط جداً الآن)
  // ─────────────────────────────────────────────────────────────────────────
  
  const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'parties' | 'timeline'>('overview');
  const [expandedParties, setExpandedParties] = useState<Record<string, boolean>>({});
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────
  
  const handleToggleParty = (partyId: string) => {
    setExpandedParties(prev => ({
      ...prev,
      [partyId]: !prev[partyId]
    }));
  };

  const handleAddPayment = () => {
    // Logic here
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  
  return (
    <div className="min-h-screen bg-navy-950">
      {/* Header */}
      <ExecutionHeader
        executionData={file}
        isExpanded={isHeaderExpanded}
        onClose={onClose}
        onToggleExpand={() => setIsHeaderExpanded(!isHeaderExpanded)}
      />

      {/* Main Content */}
      <div className="container mx-auto p-6">
        <div className="grid grid-cols-12 gap-6">
          
          {/* Left Sidebar - Actions */}
          <div className="col-span-3">
            <ExecutionActionsBar
              activeTab={activeTab}
              onAddPayment={handleAddPayment}
              onSendNotification={() => {}}
              onAddDocument={() => {}}
              onShowCalculator={() => {}}
            />
          </div>

          {/* Main Area */}
          <div className="col-span-9 space-y-6">
            
            {/* Tabs */}
            <div className="flex gap-2 bg-navy-900 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('overview')}
                className={activeTab === 'overview' ? 'active-tab' : 'inactive-tab'}
              >
                نظرة عامة
              </button>
              <button
                onClick={() => setActiveTab('payments')}
                className={activeTab === 'payments' ? 'active-tab' : 'inactive-tab'}
              >
                المدفوعات
              </button>
              <button
                onClick={() => setActiveTab('parties')}
                className={activeTab === 'parties' ? 'active-tab' : 'inactive-tab'}
              >
                الأطراف
              </button>
              <button
                onClick={() => setActiveTab('timeline')}
                className={activeTab === 'timeline' ? 'active-tab' : 'inactive-tab'}
              >
                الخط الزمني
              </button>
            </div>

            {/* Content Based on Active Tab */}
            {activeTab === 'payments' && (
              <ExecutionPaymentsSection
                payments={file.payments || []}
                totalAmount={file.totalAmount || 0}
                paidAmount={file.paidAmount || 0}
                remainingAmount={(file.totalAmount || 0) - (file.paidAmount || 0)}
                onAddPayment={handleAddPayment}
              />
            )}

            {activeTab === 'parties' && (
              <ExecutionPartiesSection
                creditors={file.creditors || []}
                debtors={file.debtors || []}
                expandedParties={expandedParties}
                onToggleParty={handleToggleParty}
              />
            )}

            {activeTab === 'timeline' && (
              <ExecutionTimelineSection
                events={file.timeline || []}
                onAddEvent={() => {}}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
```

---

## 🎯 الفوائد

### 1. الوضوح

```typescript
// قبل ❌
<div>
  {/* 3,600 سطر غير واضحة */}
</div>

// بعد ✅
<ExecutionPaymentsSection payments={file.payments} />
// واضح جداً ماذا يفعل هذا المكون
```

### 2. إعادة الاستخدام

```typescript
// يمكنك استخدام المكونات في أماكن أخرى:

// في تقرير مطبوع:
<ExecutionHeader executionData={file} />
<ExecutionPaymentsSection payments={file.payments} />

// في عرض مبسّط:
<ExecutionHeader executionData={file} />

// في dashboard:
<ExecutionTimelineSection events={recentEvents} />
```

### 3. الاختبار

```typescript
// قبل ❌ - اختبار 3,780 سطر
test('ExecutionDashboard works', () => {
  // كيف تختبر 3,780 سطر؟
});

// بعد ✅ - اختبار كل مكون لوحده
test('ExecutionHeader displays correctly', () => {
  render(<ExecutionHeader executionData={mockFile} />);
  expect(screen.getByText('ملف التنفيذ')).toBeInTheDocument();
});

test('ExecutionPaymentsSection calculates correctly', () => {
  render(<ExecutionPaymentsSection payments={mockPayments} />);
  expect(screen.getByText('50%')).toBeInTheDocument();
});
```

### 4. الصيانة

```typescript
// قبل ❌ - تعديل في ملف 3,780 سطر
// خطر: قد تكسر شيء آخر

// بعد ✅ - تعديل في ملف 300 سطر
// آمن: المكونات الأخرى لن تتأثر
```

---

## 🔄 خطوات الترحيل

### الخطوة 1: استبدال الاستيرادات

```typescript
// قديم ❌
import { ExecutionDashboard } from './ExecutionDashboard';

// جديد ✅
import {
  ExecutionHeader,
  ExecutionPartiesSection,
  ExecutionPaymentsSection,
  ExecutionTimelineSection,
  ExecutionActionsBar
} from './ExecutionDashboard';
```

### الخطوة 2: استخدام الـ Types

```typescript
// جديد ✅
import type {
  ExecutionFile,
  Party,
  Payment,
  TimelineEvent
} from './ExecutionDashboard/types';

// استخدامها:
const [file, setFile] = useState<ExecutionFile | null>(null);
const [payments, setPayments] = useState<Payment[]>([]);
```

### الخطوة 3: تقسيم الـ JSX

```typescript
// قديم ❌
return (
  <div>
    {/* كل شيء هنا */}
  </div>
);

// جديد ✅
return (
  <div>
    <ExecutionHeader {...headerProps} />
    <ExecutionPaymentsSection {...paymentsProps} />
    <ExecutionPartiesSection {...partiesProps} />
  </div>
);
```

---

## 📚 أمثلة متقدمة

### مثال 1: عرض مخصص للطباعة

```typescript
export function ExecutionPrintView({ file }: { file: ExecutionFile }) {
  return (
    <div className="print-view">
      <ExecutionHeader 
        executionData={file} 
        onClose={() => {}} 
      />
      
      <ExecutionPaymentsSection
        payments={file.payments}
        totalAmount={file.totalAmount}
        paidAmount={file.paidAmount}
        remainingAmount={file.totalAmount - file.paidAmount}
      />
      
      <ExecutionPartiesSection
        creditors={file.creditors}
        debtors={file.debtors}
      />
    </div>
  );
}
```

### مثال 2: Dashboard Widget

```typescript
export function RecentExecutionsWidget() {
  const recentFiles = useRecentExecutions();

  return (
    <div className="widget">
      <h3>الملفات الأخيرة</h3>
      {recentFiles.map(file => (
        <div key={file.id} className="widget-item">
          <ExecutionHeader
            executionData={file}
            onClose={() => {}}
          />
        </div>
      ))}
    </div>
  );
}
```

### مثال 3: مكون مدمج مع Custom Hooks

```typescript
import { useModalStates } from '@/app/hooks/useModalStates';
import { ExecutionActionsBar } from './ExecutionDashboard';

export function ExecutionDashboardWithHooks({ file }: Props) {
  // استخدام Custom Hook
  const { modalStates, setShowPayment, setShowParties } = useModalStates();

  return (
    <div>
      <ExecutionActionsBar
        onAddPayment={() => setShowPayment(true)}
        onManageParties={() => setShowParties(true)}
      />

      {/* Modals */}
      {modalStates.showPayment && <PaymentModal />}
      {modalStates.showParties && <PartiesModal />}
    </div>
  );
}
```

---

## ⚠️ نصائح مهمة

### 1. استخدم TypeScript

```typescript
// ✅ جيد
const file: ExecutionFile = getFile();

// ❌ سيئ
const file: any = getFile();
```

### 2. Memoize المكونات الثقيلة

```typescript
import { memo } from 'react';

export const ExecutionPaymentsSection = memo(({ payments }) => {
  // Component logic
});
```

### 3. استخدم useMemo للحسابات

```typescript
const totalAmount = useMemo(() => {
  return payments.reduce((sum, p) => sum + p.amount, 0);
}, [payments]);
```

### 4. لا تنسى Error Boundaries

```typescript
<ErrorBoundary>
  <ExecutionPaymentsSection payments={file.payments} />
</ErrorBoundary>
```

---

## 🎉 الخلاصة

```
✅ ملفات أصغر (240-380 سطر بدلاً من 3,780)
✅ أسهل للفهم
✅ أسهل للاختبار
✅ أسهل للصيانة
✅ Type-safe بالكامل
✅ قابل لإعادة الاستخدام
✅ Performance محسّن
```

---

**التاريخ:** 17 مارس 2026  
**الإصدار:** 1.0.0  
**الحالة:** جاهز للاستخدام ✅
