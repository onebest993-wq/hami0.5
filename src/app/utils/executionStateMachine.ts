/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🧠 EXECUTION STATE MACHINE - THE SINGLE SOURCE OF TRUTH
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This is the BRAIN of the entire execution system.
 * It enforces strict date mathematics and state transitions according to Iraqi Law.
 * 
 * @version 5.0.0
 * @author Hami Legal System
 * @lawReference Iraqi Execution Law Articles 19-27
 */

// ═══════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The Four Sacred States of Execution
 * NO OTHER STATES ARE ALLOWED
 */
export type ExecutionStatus = 
    | 'UNNOTIFIED'           // ⚪ غير مبلغ
    | 'GRACE_PERIOD'         // 🟡 فترة رضائية (Days 1-7)
    | 'READY_FOR_COERCIVE'   // 🔴 جاهز للتنفيذ (Day 8+)
    | 'CLOSED_PAID';         // 🟢 مغلقة / مسددة

/**
 * Status Display Metadata
 */
export interface ExecutionStatusMeta {
    status: ExecutionStatus;
    label: string;
    icon: string;
    color: string;
    bgColor: string;
    borderColor: string;
}

/**
 * Per-Debtor State (for multi-debtor isolation)
 */
export interface DebtorExecutionState {
    debtorId: string;
    debtorName: string;
    notificationDate: string | null;
    status: ExecutionStatus;
    daysElapsed: number;
    daysRemaining: number;
    canTakeCoerciveAction: boolean;
    isGracePeriodExtended: boolean;
    extensionReason?: string;
}

/**
 * Global Execution File State
 */
export interface ExecutionFileState {
    fileId: string;
    remainingDebt: number;
    isPaused: boolean;
    pauseReason?: string;
    debtors: DebtorExecutionState[];
    globalStatus: ExecutionStatus; // The "most advanced" status among all debtors
    canAddExecutionFee: boolean;
    executionFeeAdded: boolean;
    isAlimony: boolean;
}

/**
 * Iraqi Public Holidays (2026)
 */
const IRAQI_HOLIDAYS_2026: string[] = [
    '2026-01-01', // New Year
    '2026-01-06', // Army Day
    '2026-04-09', // Eid al-Fitr (estimated)
    '2026-04-10', // Eid al-Fitr
    '2026-04-11', // Eid al-Fitr
    '2026-06-15', // Eid al-Adha (estimated)
    '2026-06-16', // Eid al-Adha
    '2026-06-17', // Eid al-Adha
    '2026-06-18', // Eid al-Adha
    '2026-07-06', // Islamic New Year (estimated)
    '2026-10-03', // National Day
    // Add more as needed
];

// ═══════════════════════════════════════════════════════════════════════════
// CORE CHRONO-MATH ENGINE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * تحويل YYYY-MM-DD إلى تاريخ تقويمي محلي (يتجنب انزياح UTC مع new Date("yyyy-mm-dd"))
 */
export function parseLocalNotificationDate(ymd: string): Date {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd).trim());
    if (!m) {
        const d = new Date(ymd);
        return Number.isNaN(d.getTime()) ? new Date(Number.NaN) : d;
    }
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    return new Date(y, mo, d, 12, 0, 0, 0);
}

function isValidDate(value: Date): boolean {
    return !Number.isNaN(value.getTime());
}

/**
 * تنسيق تاريخ التقويم المحلي YYYY-MM-DD دون المرور بـ UTC
 * (يُجنّب انزياح اليوم عند استخدام toISOString().slice(0, 10)).
 */
export function formatDateToLocalYmd(d: Date): string {
    if (!d || Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${mo}-${day}`;
}

/** اليوم التقويمي الحالي وفق منطقة زمنية الجهاز — للحقول اليومية وليس للطابع الفوري الدقيق */
export function getLocalTodayYmd(now: Date = new Date()): string {
    return formatDateToLocalYmd(now);
}

function toLocalNoonDate(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
}

/**
 * Check if a date is a weekend (Friday/Saturday in Iraq)
 */
export function isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 5 || day === 6; // Friday = 5, Saturday = 6
}

/**
 * Check if a date is an Iraqi public holiday
 */
export function isPublicHoliday(date: Date): boolean {
    const dateStr = formatDateToLocalYmd(date);
    return dateStr !== '' && IRAQI_HOLIDAYS_2026.includes(dateStr);
}

/**
 * Check if a date is a working day (not weekend, not holiday)
 */
export function isWorkingDay(date: Date): boolean {
    return !isWeekend(date) && !isPublicHoliday(date);
}

/**
 * Calculate the next working day from a given date
 */
export function getNextWorkingDay(date: Date): Date {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    
    while (!isWorkingDay(nextDay)) {
        nextDay.setDate(nextDay.getDate() + 1);
    }
    
    return nextDay;
}

/**
 * نهاية مهلة الرضا (أيام تقويمية بحتة من اليوم التالي للإخبار) + اختياري يوم إضافي بقرار المحامي فقط.
 * لا يُمدّد تلقائياً لعطلة نهاية الأسبوع أو رسمية — ذلك قرار يدوي من الواجهة.
 */
export function calculateGracePeriodEnd(notificationDate: string, manualHolidayExtension: boolean = false): {
    endDate: Date;
    isExtended: boolean;
    extensionReason?: string;
} {
    const extra = manualHolidayExtension ? 1 : 0;
    const endDate = calculateGracePeriodEndDate(notificationDate, extra);
    return {
        endDate,
        isExtended: manualHolidayExtension,
        extensionReason: manualHolidayExtension ? 'تمديد يدوي بقرار المحامي (+يوم تقويمي)' : '',
    };
}

/**
 * Calculate days elapsed since notification (only counting working days)
 */
export function calculateDaysElapsed(notificationDate: string, currentDate: Date = new Date()): number {
    const startDate = parseLocalNotificationDate(notificationDate);
    if (!isValidDate(startDate)) return 0;
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(currentDate);
    endDate.setHours(0, 0, 0, 0);
    
    let daysElapsed = 0;
    const iterDate = new Date(startDate);
    
    while (iterDate < endDate) {
        iterDate.setDate(iterDate.getDate() + 1);
        if (isWorkingDay(iterDate)) {
            daysElapsed++;
        }
    }
    
    return daysElapsed;
}

/**
 * 🆕 حساب الأيام الفعلية المنقضية منذ التبليغ (وليس أيام العمل)
 * ✅ القانون العراقي: الاحتساب يبدأ من اليوم التالي للتبليغ
 * ✅ 7 أيام فعلية (تشمل عطل نهاية الأسبوع والعطل الرسمية)
 */
export function calculateActualDaysElapsed(notificationDate: string, currentDate: Date = new Date()): number {
    const notif = parseLocalNotificationDate(notificationDate);
    if (!isValidDate(notif)) return 0;
    const startDate = toLocalNoonDate(notif);
    // الاحتساب يبدأ من اليوم التالي لتاريخ الإخبار الفعلي (كما يختاره المحامي)
    startDate.setDate(startDate.getDate() + 1);

    const endDate = toLocalNoonDate(currentDate);

    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
}

/** أول يوم يُسمح فيه بالإجراء الجبري بعد انتهاء المهلة: اليوم التالي للإخبار + 7 أيام تقويمية (+إضافي اختياري) */
export function calculateGracePeriodEndDate(notificationDate: string, extraCalendarDays: number = 0): Date {
    const notif = parseLocalNotificationDate(notificationDate);
    if (!isValidDate(notif)) {
        return new Date(Number.NaN);
    }
    const startDate = toLocalNoonDate(notif);
    startDate.setDate(startDate.getDate() + 1);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7 + Math.max(0, extraCalendarDays));

    return endDate;
}

/**
 * 🆕 حساب الأيام المتبقية في المهلة الرضائية
 */
export function calculateDaysRemaining(
    notificationDate: string,
    currentDate: Date = new Date(),
    extraCalendarDays: number = 0
): number {
    const daysElapsed = calculateActualDaysElapsed(notificationDate, currentDate);
    const total = 7 + Math.max(0, extraCalendarDays);
    return Math.max(0, total - daysElapsed);
}

/**
 * 🆕 التحقق من انتهاء المهلة الرضائية (هل مر أكثر من 7 أيام؟)
 */
export function isGracePeriodExpired(
    notificationDate: string,
    currentDate: Date = new Date(),
    extraCalendarDays: number = 0
): boolean {
    const daysElapsed = calculateActualDaysElapsed(notificationDate, currentDate);
    const total = 7 + Math.max(0, extraCalendarDays);
    return daysElapsed >= total;
}

/**
 * Calculate the exact execution status based on date mathematics
 * THIS IS THE SINGLE SOURCE OF TRUTH
 * 🆕 V17: Now supports manual holiday extension
 */
export function calculateExecutionStatus(
    notificationDate: string | null,
    remainingDebt: number,
    currentDate: Date = new Date(),
    manualHolidayExtension: boolean = false,
    /** جولة تبليغ ≥2 أو تبليغ لاحق بلا مهلة إخبار قانونية */
    skipLegalGrace: boolean = false
): {
    status: ExecutionStatus;
    daysElapsed: number;
    daysRemaining: number;
    isGracePeriodExtended: boolean;
    extensionReason?: string;
} {
    // Rule 1: If debt is 0, status is CLOSED
    if (remainingDebt <= 0) {
        return {
            status: 'CLOSED_PAID',
            daysElapsed: 0,
            daysRemaining: 0,
            isGracePeriodExtended: false,
        };
    }
    
    // Rule 2: If no notification date, status is UNNOTIFIED
    if (!notificationDate) {
        return {
            status: 'UNNOTIFIED',
            daysElapsed: 0,
            daysRemaining: manualHolidayExtension ? 8 : 7,
            isGracePeriodExtended: manualHolidayExtension,
            extensionReason: manualHolidayExtension ? 'تمديد يدوي متوقع (+يوم تقويمي)' : undefined,
        };
    }

    // Rule 3: أيام تقويمية فقط من اليوم التالي لتاريخ الإخبار؛ تمديد اختياري (+يوم) بقرار المحامي
    const extra = manualHolidayExtension ? 1 : 0;
    const daysElapsed = calculateActualDaysElapsed(notificationDate, currentDate);
    const totalGraceCalendarDays = 7 + extra;
    const daysRemaining = Math.max(0, totalGraceCalendarDays - daysElapsed);
    const { isExtended, extensionReason } = calculateGracePeriodEnd(notificationDate, manualHolidayExtension);

    if (skipLegalGrace) {
        return {
            status: 'READY_FOR_COERCIVE',
            daysElapsed,
            daysRemaining: 0,
            isGracePeriodExtended: isExtended,
            extensionReason: extensionReason || undefined,
        };
    }

    if (daysElapsed < totalGraceCalendarDays) {
        return {
            status: 'GRACE_PERIOD',
            daysElapsed,
            daysRemaining,
            isGracePeriodExtended: isExtended,
            extensionReason: extensionReason || undefined,
        };
    }
    return {
        status: 'READY_FOR_COERCIVE',
        daysElapsed,
        daysRemaining: 0,
        isGracePeriodExtended: isExtended,
        extensionReason: extensionReason || undefined,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// MULTI-DEBTOR STATE ISOLATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate individual debtor state with full isolation
 * 🆕 V17: Now supports manual holiday extension
 */
export function calculateDebtorState(
    debtorId: string,
    debtorName: string,
    notificationDate: string | null,
    remainingDebt: number,
    currentDate: Date = new Date(),
    manualHolidayExtension: boolean = false,
    skipLegalGrace: boolean = false
): DebtorExecutionState {
    const statusInfo = calculateExecutionStatus(
        notificationDate,
        remainingDebt,
        currentDate,
        manualHolidayExtension,
        skipLegalGrace
    );
    
    return {
        debtorId,
        debtorName,
        notificationDate,
        status: statusInfo.status,
        daysElapsed: statusInfo.daysElapsed,
        daysRemaining: statusInfo.daysRemaining,
        canTakeCoerciveAction: statusInfo.status === 'READY_FOR_COERCIVE',
        isGracePeriodExtended: statusInfo.isGracePeriodExtended,
        extensionReason: statusInfo.extensionReason,
    };
}

/**
 * Calculate the global file state from multiple debtors
 * CRITICAL: Each debtor has independent timers and states
 * 🆕 V17: Now supports manual holiday extension per file
 */
export function calculateGlobalFileState(
    fileId: string,
    debtors: Array<{ id: string; name: string; notificationDate: string | null }>,
    remainingDebt: number,
    isPaused: boolean,
    pauseReason: string | undefined,
    isAlimony: boolean,
    executionFeeAdded: boolean,
    currentDate: Date = new Date(),
    manualHolidayExtension: boolean = false,
    skipLegalGrace: boolean = false
): ExecutionFileState {
    // Calculate individual debtor states
    const debtorStates = debtors.map(debtor => 
        calculateDebtorState(
            debtor.id,
            debtor.name,
            debtor.notificationDate,
            remainingDebt,
            currentDate,
            manualHolidayExtension,
            skipLegalGrace
        )
    );
    
    // Determine the "most advanced" global status
    let globalStatus: ExecutionStatus = 'UNNOTIFIED';
    
    if (remainingDebt <= 0) {
        globalStatus = 'CLOSED_PAID';
    } else if (debtorStates.some(d => d.status === 'READY_FOR_COERCIVE')) {
        globalStatus = 'READY_FOR_COERCIVE';
    } else if (debtorStates.some(d => d.status === 'GRACE_PERIOD')) {
        globalStatus = 'GRACE_PERIOD';
    }
    
    // Rule: 3% execution fee is added globally when FIRST debtor reaches READY_FOR_COERCIVE
    const canAddExecutionFee = 
        !isAlimony && 
        !executionFeeAdded && 
        debtorStates.some(d => d.status === 'READY_FOR_COERCIVE');
    
    return {
        fileId,
        remainingDebt,
        isPaused,
        pauseReason,
        debtors: debtorStates,
        globalStatus,
        canAddExecutionFee,
        executionFeeAdded,
        isAlimony,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// UI METADATA HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get display metadata for a given status
 */
export function getStatusMetadata(status: ExecutionStatus): ExecutionStatusMeta {
    const metadata: Record<ExecutionStatus, ExecutionStatusMeta> = {
        UNNOTIFIED: {
            status: 'UNNOTIFIED',
            label: 'غير مبلغ',
            icon: '⚪',
            color: 'text-gray-400',
            bgColor: 'bg-gray-900/40',
            borderColor: 'border-gray-500/30',
        },
        GRACE_PERIOD: {
            status: 'GRACE_PERIOD',
            label: 'فترة رضائية',
            icon: '🟡',
            color: 'text-amber-400',
            bgColor: 'bg-amber-900/40',
            borderColor: 'border-amber-500/30',
        },
        READY_FOR_COERCIVE: {
            status: 'READY_FOR_COERCIVE',
            label: 'جاهز للتنفيذ',
            icon: '🔴',
            color: 'text-rose-400',
            bgColor: 'bg-rose-900/40',
            borderColor: 'border-rose-500/30',
        },
        CLOSED_PAID: {
            status: 'CLOSED_PAID',
            label: 'مغلقة / مسددة',
            icon: '🟢',
            color: 'text-emerald-400',
            bgColor: 'bg-emerald-900/40',
            borderColor: 'border-emerald-500/30',
        },
    };
    
    return metadata[status];
}

/**
 * Get human-readable countdown text
 */
export function getCountdownText(daysRemaining: number, isExtended: boolean = false): string {
    if (daysRemaining === 0) {
        return 'انتهت المهلة';
    } else if (daysRemaining === 1) {
        return isExtended ? 'باقي يوم واحد (ممتد)' : 'باقي يوم واحد';
    } else {
        return isExtended ? `باقي ${daysRemaining} أيام (ممتد)` : `باقي ${daysRemaining} أيام`;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// STATE MACHINE VALIDATOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate that the UI is in sync with the calculated state
 * Use this in development to catch bugs
 * 
 * NOTE: This is a PASSIVE validator - it only checks for actual UI conflicts,
 * not theoretical rules. The warnings are for developer guidance only.
 */
export function validateStateConsistency(
    displayedStatus: ExecutionStatus,
    calculatedState: ExecutionFileState,
    uiState?: {
        isTimerVisible?: boolean;
        isGracePeriodEndButtonVisible?: boolean;
        isCoerciveArsenalUnlocked?: boolean;
    }
): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // CRITICAL ERROR: Status mismatch between UI and State Machine
    if (displayedStatus !== calculatedState.globalStatus) {
        errors.push(
            `🚨 CRITICAL: Status mismatch - UI shows "${displayedStatus}" but State Machine calculated "${calculatedState.globalStatus}"`
        );
    }
    
    // UI STATE CHECKS (only if uiState is provided)
    if (uiState) {
        // Check for conflicting UI elements based on actual UI state
        if (calculatedState.globalStatus === 'GRACE_PERIOD' && uiState.isGracePeriodEndButtonVisible) {
            errors.push('🚨 UI CONFLICT: "انتهت المهلة" button is visible during GRACE_PERIOD (should be hidden)');
        }
        
        if (calculatedState.globalStatus === 'UNNOTIFIED' && uiState.isTimerVisible) {
            errors.push('🚨 UI CONFLICT: Countdown timer is visible before notification (should be hidden)');
        }
        
        if (calculatedState.isPaused && uiState.isCoerciveArsenalUnlocked) {
            errors.push('🚨 UI CONFLICT: Coercive tools are unlocked while execution is paused (should be locked)');
        }
        
        if ((calculatedState.globalStatus === 'UNNOTIFIED' || calculatedState.globalStatus === 'GRACE_PERIOD') && uiState.isCoerciveArsenalUnlocked) {
            errors.push('🚨 UI CONFLICT: Coercive tools are unlocked before grace period ends (should be locked)');
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        warnings,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT ALL
// ═══════════════════════════════════════════════════════════════════════════

export default {
    calculateExecutionStatus,
    calculateDebtorState,
    calculateGlobalFileState,
    getStatusMetadata,
    getCountdownText,
    calculateGracePeriodEnd,
    calculateDaysElapsed,
    isWorkingDay,
    isWeekend,
    isPublicHoliday,
    validateStateConsistency,
};