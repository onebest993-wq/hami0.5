# ⚡ V12 - Quick Reference Guide

## 🎯 دليل سريع للمطورين - CRITICAL UI/UX & LAW-LOGIC V12

---

## 📂 **الملفات المُعدَّلة**

### 1. `/src/app/components/lawyer/ExecutionDashboard.tsx`
**التعديلات:**
- ✅ حذف النقطة الحمراء الوامضة (السطر ~1373)
- ✅ إضافة Smart Legal Status Tags (السطر ~1373-1425)
- ✅ حقل الكفيل الضامن (السطر ~1587)
- ✅ حقل راتب الموظف (السطر ~1595)
- ✅ Legal Directive Badge (السطر ~1608)
- ✅ State للـ Financial Ledger (السطر ~115)
- ✅ تحديث handlePayment (السطر ~549)
- ✅ Modal كشف الحساب (نهاية الملف)
- ✅ useMemo للـ Iraqi Law Directive (السطر ~302)

---

### 2. `/src/app/components/lawyer/FinancialOperationsCenter.tsx`
**التعديلات:**
- ✅ Import useState, useEffect
- ✅ Flash effect state + useEffect (السطر ~108)
- ✅ الرقم الأصفر قابل للنقر (السطر ~182)
- ✅ Prop جديد: `onShowLedger`

---

### 3. `/src/app/utils/iraqiLawDirectives.ts` ⭐ NEW
**المحتوى:**
- ✅ `getIraqiLawDirective()` - المحرك الأساسي
- ✅ `handleAlimonyCase()` - استثناء النفقة
- ✅ `handleEmployeeCase()` - بروتوكول الموظف (20%)
- ✅ `handleFreelancerCase()` - بروتوكول الكاسب
- ✅ `getLegalActionBadge()` - Badge styling
- ✅ `isActionAllowed()` - التحقق من الإجراءات

---

### 4. `/src/styles/theme.css`
**التعديلات:**
- ✅ `@keyframes flash` - animation للدفعة
- ✅ `.animate-flash` - CSS class

---

## 🔑 **State Variables الجديدة**

### في ExecutionDashboard.tsx:
```typescript
// Financial Ledger
const [financialLedger, setFinancialLedger] = useState<Array<{
    id: string;
    date: string;
    type: 'payment' | 'fee' | 'settlement';
    amount: number;
    description: string;
    balance: number;
}>>([]);

const [showLedgerModal, setShowLedgerModal] = useState(false);
```

### في FinancialOperationsCenter.tsx:
```typescript
const [flashActive, setFlashActive] = useState(false);
const [previousPaidDebt, setPreviousPaidDebt] = useState(paidDebt);
```

---

## 🧠 **useMemo الجديد**

```typescript
// Iraqi Law Directive Calculator
const legalDirective = useMemo(() => {
    return IraqiLaw.getIraqiLawDirective({
        jobStatus: debtors[0]?.occupation || 'كاسب',
        claimType: claimType || '',
        monthlySalary: executionData?.employeeSalary 
            ? parseFloat(executionData.employeeSalary) 
            : undefined,
        totalDebt: remaining,
        monthlyAlimony: isAlimonyClaim ? monthlyAlimony : undefined
    });
}, [debtors, claimType, executionData?.employeeSalary, remaining, isAlimonyClaim, monthlyAlimony]);

const legalActionBadge = IraqiLaw.getLegalActionBadge(legalDirective);
```

---

## 📊 **Data Flow Diagram**

```
┌─────────────────┐
│  User Action    │
│  (سداد دفعة)    │
└────────┬────────┘
         │
         v
┌─────────────────┐
│ handlePayment() │
│  - setPaidDebt  │
│  - setLedger    │
│  - Timeline     │
└────────┬────────┘
         │
         v
┌─────────────────┐
│  useEffect      │
│  (Flash Detect) │
└────────┬────────┘
         │
         v
┌─────────────────┐
│  CSS Animation  │
│  (1s flash)     │
└─────────────────┘
         │
         v
┌─────────────────┐
│  Number Update  │
│  (totalOwed)    │
└─────────────────┘
```

---

## 🎨 **CSS Classes الجديدة**

### Flash Effect:
```css
@keyframes flash {
  0% { color: rgb(52, 211, 153); transform: scale(1); }
  50% { color: rgb(16, 185, 129); transform: scale(1.05); }
  100% { color: rgb(251, 191, 36); transform: scale(1); }
}

.animate-flash { animation: flash 1s ease-in-out; }
```

**الاستخدام:**
```tsx
<span className={flashActive ? 'animate-flash' : ''}>
    {totalOwed.toLocaleString('ar-IQ')}
</span>
```

---

## ⚖️ **Iraqi Law Logic**

### Input Interface:
```typescript
{
    jobStatus: 'موظف' | 'كاسب',
    claimType: string,
    monthlySalary?: number,
    totalDebt: number,
    monthlyAlimony?: number
}
```

### Output Interface:
```typescript
{
    primaryAction: 'salary_garnishment' | 'settlement' | 'coercive_measures',
    monthlyDeduction?: number,
    deductionPercentage?: number,
    availableActions: string[],
    blockedActions: string[],
    explanation: string,
    warningMessage?: string
}
```

### Examples:
```typescript
// موظف - دين عادي
primaryAction: 'salary_garnishment'
monthlyDeduction: 300,000 (20% of 1,500,000)

// كاسب
primaryAction: 'settlement'
availableActions: ['تسوية', 'حجز أموال', 'إحضار']
blockedActions: ['حجز راتب']

// نفقة - تخطي الحدود
primaryAction: 'salary_garnishment'
monthlyDeduction: 800,000 (53% of 1,500,000)
explanation: "النفقة تخترق حد الـ 20%"
```

---

## 🔧 **كيفية التعديل/الإضافة**

### إضافة نوع جديد من الدعاوى:
1. افتح `/src/app/utils/iraqiLawDirectives.ts`
2. عدل في `getIraqiLawDirective()`:
```typescript
if (claimType === 'نوع_جديد') {
    return handleNewClaimType(input);
}
```

### إضافة حالة قانونية جديدة:
1. افتح `ExecutionDashboard.tsx`
2. في قسم Smart Tags:
```typescript
{executionStatus === 'NEW_STATUS' && (
    <span className="...">
        🆕 حالة جديدة
    </span>
)}
```

### إضافة نوع حركة مالية:
1. في `financialLedger` type:
```typescript
type: 'payment' | 'fee' | 'settlement' | 'NEW_TYPE'
```
2. في Modal:
```typescript
{entry.type === 'NEW_TYPE' && (
    <NewIcon size={16} className="text-color" />
)}
```

---

## 📱 **Props الجديدة**

### FinancialOperationsCenter:
```typescript
interface FinancialOperationsCenterProps {
    // ... existing props
    onShowLedger?: () => void; // 🆕 V12
}
```

**الاستخدام:**
```tsx
<FinancialOperationsCenter
    {/* ... existing props */}
    onShowLedger={() => setShowLedgerModal(true)}
/>
```

---

## 🐛 **Debugging Tips**

### إذا لم يظهر Flash:
```typescript
// تحقق من:
1. هل تم تحديث paidDebt فعلاً؟
   console.log('paidDebt:', paidDebt);

2. هل useEffect يعمل؟
   console.log('Flash triggered');

3. هل CSS موجود؟
   // افحص theme.css
```

### إذا لم يظهر Badge القانوني:
```typescript
// تحقق من:
1. هل legalDirective محسوب؟
   console.log('Directive:', legalDirective);

2. هل jobStatus صحيح؟
   console.log('Job:', debtors[0]?.occupation);

3. هل الـ Badge موجود في DOM؟
   // افحص في Developer Tools
```

### إذا لم يفتح Modal:
```typescript
// تحقق من:
1. هل onShowLedger ممرر؟
   console.log('onShowLedger:', onShowLedger);

2. هل showLedgerModal = true?
   console.log('Modal state:', showLedgerModal);

3. هل z-index كافي؟
   // Modal has z-[70]
```

---

## 📚 **Dependencies**

### External:
```json
{
  "motion": "11.x", // Framer Motion
  "lucide-react": "latest"
}
```

### Internal:
```typescript
import * as StateMachine from '@/app/utils/executionStateMachine';
import * as IraqiLaw from '@/app/utils/iraqiLawDirectives';
import { AlimonyFinancialBlock } from './AlimonyFinancialBlock';
```

---

## 🎯 **Performance Notes**

- ✅ Flash effect: 1s duration (optimal)
- ✅ useMemo prevents re-calculation
- ✅ useEffect cleanup (clearTimeout)
- ✅ Conditional rendering (لا تحميل غير ضروري)

---

## 🚀 **Next Steps (Future)**

1. **PDF Export** للـ Financial Ledger
2. **Charts** لإحصائيات الدفعات
3. **Email Notifications** عند الدفعات
4. **Auto-backup** للـ Ledger في LocalStorage
5. **Print Mode** لكشف الحساب

---

## 📞 **Support & Contact**

إذا واجهت مشكلة:
1. راجع `/V12_TEST_SCENARIOS.md`
2. راجع `/V12_COMPLETION_SUMMARY.md`
3. افحص Console للأخطاء
4. تحقق من Network tab (إذا كان يستخدم API)

---

**V12 Quick Reference - تم إنشاؤه في March 14, 2026** ⚡✨
