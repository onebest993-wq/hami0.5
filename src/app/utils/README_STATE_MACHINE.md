# 🧠 Execution State Machine - Documentation

## Overview

The **Execution State Machine** is the **Single Source of Truth** for all execution file states in the Hami Legal System. It completely eliminates UI conflicts by enforcing strict date mathematics and state transitions according to Iraqi Law.

---

## The Four Sacred States

The system can ONLY exist in one of these four states at any time:

### 1. ⚪ **UNNOTIFIED** (`غير مبلغ`)
- **Trigger**: File created, no notification date logged
- **UI Behavior**:
  - Show clean "🔔 تبليغ المدين" button
  - Hide all timers and countdowns
  - Lock all coercive tools
- **Financial Impact**: No 3% execution fee

### 2. 🟡 **GRACE_PERIOD** (`فترة رضائية`)
- **Trigger**: Notification date logged, days_elapsed ≤ 7 (working days)
- **UI Behavior**:
  - Show live countdown badge: "⏳ باقي X أيام"
  - Hide "انتهت المهلة" button
  - Lock all coercive tools
- **Financial Impact**: No 3% execution fee
- **Holiday Extension**: If day 7 falls on weekend/holiday, auto-extend to next working day

### 3. 🔴 **READY_FOR_COERCIVE** (`جاهز للتنفيذ`)
- **Trigger**: days_elapsed > 7 (grace period expired)
- **UI Behavior**:
  - Show purple "🚨 إعلان انتهاء المهلة" button
  - Replace countdown with "انتهت مدة الإخبار" badge
  - Keep coercive tools locked until button is clicked
- **Financial Impact**: 3% execution fee auto-added on first click

### 4. 🟢 **CLOSED_PAID** (`مغلقة / مسددة`)
- **Trigger**: remaining_debt = 0
- **UI Behavior**: Show success badge
- **Financial Impact**: No further calculations

---

## Multi-Debtor State Isolation

### Problem
File 4567 has two debtors:
- Debtor A: notified on Feb 1st
- Debtor B: notified on Feb 4th

On Feb 9th, Debtor A's grace period expired, but Debtor B still has 2 days remaining.

### Solution
Each debtor has an **independent state** with isolated timers:

```typescript
masterState.debtors[0] = {
  debtorId: 'A',
  status: 'READY_FOR_COERCIVE',
  daysRemaining: 0,
  canTakeCoerciveAction: true
}

masterState.debtors[1] = {
  debtorId: 'B',
  status: 'GRACE_PERIOD',
  daysRemaining: 2,
  canTakeCoerciveAction: false
}
```

**UI Rendering**:
- Debtor A's card shows "🚨 جاهز للتنفيذ"
- Debtor B's card shows "⏳ باقي 2 أيام"
- Salary garnishment tool for Debtor A: **Unlocked**
- Salary garnishment tool for Debtor B: **Locked**

**Financial Sync**:
- 3% execution fee is added globally when **FIRST** debtor reaches `READY_FOR_COERCIVE`
- Coercive actions remain individually locked per debtor

---

## Holiday Extension Logic

### Iraqi Working Days
- **Weekdays**: Sunday - Thursday
- **Weekends**: Friday & Saturday
- **Public Holidays**: See `IRAQI_HOLIDAYS_2026` array in code

### Extension Rule
If the 7th day falls on a non-working day:
1. Auto-extend to the next working day
2. Update UI badge to show extension: "⏳ باقي X أيام (ممتد)"
3. Display reason: "يصادف عطلة أسبوعية" or "يصادف عطلة رسمية"

**Example**:
- Notification date: Feb 10, 2026 (Tuesday)
- Day 7: Feb 17, 2026 (Tuesday) → **Working day, no extension**
- Grace period ends: Feb 17, 2026

**Example 2**:
- Notification date: Feb 12, 2026 (Thursday)
- Day 7: Feb 19, 2026 (Thursday) → **Working day, no extension**
- Grace period ends: Feb 19, 2026

---

## Pause/Resume Execution

### Pause Functionality
Located in "تفاصيل السند" accordion, allows lawyer to pause execution for legal reasons:

**When Paused**:
- All timers freeze
- All coercive tools lock
- Red banner appears: "⚠️ الإضبارة موقوفة قانونياً"
- Buttons show: "⏸️ الإضبارة موقوفة"

**Use Cases**:
- Court order to halt execution
- Legal appeal filed
- Administrative delay

**Resume**:
- Timers continue from where they stopped
- Tools unlock based on current state
- Timeline logs resume event

---

## Integration Guide

### Step 1: Import State Machine
```typescript
import * as StateMachine from '@/app/utils/executionStateMachine';
```

### Step 2: Calculate Master State
```typescript
const masterState = StateMachine.calculateGlobalFileState(
    fileId,
    debtorsArray,
    remainingDebt,
    isPaused,
    pauseReason,
    isAlimony,
    executionFeeAdded,
    new Date()
);
```

### Step 3: Extract Status
```typescript
const executionStatus = masterState.globalStatus;
const statusMetadata = StateMachine.getStatusMetadata(executionStatus);
```

### Step 4: Conditional UI Rendering
```typescript
{executionStatus === 'UNNOTIFIED' && (
    <button>🔔 تبليغ المدين</button>
)}

{executionStatus === 'GRACE_PERIOD' && (
    <div>
        ⏳ {StateMachine.getCountdownText(
            masterState.debtors[0].daysRemaining, 
            masterState.debtors[0].isGracePeriodExtended
        )}
    </div>
)}

{executionStatus === 'READY_FOR_COERCIVE' && !gracePeriodEnded && (
    <button onClick={handleEndGracePeriod}>
        🚨 إعلان انتهاء المهلة
    </button>
)}
```

### Step 5: Lock Coercive Tools
```typescript
const isLegallyLocked = 
    executionStatus === 'UNNOTIFIED' || 
    executionStatus === 'GRACE_PERIOD' || 
    isPaused;

if (isLegallyLocked) {
    showToast('⚠️ مقفلة: يجب إكمال التبليغ وانتهاء مهلة الـ 7 أيام', 'warning');
    return;
}
```

---

## Validation & Debugging

### Development Mode Validation
The State Machine includes a built-in validator:

```typescript
if (process.env.NODE_ENV === 'development') {
    const validation = StateMachine.validateStateConsistency(
        executionStatus, 
        masterState,
        {
            // OPTIONAL: Pass actual UI state to check for conflicts
            isTimerVisible: true/false,
            isGracePeriodEndButtonVisible: true/false,
            isCoerciveArsenalUnlocked: true/false
        }
    );
    if (!validation.isValid) {
        console.warn('⚠️ State Machine CRITICAL Errors:', validation.errors);
    }
}
```

**IMPORTANT**: The validator is now **PASSIVE** by design:
- If you **don't** pass `uiState`, it only checks for critical status mismatches
- If you **do** pass `uiState`, it checks for actual UI conflicts
- This prevents false positives during development

**Common Validation Errors**:
- 🚨 Status mismatch between UI and State Machine (CRITICAL)
- 🚨 UI shows "انتهت المهلة" button during `GRACE_PERIOD` (CONFLICT)
- 🚨 Timers visible when status is `UNNOTIFIED` (CONFLICT)
- 🚨 Coercive tools unlocked during `GRACE_PERIOD` (CONFLICT)

---

## Financial Integration

### 3% Execution Fee Auto-Addition
```typescript
useEffect(() => {
    if (masterState.canAddExecutionFee && !executionFeeAdded) {
        // Auto-add 3% fee
        setExecutionFeeAdded(true);
        
        // Log timeline event
        const feeEvent = {
            type: 'system',
            title: '🔥 إضافة رسوم التحصيل 3%',
            description: 'تم إضافة رسوم التحصيل تلقائياً بعد انتهاء المهلة القانونية'
        };
        setTimelineEvents(prev => [feeEvent, ...prev]);
    }
}, [masterState.canAddExecutionFee, executionFeeAdded]);
```

**Exception**: Alimony cases are exempt from 3% fee (`isAlimony: true`)

---

## UI Components Affected

### ✅ Updated to Use State Machine
- `ExecutionDashboard.tsx` - Main dashboard
- `FinancialOperationsCenter.tsx` - Financial center
- Debtor Card (notification button + countdown)
- Coercive Arsenal (locking logic)
- Financial Status Badge

### ⚠️ Manual Check Required
If you create new components that display:
- Notification status
- Grace period timers
- Coercive tool access
- Financial status

**YOU MUST** integrate the State Machine to maintain consistency.

---

## Testing Scenarios

### Test 1: Normal Flow
1. Create execution file → Status: `UNNOTIFIED`
2. Click "تبليغ المدين" → Status: `GRACE_PERIOD`, countdown shows "باقي 7 أيام"
3. Wait 7 days → Status: `READY_FOR_COERCIVE`, purple button appears
4. Click "إعلان انتهاء المهلة" → 3% fee added, tools unlock
5. Pay full debt → Status: `CLOSED_PAID`

### Test 2: Holiday Extension
1. Notify debtor on Thursday (Feb 12)
2. Day 7 falls on Thursday (Feb 19) → No extension
3. Notify debtor on Friday (Feb 13)
4. Day 7 falls on Friday (Feb 20 - weekend) → **Auto-extend to Sunday (Feb 22)**
5. UI shows: "⏳ باقي 8 أيام (ممتد) - يصادف عطلة أسبوعية"

### Test 3: Multi-Debtor
1. File has 2 debtors
2. Notify Debtor A on Feb 1
3. Notify Debtor B on Feb 5
4. On Feb 9: Debtor A = `READY_FOR_COERCIVE`, Debtor B = `GRACE_PERIOD` (3 days left)
5. Click "إعلان انتهاء المهلة" → 3% fee added **globally**
6. Salary garnishment for A: **Unlocked**
7. Salary garnishment for B: **Locked** until Feb 13

### Test 4: Pause/Resume
1. Create file, notify debtor
2. After 3 days, pause execution → Timers freeze at "باقي 4 أيام"
3. Wait 5 real days (system date changes)
4. Resume execution → Timers continue from "باقي 4 أيام" (NOT "باقي -1 أيام")

---

## Legal References

- **Iraqi Execution Law Article 19**: 7-day grace period requirement
- **Iraqi Execution Law Article 23**: Working days calculation (excluding weekends/holidays)
- **Iraqi Execution Law Article 27**: 3% execution fee application

---

## Maintainer Notes

### DO NOT:
- ❌ Create multiple status variables (e.g., `isGracePeriod`, `isReady`, `isExpired`)
- ❌ Calculate `days_elapsed` in multiple components
- ❌ Show conflicting UI elements (e.g., "باقي 5 أيام" + "انتهت المهلة" simultaneously)
- ❌ Manually add 3% fee (let State Machine handle it)

### DO:
- ✅ Always call `calculateGlobalFileState()` for state
- ✅ Use `executionStatus` for all conditional rendering
- ✅ Let `canAddExecutionFee` trigger financial updates
- ✅ Test with `validateStateConsistency()` during development

---

## Support

For questions or issues with the State Machine:
1. Check `executionStateMachine.ts` comments
2. Run validation in development mode
3. Verify state with `debug.log('State:', masterState)`

---

**Version**: 5.0.0  
**Last Updated**: March 13, 2026  
**Author**: Hami Legal System Development Team