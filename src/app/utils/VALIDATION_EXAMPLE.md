# 🧪 State Machine Validation - Usage Examples

## Overview

The `validateStateConsistency()` function is a **PASSIVE** validator. It only reports errors if you explicitly pass the `uiState` parameter to check for actual UI conflicts.

---

## ✅ Correct Usage (No False Positives)

### Example 1: Basic Validation (Status Mismatch Only)

```typescript
// This will ONLY check if displayedStatus matches calculatedState.globalStatus
// No warnings about timers or buttons
const validation = StateMachine.validateStateConsistency(
    executionStatus,
    masterState
    // No uiState parameter = only critical checks
);

if (!validation.isValid) {
    console.error('🚨 CRITICAL:', validation.errors);
}
```

**Output**: Empty errors array (unless there's a status mismatch)

---

### Example 2: Full UI State Validation

```typescript
// Pass actual UI state to check for conflicts
const validation = StateMachine.validateStateConsistency(
    executionStatus,
    masterState,
    {
        isTimerVisible: document.querySelector('.countdown-timer') !== null,
        isGracePeriodEndButtonVisible: document.querySelector('[data-end-grace-period]') !== null,
        isCoerciveArsenalUnlocked: !document.querySelector('[data-coercive-locked]')
    }
);

if (!validation.isValid) {
    console.error('🚨 UI CONFLICTS:', validation.errors);
}
```

**Output**: Detailed errors about actual UI conflicts

---

## 🔍 What the Validator Checks

### Without `uiState` (Default)
✅ **Checks**:
- Status mismatch between UI and State Machine

❌ **Does NOT check**:
- Timer visibility
- Button visibility
- Tool lock states

### With `uiState` (Full Validation)
✅ **Checks**:
- Status mismatch
- Timer visibility conflicts
- Button visibility conflicts
- Coercive tool lock state conflicts

---

## 🚨 Common Errors & How to Fix

### Error 1: Status Mismatch
```
🚨 CRITICAL: Status mismatch - UI shows "GRACE_PERIOD" but State Machine calculated "READY_FOR_COERCIVE"
```

**Cause**: You're using a stale/cached status instead of `masterState.globalStatus`

**Fix**:
```typescript
// ❌ Wrong
const [status, setStatus] = useState('GRACE_PERIOD');

// ✅ Correct
const executionStatus = masterState.globalStatus;
```

---

### Error 2: Timer Visible Before Notification
```
🚨 UI CONFLICT: Countdown timer is visible before notification (should be hidden)
```

**Cause**: Timer is rendered without checking `executionStatus`

**Fix**:
```typescript
// ❌ Wrong
{debtorNotificationDate && (
    <div>⏳ باقي {daysRemaining} أيام</div>
)}

// ✅ Correct
{executionStatus === 'GRACE_PERIOD' && (
    <div>⏳ باقي {masterState.debtors[0].daysRemaining} أيام</div>
)}
```

---

### Error 3: End Grace Period Button During Grace Period
```
🚨 UI CONFLICT: "انتهت المهلة" button is visible during GRACE_PERIOD (should be hidden)
```

**Cause**: Button is shown based on `daysSinceNotice` instead of `executionStatus`

**Fix**:
```typescript
// ❌ Wrong
{daysSinceNotice > 7 && !gracePeriodEnded && (
    <button>🚨 إعلان انتهاء المهلة</button>
)}

// ✅ Correct
{executionStatus === 'READY_FOR_COERCIVE' && !gracePeriodEnded && (
    <button>🚨 إعلان انتهاء المهلة</button>
)}
```

---

### Error 4: Coercive Tools Unlocked Too Early
```
🚨 UI CONFLICT: Coercive tools are unlocked before grace period ends (should be locked)
```

**Cause**: Tools are unlocked based on custom logic instead of State Machine

**Fix**:
```typescript
// ❌ Wrong
const isLocked = daysSinceNotice <= 7;

// ✅ Correct
const isLegallyLocked = 
    executionStatus === 'UNNOTIFIED' || 
    executionStatus === 'GRACE_PERIOD' || 
    isPaused;
```

---

## 📊 Validation Flow Diagram

```
┌─────────────────────────────────────────────────┐
│  validateStateConsistency(status, masterState)  │
└─────────────────────────────────────────────────┘
                      │
                      ├─ Check: status === masterState.globalStatus?
                      │     NO → 🚨 CRITICAL ERROR
                      │     YES → Continue
                      │
                      ├─ uiState provided?
                      │     NO → ✅ Return (no further checks)
                      │     YES → Continue
                      │
                      ├─ Check: isTimerVisible during UNNOTIFIED?
                      │     YES → 🚨 UI CONFLICT
                      │
                      ├─ Check: isGracePeriodEndButtonVisible during GRACE_PERIOD?
                      │     YES → 🚨 UI CONFLICT
                      │
                      └─ Check: isCoerciveArsenalUnlocked when locked?
                            YES → 🚨 UI CONFLICT
```

---

## 🎯 Best Practices

### 1. Use Validation During Development Only
```typescript
if (process.env.NODE_ENV === 'development') {
    const validation = StateMachine.validateStateConsistency(...);
    if (!validation.isValid) {
        debug.warn('Validation errors:', validation.errors);
    }
}
```

### 2. Don't Pass `uiState` Unless Debugging
```typescript
// Normal usage (no uiState)
const validation = StateMachine.validateStateConsistency(executionStatus, masterState);

// Debugging mode (with uiState)
const validation = StateMachine.validateStateConsistency(
    executionStatus, 
    masterState,
    {
        isTimerVisible: !!countdownElement,
        isGracePeriodEndButtonVisible: !!endGracePeriodButton,
        isCoerciveArsenalUnlocked: coerciveArsenalState === 'unlocked'
    }
);
```

### 3. Always Use `masterState.globalStatus`
```typescript
// ❌ Wrong - manual state tracking
const [status, setStatus] = useState('UNNOTIFIED');

// ✅ Correct - single source of truth
const executionStatus = masterState.globalStatus;
```

### 4. Conditional Rendering Based on Status
```typescript
// ❌ Wrong - multiple conditions
{debtorNotificationDate && daysSinceNotice <= 7 && !isExpired && (
    <Timer />
)}

// ✅ Correct - single condition
{executionStatus === 'GRACE_PERIOD' && (
    <Timer />
)}
```

---

## 🧪 Testing Validation

### Test 1: No Errors (Clean State)
```typescript
const masterState = {
    globalStatus: 'GRACE_PERIOD',
    // ...
};

const validation = validateStateConsistency('GRACE_PERIOD', masterState);
console.log(validation.isValid); // true
console.log(validation.errors);  // []
```

### Test 2: Status Mismatch
```typescript
const masterState = {
    globalStatus: 'READY_FOR_COERCIVE',
    // ...
};

const validation = validateStateConsistency('GRACE_PERIOD', masterState);
console.log(validation.isValid); // false
console.log(validation.errors);  // ["🚨 CRITICAL: Status mismatch..."]
```

### Test 3: UI Conflict
```typescript
const masterState = {
    globalStatus: 'UNNOTIFIED',
    // ...
};

const validation = validateStateConsistency(
    'UNNOTIFIED',
    masterState,
    { isTimerVisible: true } // Timer should be hidden
);

console.log(validation.isValid); // false
console.log(validation.errors);  // ["🚨 UI CONFLICT: Countdown timer..."]
```

---

## 📚 Summary

| Scenario | Pass `uiState`? | What It Checks |
|----------|----------------|----------------|
| Production | ❌ No | Nothing (validator disabled) |
| Dev - Basic | ❌ No | Status mismatch only |
| Dev - Full | ✅ Yes | Status + UI conflicts |

**Recommendation**: Use basic validation (no `uiState`) unless actively debugging UI issues.

---

**Version**: 5.0.0  
**Last Updated**: March 14, 2026
