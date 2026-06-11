# ✅ CRITICAL SYSTEM DIRECTIVE V14: ABSOLUTE ZERO MOCK DATA & STRICT VARIABLE BINDING

## 🎯 **المهمة:**
تحويل Financial Module (`إدارة الأموال`) من نظام يحتوي على أرقام ثابتة (Mock Data) إلى **محرك ديناميكي** يربط كل رقم مباشرة بمتغير backend.

---

## 🚀 **ما تم إنجازه:**

### **1. ZERO-HALLUCINATION RULE (منع التأليف الرقمي)**
- ✅ حذف جميع الأرقام الثابتة (Static Numbers)
- ✅ كل حقل رقمي الآن مرتبط بمتغير ديناميكي
- ✅ إذا كان المتغير `NULL` أو `0`، يتم إخفاء الصف تلقائياً

### **2. DYNAMIC HEADER BINDING (ربط الترويسة العلوية)**

#### **Collapsed State (Shell):**
```typescript
// PRIMARY NUMBER (إجمالي المطلوب)
{calculated_total_debtor_liability.toLocaleString('ar-IQ')}

// SUB-TEXT (أتعاب ومصاريف)
{total_court_and_execution_expenses.toLocaleString('ar-IQ')}
```

### **3. DYNAMIC LEDGER ROWS (بناء سجل الدين الديناميكي)**

#### **Tab 1: Debt & Settlements**

| Row | Label | Variable | Conditional Logic |
|-----|-------|----------|------------------|
| **Row A** | أصل الدين / المحكوم به | `{principal_amount}` | ✅ Hidden if `isNonFinancialClaim` or `principal_amount === 0` |
| **Row B** | أتعاب المحاماة المحكوم بها | `{court_ordered_fees}` | ✅ Shown only if `> 0` |
| **Row C** | الرسوم والمصاريف التنفيذية | `{execution_expenses_sum}` | ✅ Shown only if `> 0` |

### **4. PRIVATE CLIENT WALLET ISOLATION (العزل التام لأتعاب الموكل)**

#### **Tab 2: Fees & Wallet → Section B (💼 حسابات الموكل الخاصة)**

```typescript
// Row A: الأتعاب المتفق عليها
{agreed_client_fees.toLocaleString('ar-IQ')} دينار

// Row B: الدفعات المستلمة
{received_client_payments.toLocaleString('ar-IQ')} دينار

// Row C: المتبقي بذمة الموكل (DYNAMIC CALCULATION)
{client_remaining_balance.toLocaleString('ar-IQ')}
```

**Logic:**
```typescript
const client_remaining_balance = useMemo(() => {
    return agreed_client_fees - received_client_payments;
}, [agreed_client_fees, received_client_payments]);
```

### **5. NON-FINANCIAL CLAIM ADAPTER (محرك الدعاوى غير المالية)**

#### **Auto-Detection Logic:**
```typescript
const is_financial_claim = useMemo(() => {
    return !isNonFinancialClaim && principal_amount > 0;
}, [isNonFinancialClaim, principal_amount]);
```

#### **Conditional Rendering:**
- ✅ إذا `isNonFinancialClaim === true` أو `principal_amount === 0`:
  - يتم **حذف Row A (أصل الدين)** من UI
  - الرقم الرئيسي `calculated_total_debtor_liability` يُحسب كالتالي:
    ```typescript
    court_ordered_fees + execution_expenses_sum
    ```

- ✅ إذا `is_financial_claim === true`:
  - يتم عرض جميع الصفوف
  - الرقم الرئيسي يُحسب:
    ```typescript
    principal_amount + court_ordered_fees + execution_expenses_sum
    ```

---

## 📊 **DYNAMIC ENGINE (useMemo Calculations):**

```typescript
// 1. TOTAL DEBTOR LIABILITY
const calculated_total_debtor_liability = useMemo(() => {
    if (isNonFinancialClaim || principal_amount === 0) {
        return court_ordered_fees + execution_expenses_sum;
    }
    return principal_amount + court_ordered_fees + execution_expenses_sum;
}, [isNonFinancialClaim, principal_amount, court_ordered_fees, execution_expenses_sum]);

// 2. TOTAL COURT & EXECUTION EXPENSES
const total_court_and_execution_expenses = useMemo(() => {
    return court_ordered_fees + execution_expenses_sum;
}, [court_ordered_fees, execution_expenses_sum]);

// 3. CLIENT REMAINING BALANCE
const client_remaining_balance = useMemo(() => {
    return agreed_client_fees - received_client_payments;
}, [agreed_client_fees, received_client_payments]);

// 4. IS FINANCIAL CLAIM
const is_financial_claim = useMemo(() => {
    return !isNonFinancialClaim && principal_amount > 0;
}, [isNonFinancialClaim, principal_amount]);
```

---

## 🔗 **Updated Props (Interface):**

```typescript
interface FinancialOperationsCenterProps {
    // 🆕 V14: STRICT DYNAMIC VARIABLES (ZERO MOCK DATA)
    principal_amount: number;          // أصل الدين / المحكوم به
    court_ordered_fees: number;        // أتعاب المحاماة المحكوم بها
    execution_expenses_sum: number;    // الرسوم والمصاريف التنفيذية
    agreed_client_fees: number;        // الأتعاب المتفق عليها
    received_client_payments: number;  // الدفعات المستلمة من الموكل
    
    // ... Legacy props (kept for backward compatibility)
}
```

---

## 🔄 **Data Flow (من ExecutionDashboard → FinancialOperationsCenter):**

```typescript
<FinancialOperationsCenter
    // 🆕 V14: STRICT DYNAMIC VARIABLES
    principal_amount={parsedDebtAmount}
    court_ordered_fees={parsedLawyerFees}
    execution_expenses_sum={parsedCourtFees + parsedDirectorateFees}
    agreed_client_fees={parsedClientFees}
    received_client_payments={paidClientFees}
    
    // Legacy props...
/>
```

---

## ✅ **VERIFICATION CHECKLIST:**

- [x] لا توجد أرقام ثابتة (Hardcoded Numbers) في UI
- [x] كل رقم مربوط بمتغير ديناميكي
- [x] منطق شرطي لإخفاء/إظهار الصفوف
- [x] حسابات ديناميكية عبر `useMemo`
- [x] عزل تام لأتعاب الموكل عن أتعاب المدين
- [x] دعم الدعاوى المالية وغير المالية

---

## 🎯 **الفائدة:**

### **قبل V14:**
```jsx
{/* ❌ STATIC NUMBER - HALLUCINATED */}
<span>5,000,000 دينار</span>
```

### **بعد V14:**
```jsx
{/* ✅ DYNAMIC BINDING */}
<span>{principal_amount.toLocaleString('ar-IQ')} دينار</span>
```

---

## 📁 **Modified Files:**

1. `/src/app/components/lawyer/FinancialOperationsCenter.tsx`
   - ✅ Added new props interface
   - ✅ Added `useMemo` calculations
   - ✅ Updated all UI bindings

2. `/src/app/components/lawyer/ExecutionDashboard.tsx`
   - ✅ Passed new props to `FinancialOperationsCenter`

---

## 🔮 **Next Steps (اختياري):**

- [ ] ربط `execution_expenses_sum` بـ Timeline Events (auto-sum من المصاريف)
- [ ] إضافة API backend لحفظ الدفعات المستلمة من الموكل
- [ ] إنشاء Financial Ledger History Modal

---

**🏆 V14 COMPLETE - ZERO MOCK DATA ACHIEVED!**
