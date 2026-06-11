# 📊 IMMUTABLE LEDGER ENGINE - TECHNICAL DOCUMENTATION

## 🎯 Executive Summary

The **Immutable Ledger Engine** is a backend-only financial logic system designed for the Iraqi Legal Execution System. It implements strict immutability rules, procedural branching based on employment status, and intelligent alimony override logic - all without touching the UI layer.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER (UI)                      │
│                    ❌ NO CHANGES MADE HERE                       │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                   STATE MANAGEMENT LAYER                         │
│              (React State / Context / Hooks)                     │
│                                                                   │
│  • Calls Immutable Ledger Engine functions                       │
│  • Receives LegalActionsAvailability objects                     │
│  • Updates UI based on engine responses                          │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│             🔥 IMMUTABLE LEDGER ENGINE (NEW)                     │
│                 /utils/immutableLedgerEngine.ts                  │
│                                                                   │
│  📦 Core Functions:                                              │
│   • createImmutableLedger()                                      │
│   • determineLegalActionsAvailability()                          │
│   • evaluateAlimonyOverride()                                    │
│   • evaluateStrategicAlimonyWarning()                            │
│   • recordPayment() / recordBreach()                             │
│                                                                   │
│  🔐 Principles:                                                  │
│   • Immutability (Object.freeze)                                 │
│   • Pure Functions (no side effects)                             │
│   • Type Safety (TypeScript)                                     │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                     DATA PERSISTENCE LAYER                       │
│                      (LocalStorage)                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 RULE 1: Immutability Contract

### The Sacred Principle

```typescript
const ledger = createImmutableLedger(10000000, 'دين مالي', 'كاسب');

// ✅ ALLOWED: Read principal_debt
console.log(ledger.principal_debt); // 10000000

// ❌ FORBIDDEN: Modify principal_debt
ledger.principal_debt = 5000000; // TypeError in strict mode

// ✅ ALLOWED: Create new ledger with updated state
const updatedLedger = recordPayment(ledger, { amount: 2000000, ... });
```

### Technical Implementation

```typescript
export interface ImmutableFinancialLedger {
    // 🔒 IMMUTABLE CORE
    readonly principal_debt: number;
    
    // 📊 DYNAMIC (calculated, not user-modifiable)
    execution_fee: number;
    total_paid: number;
    remaining_balance: number;
    
    // 🔐 INTEGRITY FLAG
    ledger_locked: boolean;
}

// Freeze on creation
return Object.freeze({ ... });
```

---

## 🌳 RULE 2: Procedural Branching

### Branch Decision Tree

```
┌─────────────────────────────────────────┐
│   What is debtor_profession?            │
└─────────────────────────────────────────┘
           ↓                    ↓
    ┌──────────┐        ┌──────────────┐
    │  موظف    │        │  كاسب        │
    │ Employee │        │ Self-Employed│
    └──────────┘        └──────────────┘
           ↓                    ↓
  ┌─────────────────┐   ┌─────────────────┐
  │ DEFAULT STATE:  │   │ DEFAULT STATE:  │
  │ • Imprisonment: │   │ • Imprisonment: │
  │   ❌ DISABLED   │   │   ✅ ENABLED    │
  │ • Garnishment:  │   │ • Garnishment:  │
  │   ✅ ENABLED    │   │   ❌ DISABLED   │
  └─────────────────┘   └─────────────────┘
           ↓                    ↓
    ┌──────────────┐    ┌──────────────┐
    │ claim_type?  │    │ claim_type?  │
    └──────────────┘    └──────────────┘
           ↓                    ↓
  ┌─────────────────┐   ┌─────────────────┐
  │ نفقة شرعية?    │   │ نفقة شرعية +   │
  │ (Alimony)       │   │ Lump Sum?       │
  └─────────────────┘   └─────────────────┘
           ↓                    ↓
  ┌─────────────────┐   ┌─────────────────┐
  │ ALIMONY         │   │ STRATEGIC       │
  │ OVERRIDE        │   │ WARNING         │
  │ (see below)     │   │ (see below)     │
  └─────────────────┘   └─────────────────┘
```

### Code Example

```typescript
const ledger = createImmutableLedger(5000000, 'دين مالي', 'موظف');

const actions = determineLegalActionsAvailability(ledger);

console.log(actions.canRequestImprisonment); // false (employee protected)
console.log(actions.canGarnishSalary); // true
console.log(actions.salaryGarnishmentNote); // "✅ يمكن إصدار قرار حجز 1/5 من الراتب الصافي"
```

---

## ⚠️ RULE 3: Alimony Override Logic

### The Override Mechanism

**TRIGGER CONDITIONS:**
1. `debtor_profession` === 'موظف' (Government Employee)
2. `claim_type` === 'نفقة شرعية' (Alimony)
3. Employee Net Salary provided

**LOGIC FLOW:**

```typescript
IF (alimony_required > employee_net_salary):
    immunity_drops = TRUE
    
    IF (guarantor_provided):
        imprisonment = FALSE (guarantor protects)
        show_guarantor_note = TRUE
    ELSE:
        imprisonment = TRUE (force-enable)
        show_warning = "Salary insufficient - imprisonment unlocked"
```

### Code Example

```typescript
// SCENARIO 1: Salary < Alimony, No Guarantor
const ledger = createImmutableLedger(
    2000000,      // 2M IQD alimony
    'نفقة شرعية',
    'موظف'
);

const actions = determineLegalActionsAvailability(
    ledger,
    1000000,      // Net salary: 1M (LESS than alimony)
    false         // No guarantor
);

console.log(actions.canRequestImprisonment); // ✅ TRUE (immunity dropped)
console.log(actions.canRequestGuarantor);    // ✅ TRUE
console.log(actions.strategicWarnings);      
// ["🚨 Salary 1M < Alimony 2M → Immunity dropped"]

// SCENARIO 2: Same, but WITH Guarantor
const actionsWithGuarantor = determineLegalActionsAvailability(
    ledger,
    1000000,
    true          // ✅ Guarantor provided
);

console.log(actionsWithGuarantor.canRequestImprisonment); // ❌ FALSE
console.log(actionsWithGuarantor.strategicWarnings);
// ["✅ Guarantor provided - imprisonment disabled"]
```

### Detailed Override Evaluation

```typescript
const overrideResult = evaluateAlimonyOverride(
    2000000,      // Alimony required
    1000000,      // Employee net salary
    false         // No guarantor
);

console.log(overrideResult);
/*
{
    isOverrideActive: true,
    employeeNetSalary: 1000000,
    alimonyRequired: 2000000,
    salaryDeficit: 1000000,              // 2M - 1M
    immunityShouldDrop: true,            // Required > Salary
    requiresGuarantor: true,
    shouldEnableImprisonment: true,      // No guarantor
    overrideMessage: "⚠️ Alimony (2M) exceeds salary (1M) by 1M. Immunity dropped - add guarantor or enable imprisonment."
}
*/
```

---

## 🚨 RULE 4: Strategic Alimony Warning

### Warning Trigger Conditions

**ALL must be true:**
1. `claim_type` === 'نفقة شرعية'
2. `debtor_profession` === 'كاسب' (Self-Employed)
3. `isLumpSumDemand` === true (Demanding full accumulated alimony)
4. `hasSettlement` === false (No payment plan)

### The Legal Problem

When you imprison a self-employed debtor for a **lump-sum accumulated alimony** without a settlement:

```
BEFORE IMPRISONMENT:
┌────────────────────────────────────┐
│ Debtor owes 10M IQD (accumulated)  │
│ Legal Status: Debtor               │
│ Leverage: HIGH (threat of prison)  │
└────────────────────────────────────┘

AFTER IMPRISONMENT (30-60 days):
┌────────────────────────────────────┐
│ Debtor released (still owes 10M)   │
│ Legal Status: INSOLVENT (معسر)     │
│ Leverage: ZERO (can't re-imprison) │
└────────────────────────────────────┘
```

### Code Example

```typescript
const warning = evaluateStrategicAlimonyWarning(
    'نفقة شرعية',
    'كاسب',
    true,          // Lump-sum demand
    false          // No settlement
);

console.log(warning);
/*
{
    shouldShowWarning: true,
    warningLevel: 'critical',
    warningTitle: '🚨 Strategic Warning: Lump-Sum Alimony Without Settlement',
    warningMessage: 'Imprisoning debtor for full accumulated alimony will make them legally "Insolvent" after release, losing all future leverage...',
    recommendedActions: [
        '✅ Initiate financial settlement (monthly installments)',
        '✅ Request guarantor from debtor',
        '⚖️ Demand current alimony only (exclude arrears)'
    ]
}
*/
```

### UI Integration (Conceptual)

```typescript
// In your component state management
const [showCriticalWarning, setShowCriticalWarning] = useState(false);

useEffect(() => {
    const warning = evaluateStrategicAlimonyWarning(...);
    
    if (warning.shouldShowWarning) {
        // Show overlay/modal
        setShowCriticalWarning(true);
    }
}, [claimType, debtorProfession, isLumpSum, hasSettlement]);
```

---

## 📊 RULE 5: Binary Tracking Engine

### State Machine

```
┌─────────────┐
│   INITIAL   │
│  STATE      │
│ (principal) │
└─────────────┘
       ↓
   ┌───────┐
   │ Event │
   └───────┘
       ↓
  ┌─────────────────────┐
  │ Is it "PAID" or     │
  │ "BREACHED"?         │
  └─────────────────────┘
     ↓            ↓
┌────────┐   ┌─────────┐
│  PAID  │   │ BREACH  │
└────────┘   └─────────┘
     ↓            ↓
┌──────────┐ ┌──────────────────┐
│ Update   │ │ Trigger Coercive │
│ total_   │ │ Measures UI      │
│ paid     │ │                  │
└──────────┘ └──────────────────┘
```

### Recording Payments

```typescript
// IMMUTABLE UPDATES
let ledger = createImmutableLedger(10000000, 'دين مالي', 'كاسب');

// Payment 1
ledger = recordPayment(ledger, {
    amount: 3000000,
    date: '2026-03-01',
    verified: true,
    notes: 'First installment'
});

console.log(ledger.total_paid);         // 3000000
console.log(ledger.remaining_balance);  // 7000000

// Payment 2
ledger = recordPayment(ledger, {
    amount: 2000000,
    date: '2026-03-08',
    verified: true
});

console.log(ledger.total_paid);         // 5000000
console.log(ledger.remaining_balance);  // 5000000
```

### Recording Breaches

```typescript
ledger = recordBreach(ledger, {
    date: '2026-03-15',
    missed_amount: 1000000,
    reason: 'Debtor failed to pay monthly installment',
    coercive_action_triggered: false
});

// Check if coercive measures needed
const needsAction = shouldTriggerCoerciveMeasures(ledger);

if (needsAction) {
    // UI: Highlight "Imprisonment" / "Guarantor" buttons
    console.log('🔥 Coercive measures zone activated!');
}
```

### Payment History Summary

```typescript
const summary = getPaymentHistorySummary(ledger);

console.log(summary);
/*
{
    total_payments: 2,
    verified_payments: 2,
    total_verified_amount: 5000000,
    total_unverified_amount: 0,
    total_breaches: 1,
    completion_percentage: 50.0
}
*/
```

---

## 🎨 UI Integration Guide (NO UI CHANGES MADE)

### Conceptual Integration Pattern

```typescript
// ═══════════════════════════════════════════════════════════
// COMPONENT: ExecutionFileDetailsView.tsx (EXAMPLE)
// ═══════════════════════════════════════════════════════════

import {
    createImmutableLedger,
    determineLegalActionsAvailability,
    evaluateStrategicAlimonyWarning,
    recordPayment,
    recordBreach,
    type ImmutableFinancialLedger
} from '../utils/immutableLedgerEngine';

function ExecutionFileDetailsView() {
    // ═══════════════════════════════════════════════════════
    // STATE INITIALIZATION
    // ═══════════════════════════════════════════════════════
    const [ledger, setLedger] = useState<ImmutableFinancialLedger | null>(null);
    const [employeeNetSalary, setEmployeeNetSalary] = useState<number>(0);
    const [hasGuarantor, setHasGuarantor] = useState(false);
    
    // ═══════════════════════════════════════════════════════
    // CREATE LEDGER ON FILE OPEN
    // ═══════════════════════════════════════════════════════
    useEffect(() => {
        if (fileData) {
            const newLedger = createImmutableLedger(
                fileData.principal_debt,
                fileData.claim_type,
                fileData.debtor_profession
            );
            setLedger(newLedger);
        }
    }, [fileData]);
    
    // ═══════════════════════════════════════════════════════
    // COMPUTE AVAILABLE ACTIONS
    // ═══════════════════════════════════════════════════════
    const legalActions = useMemo(() => {
        if (!ledger) return null;
        
        return determineLegalActionsAvailability(
            ledger,
            employeeNetSalary || undefined,
            hasGuarantor
        );
    }, [ledger, employeeNetSalary, hasGuarantor]);
    
    // ═══════════════════════════════════════════════════════
    // STRATEGIC WARNING CHECK
    // ═══════════════════════════════════════════════════════
    const strategicWarning = useMemo(() => {
        if (!ledger) return null;
        
        return evaluateStrategicAlimonyWarning(
            ledger.claim_type,
            ledger.debtor_profession,
            isLumpSumDemand,
            hasSettlement
        );
    }, [ledger, isLumpSumDemand, hasSettlement]);
    
    // ═══════════════════════════════════════════════════════
    // PAYMENT HANDLER
    // ═══════════════════════════════════════════════════════
    const handlePayment = (amount: number) => {
        if (!ledger) return;
        
        const updatedLedger = recordPayment(ledger, {
            amount,
            date: new Date().toISOString().split('T')[0],
            verified: true
        });
        
        setLedger(updatedLedger);
        
        // Save to localStorage
        saveToLocalStorage('execution_ledger', updatedLedger);
    };
    
    // ═══════════════════════════════════════════════════════
    // BREACH HANDLER
    // ═══════════════════════════════════════════════════════
    const handleBreach = () => {
        if (!ledger) return;
        
        const updatedLedger = recordBreach(ledger, {
            date: new Date().toISOString().split('T')[0],
            missed_amount: monthlyInstallment,
            reason: 'Failed to pay',
            coercive_action_triggered: true
        });
        
        setLedger(updatedLedger);
        
        // UI: Highlight coercive measures section
        highlightCoerciveMeasures();
    };
    
    // ═══════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════
    return (
        <div>
            {/* Financial Dashboard */}
            <div>
                <p>Principal Debt: {ledger?.principal_debt}</p>
                <p>Total Paid: {ledger?.total_paid}</p>
                <p>Remaining: {ledger?.remaining_balance}</p>
            </div>
            
            {/* Legal Actions (Conditional Rendering) */}
            {legalActions?.canRequestImprisonment && (
                <button>طلب الحبس</button>
            )}
            
            {legalActions?.canGarnishSalary && (
                <button>حجز 1/5 الراتب</button>
            )}
            
            {/* Strategic Warning Overlay */}
            {strategicWarning?.shouldShowWarning && (
                <AlertOverlay
                    level={strategicWarning.warningLevel}
                    title={strategicWarning.warningTitle}
                    message={strategicWarning.warningMessage}
                    actions={strategicWarning.recommendedActions}
                />
            )}
        </div>
    );
}
```

---

## 🧪 Testing Coverage

### Test Suite Overview

**Location:** `/src/app/utils/immutableLedgerEngine.test.ts`

**Total Test Cases:** 40+

**Coverage Categories:**

1. **Core Ledger Creation** (4 tests)
   - Valid ledger creation
   - Invalid input handling
   - Execution fee calculation
   - Integrity verification

2. **Branch A: Government Employee** (6 tests)
   - Default state (imprisonment disabled)
   - Salary garnishment enabled
   - Alimony override triggers
   - Guarantor protection
   - Edge cases

3. **Branch B: Self-Employed** (4 tests)
   - Default state (imprisonment enabled)
   - Strategic warnings
   - Settlement conditions

4. **Binary Tracking** (8 tests)
   - Payment recording
   - Breach recording
   - History summaries
   - Coercive triggers

5. **Immutability** (3 tests)
   - Freeze enforcement
   - Integrity violations
   - Calculation accuracy

6. **Edge Cases** (10+ tests)
   - Salary equals alimony
   - Full debt payment
   - Multiple professions
   - Large numbers

### Running Tests

```bash
npm run test immutableLedgerEngine.test.ts
```

**Expected Output:**
```
✓ Core Ledger Creation (4)
✓ Branch A: Government Employee (6)
✓ Branch B: Self-Employed (4)
✓ Binary Tracking Engine (8)
✓ Immutability & Integrity (3)
✓ Edge Cases & Complex Scenarios (10)

Total: 40 tests passed
```

---

## 📚 API Reference

### Core Functions

#### `createImmutableLedger()`

```typescript
function createImmutableLedger(
    principal_debt: number,
    claim_type: ClaimType,
    debtor_profession: DebtorProfession
): ImmutableFinancialLedger
```

**Parameters:**
- `principal_debt`: The original debt amount (must be > 0)
- `claim_type`: Type of claim (e.g., 'دين مالي', 'نفقة شرعية')
- `debtor_profession`: Debtor's profession ('موظف', 'كاسب', etc.)

**Returns:** Frozen ledger object

**Throws:** Error if `principal_debt <= 0`

---

#### `determineLegalActionsAvailability()`

```typescript
function determineLegalActionsAvailability(
    ledger: ImmutableFinancialLedger,
    employeeNetSalary?: number,
    hasGuarantor?: boolean
): LegalActionsAvailability
```

**Parameters:**
- `ledger`: The immutable ledger
- `employeeNetSalary` (optional): For alimony override calculation
- `hasGuarantor` (optional): Whether guarantor is provided

**Returns:** Object with boolean flags for legal actions

---

#### `recordPayment()`

```typescript
function recordPayment(
    ledger: ImmutableFinancialLedger,
    payment: Omit<PaymentRecord, 'id'>
): ImmutableFinancialLedger
```

**Parameters:**
- `ledger`: Current ledger
- `payment`: Payment details (amount, date, verified, notes)

**Returns:** NEW ledger with updated state (immutable)

---

#### `recordBreach()`

```typescript
function recordBreach(
    ledger: ImmutableFinancialLedger,
    breach: Omit<BreachRecord, 'id'>
): ImmutableFinancialLedger
```

**Parameters:**
- `ledger`: Current ledger
- `breach`: Breach details (date, missed_amount, reason)

**Returns:** NEW ledger with breach record

---

## 🚀 Migration Path (For Existing Code)

### Phase 1: Add Engine (✅ COMPLETE)
```bash
# Files created:
/src/app/utils/immutableLedgerEngine.ts
/src/app/utils/immutableLedgerEngine.test.ts
```

### Phase 2: State Management Integration (NEXT)
```typescript
// In your main execution file manager:
import { createImmutableLedger } from '../utils/immutableLedgerEngine';

// Replace:
const [principalDebt, setPrincipalDebt] = useState(0);

// With:
const [ledger, setLedger] = useState<ImmutableFinancialLedger | null>(null);
```

### Phase 3: UI Conditional Rendering (NEXT)
```typescript
// Replace hardcoded buttons with conditional rendering:
const actions = determineLegalActionsAvailability(ledger, ...);

{actions.canRequestImprisonment && <ImprisonmentButton />}
{actions.canGarnishSalary && <SalaryGarnishmentButton />}
```

### Phase 4: Payment Tracking (NEXT)
```typescript
// Replace manual payment state with binary tracking:
const handlePayment = (amount) => {
    const updatedLedger = recordPayment(ledger, { amount, ... });
    setLedger(updatedLedger);
};
```

---

## ⚠️ Common Pitfalls

### ❌ DON'T: Mutate the ledger directly

```typescript
ledger.total_paid += 1000000; // ❌ ERROR: Read-only property
```

### ✅ DO: Use recordPayment()

```typescript
ledger = recordPayment(ledger, { amount: 1000000, ... }); // ✅
```

---

### ❌ DON'T: Forget to check alimony override

```typescript
// Missing employeeNetSalary for government employee + alimony
const actions = determineLegalActionsAvailability(ledger); // ⚠️ Incomplete
```

### ✅ DO: Provide all context

```typescript
const actions = determineLegalActionsAvailability(
    ledger,
    employeeNetSalary,  // ✅ Required for alimony override
    hasGuarantor
);
```

---

## 📞 Support & Contact

**Documentation Version:** 2.0.0  
**Last Updated:** 2026-03-08  
**Engine Version:** 2.0.0  

For questions or issues, contact the Legal Tech Team.

---

## 📄 License

Proprietary - Iraqi Legal Execution System  
© 2026 All Rights Reserved
