# 🎯 IMMUTABLE LEDGER ENGINE - SCENARIOS CHEAT SHEET

Quick reference for common Iraqi law execution scenarios.

---

## 📋 TABLE OF CONTENTS

1. [Government Employee Scenarios](#-government-employee-scenarios)
2. [Self-Employed Scenarios](#-self-employed-scenarios)
3. [Alimony Scenarios](#-alimony-scenarios)
4. [Payment Tracking Scenarios](#-payment-tracking-scenarios)
5. [Edge Cases](#-edge-cases)

---

## 👨‍💼 Government Employee Scenarios

### Scenario 1.1: Employee + General Debt

**Given:**
- Debtor: Government Employee (موظف)
- Claim: General Financial Debt (دين مالي)
- Amount: 10,000,000 IQD

**Code:**
```typescript
const ledger = createImmutableLedger(10000000, 'دين مالي', 'موظف');
const actions = determineLegalActionsAvailability(ledger);
```

**Expected Result:**
```javascript
{
    canRequestImprisonment: false,        // ❌ Protected by Civil Service Law
    canGarnishSalary: true,               // ✅ Can garnish 1/5 salary
    canRequestGuarantor: false,
    canInitiateSettlement: true,
    imprisonmentBlockingReasons: [
        "🛡️ موظف حكومي: محمي بقانون الخدمة المدنية (حجز 1/5 الراتب فقط)"
    ],
    salaryGarnishmentNote: "✅ يمكن إصدار قرار حجز 1/5 من الراتب الصافي"
}
```

**UI Action:**
- ❌ Hide "طلب الحبس" button
- ✅ Show "حجز 1/5 الراتب" button
- ℹ️ Display protection notice

---

### Scenario 1.2: Retired Employee + Debt

**Given:**
- Debtor: Retired (متقاعد)
- Claim: Financial Debt
- Amount: 5,000,000 IQD

**Code:**
```typescript
const ledger = createImmutableLedger(5000000, 'دين مالي', 'متقاعد');
const actions = determineLegalActionsAvailability(ledger);
```

**Expected Result:**
```javascript
{
    canRequestImprisonment: false,
    canGarnishSalary: true,               // ✅ Can garnish pension
    salaryGarnishmentNote: "✅ يمكن حجز 1/5 من راتب التقاعد"
}
```

**UI Action:**
- ❌ Hide imprisonment button
- ✅ Show "حجز 1/5 من التقاعد" button

---

## 👨‍💼 Self-Employed Scenarios

### Scenario 2.1: Self-Employed + General Debt

**Given:**
- Debtor: Self-Employed (كاسب)
- Claim: Financial Debt
- Amount: 10,000,000 IQD

**Code:**
```typescript
const ledger = createImmutableLedger(10000000, 'دين مالي', 'كاسب');
const actions = determineLegalActionsAvailability(ledger);
```

**Expected Result:**
```javascript
{
    canRequestImprisonment: true,         // ✅ No salary protection
    canGarnishSalary: false,              // ❌ No government salary
    canRequestGuarantor: true,
    canInitiateSettlement: true,
    strategicWarnings: [
        "⚠️ المدين كاسب (لا يوجد راتب حكومي): متاح طلب الحبس أو التسوية"
    ]
}
```

**UI Action:**
- ✅ Show "طلب الحبس" button
- ✅ Show "إبرام تسوية مالية" button
- ✅ Show "إضافة كفيل ضامن" button
- ❌ Hide salary garnishment

---

### Scenario 2.2: Unemployed Debtor

**Given:**
- Debtor: Unemployed (عاطل)
- Claim: Financial Debt
- Amount: 3,000,000 IQD

**Code:**
```typescript
const ledger = createImmutableLedger(3000000, 'دين مالي', 'عاطل');
const actions = determineLegalActionsAvailability(ledger);
```

**Expected Result:**
```javascript
{
    canRequestImprisonment: true,
    canGarnishSalary: false,
    strategicWarnings: [
        "⚠️ المدين عاطل/طالب: متاح طلب الحبس (لكن احتمال التحصيل ضعيف)"
    ]
}
```

**UI Action:**
- ✅ Show imprisonment button
- ⚠️ Display warning about low collection probability

---

## 💰 Alimony Scenarios

### Scenario 3.1: Employee + Alimony (Salary > Alimony)

**Given:**
- Debtor: Government Employee
- Claim: Alimony (نفقة شرعية)
- Alimony Required: 1,000,000 IQD
- Employee Net Salary: 2,000,000 IQD
- Guarantor: No

**Code:**
```typescript
const ledger = createImmutableLedger(1000000, 'نفقة شرعية', 'موظف');
const actions = determineLegalActionsAvailability(ledger, 2000000, false);
```

**Expected Result:**
```javascript
{
    canRequestImprisonment: false,        // ❌ Immunity maintained
    canGarnishSalary: true,
    canRequestGuarantor: false,
    strategicWarnings: []
}
```

**Explanation:**
- Salary (2M) > Alimony (1M)
- Employee protection remains active
- Can garnish 1/5 salary safely

**UI Action:**
- ❌ Hide imprisonment button
- ✅ Show salary garnishment
- ✅ Display: "الراتب الصافي يغطي النفقة - الحصانة قائمة"

---

### Scenario 3.2: Employee + Alimony (Salary < Alimony) - NO GUARANTOR

**Given:**
- Debtor: Government Employee
- Claim: Alimony
- Alimony Required: 2,000,000 IQD
- Employee Net Salary: 1,000,000 IQD
- Guarantor: **NO** ❌

**Code:**
```typescript
const ledger = createImmutableLedger(2000000, 'نفقة شرعية', 'موظف');
const actions = determineLegalActionsAvailability(ledger, 1000000, false);

const override = evaluateAlimonyOverride(2000000, 1000000, false);
```

**Expected Result:**
```javascript
{
    canRequestImprisonment: true,         // ✅ IMMUNITY DROPPED!
    canGarnishSalary: true,
    canRequestGuarantor: true,
    strategicWarnings: [
        "🚨 تحذير نفقة: الراتب الصافي (1,000,000 دينار) أقل من النفقة المطلوبة (2,000,000 دينار). سقطت الحصانة - يُفعّل طلب الحبس أو إضافة كفيل ضامن."
    ]
}

// Override Details:
{
    immunityShouldDrop: true,
    salaryDeficit: 1000000,               // 2M - 1M
    requiresGuarantor: true,
    shouldEnableImprisonment: true,
    overrideMessage: "⚠️ النفقة المطلوبة (2,000,000 دينار) تتجاوز الراتب الصافي..."
}
```

**UI Action:**
- ✅ **FORCE-ENABLE** "طلب الحبس" button (RED/CRITICAL)
- ✅ Show "إضافة كفيل ضامن" button
- 🚨 Display critical warning overlay
- 💡 Suggest adding guarantor first

---

### Scenario 3.3: Employee + Alimony (Salary < Alimony) - WITH GUARANTOR

**Given:**
- Same as 3.2 BUT:
- Guarantor: **YES** ✅

**Code:**
```typescript
const ledger = createImmutableLedger(2000000, 'نفقة شرعية', 'موظف');
const actions = determineLegalActionsAvailability(ledger, 1000000, true); // true = has guarantor
```

**Expected Result:**
```javascript
{
    canRequestImprisonment: false,        // ❌ Disabled (guarantor protects)
    canGarnishSalary: true,
    canRequestGuarantor: true,
    strategicWarnings: [
        "✅ تم تقديم كفيل ضامن - الحبس معطل مؤقتاً"
    ]
}
```

**UI Action:**
- ❌ Hide imprisonment button (guarantor protects)
- ✅ Show "إدارة الكفيل الضامن" section
- ℹ️ Display: "الحبس معطل - كفيل ضامن موجود"

---

### Scenario 3.4: Self-Employed + Lump-Sum Alimony - NO SETTLEMENT

**Given:**
- Debtor: Self-Employed
- Claim: Alimony
- Demand Type: Lump-Sum (دفعة واحدة)
- Settlement: **NO**

**Code:**
```typescript
const warning = evaluateStrategicAlimonyWarning(
    'نفقة شرعية',
    'كاسب',
    true,          // isLumpSumDemand
    false          // hasSettlement
);
```

**Expected Result:**
```javascript
{
    shouldShowWarning: true,
    warningLevel: 'critical',
    warningTitle: '🚨 تحذير استراتيجي: نفقة مجمعة بدون تسوية',
    warningMessage: 'حبس المدين مقابل نفقة مجمعة كاملة (دفعة صفقة واحدة) سيجعله قانونياً "معسر" بهذا المبلغ بعد الإفراج عنه، مما يفقدك الرافعة القانونية للتحصيل المستقبلي...',
    recommendedActions: [
        '✅ إبرام تسوية مالية (أقساط شهرية)',
        '✅ طلب كفيل ضامن من المدين',
        '⚖️ المطالبة بالنفقات الجارية فقط (استبعاد المتراكمات)'
    ]
}
```

**UI Action:**
- 🚨 **SHOW CRITICAL OVERLAY** (Red border, requires acknowledgment)
- ⚠️ Block imprisonment button until lawyer acknowledges
- 💡 Highlight settlement button
- 📝 Show recommended actions

---

### Scenario 3.5: Self-Employed + Lump-Sum Alimony - WITH SETTLEMENT

**Given:**
- Same as 3.4 BUT:
- Settlement: **YES** ✅

**Code:**
```typescript
const warning = evaluateStrategicAlimonyWarning(
    'نفقة شرعية',
    'كاسب',
    true,
    true           // hasSettlement
);
```

**Expected Result:**
```javascript
{
    shouldShowWarning: false,             // ✅ No warning needed
    warningLevel: 'none'
}
```

**UI Action:**
- ✅ Proceed normally
- ✅ Show settlement details
- No critical warnings

---

## 📊 Payment Tracking Scenarios

### Scenario 4.1: Record Single Payment

**Given:**
- Ledger: 10,000,000 IQD debt
- Payment: 3,000,000 IQD

**Code:**
```typescript
let ledger = createImmutableLedger(10000000, 'دين مالي', 'كاسب');

ledger = recordPayment(ledger, {
    amount: 3000000,
    date: '2026-03-08',
    verified: true,
    notes: 'First installment'
});
```

**Expected Result:**
```javascript
{
    principal_debt: 10000000,             // 🔒 UNCHANGED
    total_paid: 3000000,                  // Updated
    remaining_balance: 7000000,           // Calculated
    payments: [
        {
            id: 'PAY-1709875200000-abc123',
            amount: 3000000,
            date: '2026-03-08',
            verified: true,
            notes: 'First installment'
        }
    ]
}
```

**UI Action:**
- Update financial dashboard
- Show payment in history
- Display progress: 30% complete

---

### Scenario 4.2: Record Multiple Payments

**Code:**
```typescript
let ledger = createImmutableLedger(10000000, 'دين مالي', 'كاسب');

ledger = recordPayment(ledger, { amount: 2000000, date: '2026-03-01', verified: true });
ledger = recordPayment(ledger, { amount: 3000000, date: '2026-03-08', verified: true });
ledger = recordPayment(ledger, { amount: 1000000, date: '2026-03-15', verified: true });

const summary = getPaymentHistorySummary(ledger);
```

**Expected Result:**
```javascript
{
    total_paid: 6000000,
    remaining_balance: 4000000,
    payments: [/* 3 payments */],
}

// Summary:
{
    total_payments: 3,
    verified_payments: 3,
    total_verified_amount: 6000000,
    total_breaches: 0,
    completion_percentage: 60.0
}
```

---

### Scenario 4.3: Record Breach + Trigger Coercive Measures

**Code:**
```typescript
let ledger = createImmutableLedger(10000000, 'دين مالي', 'كاسب');

// Payment breach
ledger = recordBreach(ledger, {
    date: '2026-03-15',
    missed_amount: 1000000,
    reason: 'المدين لم يدفع القسط الشهري',
    coercive_action_triggered: false
});

// Check if coercive measures needed
const needsCoercion = shouldTriggerCoerciveMeasures(ledger, 1);
```

**Expected Result:**
```javascript
needsCoercion: true                       // ✅ Trigger coercive measures!

ledger.breaches: [
    {
        id: 'BREACH-1709875200000-xyz789',
        date: '2026-03-15',
        missed_amount: 1000000,
        reason: 'المدين لم يدفع القسط الشهري',
        coercive_action_triggered: false
    }
]
```

**UI Action:**
- 🔥 **Highlight Coercive Measures Section** (pulsing/glow effect)
- ✅ Make imprisonment/guarantor buttons more prominent
- 📢 Show notification: "تم تسجيل خرق - يجب اتخاذ إجراءات جبرية"

---

## 🔍 Edge Cases

### Edge Case 1: Salary EXACTLY Equals Alimony

**Code:**
```typescript
const ledger = createImmutableLedger(1500000, 'نفقة شرعية', 'موظف');
const actions = determineLegalActionsAvailability(ledger, 1500000, false);
```

**Expected Result:**
```javascript
{
    canRequestImprisonment: false         // Equal = No override
}
```

**Explanation:** Salary >= Alimony, so immunity remains.

---

### Edge Case 2: Full Debt Paid

**Code:**
```typescript
let ledger = createImmutableLedger(5000000, 'دين مالي', 'كاسب');

ledger = recordPayment(ledger, { amount: 5000000, date: '2026-03-08', verified: true });

const actions = determineLegalActionsAvailability(ledger);
```

**Expected Result:**
```javascript
{
    remaining_balance: 0,
    canExecuteCoerciveMeasures: false     // Debt paid - no actions needed
}
```

**UI Action:**
- ✅ Show "تم سداد الدين بالكامل" message
- 🎉 Disable all coercive action buttons
- 📊 Display 100% completion

---

### Edge Case 3: Overpayment

**Code:**
```typescript
let ledger = createImmutableLedger(3000000, 'دين مالي', 'كاسب');

ledger = recordPayment(ledger, { amount: 5000000, date: '2026-03-08', verified: true });
```

**Expected Result:**
```javascript
{
    total_paid: 5000000,
    remaining_balance: 0                  // Cannot be negative (Math.max)
}
```

**UI Action:**
- Show overpayment: +2,000,000 IQD
- Suggest refund or credit to future obligations

---

## 📖 Quick Reference Table

| Profession | Claim Type | Salary vs Alimony | Guarantor | Imprisonment | Garnishment |
|------------|------------|-------------------|-----------|--------------|-------------|
| موظف | دين مالي | N/A | N/A | ❌ | ✅ (1/5 salary) |
| موظف | نفقة شرعية | Salary ≥ Alimony | N/A | ❌ | ✅ |
| موظف | نفقة شرعية | Salary < Alimony | ❌ No | ✅ FORCE | ✅ |
| موظف | نفقة شرعية | Salary < Alimony | ✅ Yes | ❌ | ✅ |
| كاسب | دين مالي | N/A | N/A | ✅ | ❌ |
| كاسب | نفقة شرعية (lump-sum) | N/A | N/A | ⚠️ + Warning | ❌ |
| متقاعد | دين مالي | N/A | N/A | ❌ | ✅ (1/5 pension) |
| عاطل | Any | N/A | N/A | ✅ | ❌ |

---

## 🎯 Decision Flowchart

```
START: Determine Legal Actions
         ↓
    What is profession?
         ↓
    ┌────┴────┐
    ↓         ↓
  موظف      كاسب/عاطل
    ↓         ↓
Imprisonment  Imprisonment
  DISABLED      ENABLED
    ↓         ↓
Garnishment  Garnishment
  ENABLED     DISABLED
    ↓         ↓
Is claim type نفقة شرعية?
    ↓         ↓
   YES       NO → END
    ↓
Compare Salary vs Alimony
    ↓
Salary < Alimony?
    ↓
   YES
    ↓
Has Guarantor?
    ↓
  ┌──┴──┐
  NO   YES
  ↓     ↓
FORCE  KEEP
ENABLE DISABLED
  ↓     ↓
 END   END
```

---

## 📞 Quick Help

**Need help with:**

1. **Integration?** → See `QUICK_START_INTEGRATION_EXAMPLE.tsx`
2. **API Details?** → See `IMMUTABLE_LEDGER_DOCUMENTATION.md`
3. **Testing?** → Run `npm test immutableLedgerEngine.test.ts`

---

**Version:** 2.0.0  
**Last Updated:** 2026-03-08

