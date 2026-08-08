/**
 * مقارنة دلتا للـ scope/snapshot — مصدر واحد لدلالات «تجاهل هوية الدوال؛
 * فقط القيم القابلة للمقارنة» المستخدمة في مزامنة lazy chunks وتثبيت هوية
 * snapshot محضر المتابعة (منع إعادة رسم كل التبويبات بلا تغيير فعلي).
 *
 * استثناء: مفاتيح حفظ/فتح حرجة — تغيّر هوية الدالة (stub→real) يجب أن يرفع التوكن
 * وإلا تتجمّد قرارات/مالية على persistExecutionMerge فارغ.
 */
import { fingerprintExecutionOverlayData } from './executionOverlayDataFingerprint';
import { isExecutionHandlerStubLeaf } from '../executionHandlerClusterStubs';

/** حقول ضخمة/متداخلة — بصمة بدل deep-walk (يمنع stack overflow على المسار الساخن) */
const EXECUTION_LAZY_SYNC_FINGERPRINT_KEYS = new Set<string>([
    'timelineEvents',
    'mergedTimelineEvents',
    'mergedTimelineEventsDebtorScoped',
    'activeTimelineEventsDebtorScoped',
    'activeTimelineEvents',
    'savedNotesSplit',
    'caseTasksPending',
    'financialLedger',
    'trashedTimelineEvents',
    'trashedCaseNotes',
    'trashedCaseTasks',
    'caseNotesLog',
    'dockPinnedNotes',
    'dockPinnedTasks',
    'seizedMovablesForSeizureLog',
    'seizedPropertiesForSeizureLog',
]);

function fingerprintTimelineEventsScopeValue(value: unknown): string {
    if (!Array.isArray(value)) return '';
    return value
        .filter((row) => !Boolean((row as { trashedAt?: string | null })?.trashedAt))
        .map(
            (row) =>
                `${String((row as { id?: string }).id ?? '')}:${String((row as { type?: string }).type ?? '')}:${String((row as { title?: string }).title ?? '')}:${String((row as { timestamp?: string; date?: string }).timestamp ?? (row as { date?: string }).date ?? '')}`,
        )
        .join('|');
}

function fingerprintSavedNotesSplitScopeValue(value: unknown): string {
    if (value == null || typeof value !== 'object') return '';
    const split = value as { notes?: unknown[]; doneTasks?: unknown[] };
    const pack = (rows: unknown[] | undefined) =>
        (Array.isArray(rows) ? rows : [])
            .map(
                (row) =>
                    `${String((row as { id?: string }).id ?? '')}:${String((row as { title?: string }).title ?? '')}:${String((row as { trashedAt?: string | null }).trashedAt ?? '')}`,
            )
            .join(',');
    return `n:${pack(split.notes)};d:${pack(split.doneTasks)}`;
}

function fingerprintCaseTasksPendingScopeValue(value: unknown): string {
    if (!Array.isArray(value)) return '';
    return value
        .map(
            (row) =>
                `${String((row as { id?: string }).id ?? '')}:${String((row as { title?: string }).title ?? '')}:${String((row as { trashedAt?: string | null }).trashedAt ?? '')}`,
        )
        .join('|');
}

function fingerprintCaseNotesLogScopeValue(value: unknown): string {
    if (!Array.isArray(value)) return '';
    return value
        .map(
            (row) =>
                `${String((row as { id?: string }).id ?? '')}:${String((row as { title?: string }).title ?? '')}:${String((row as { trashedAt?: string | null }).trashedAt ?? '')}:${(row as { pinned?: boolean }).pinned ? '1' : '0'}`,
        )
        .join('|');
}

function fingerprintFinancialLedgerScopeValue(value: unknown): string {
    if (!Array.isArray(value)) return '';
    return value
        .map(
            (row) =>
                `${String((row as { id?: string }).id ?? '')}:${String((row as { amount?: unknown }).amount ?? '')}:${String((row as { date?: string }).date ?? '')}`,
        )
        .join('|');
}

function fingerprintSeizedAssetsScopeValue(value: unknown): string {
    if (!Array.isArray(value)) return '';
    return value
        .map((row) => {
            const asset = row as { id?: string; decisionRowId?: string; status?: string };
            return `${String(asset.id ?? '')}:${String(asset.decisionRowId ?? '')}:${String(asset.status ?? '')}`;
        })
        .join('|');
}

function fingerprintHeavyScopeValue(key: string, value: unknown): string {
    switch (key) {
        case 'timelineEvents':
        case 'mergedTimelineEvents':
        case 'mergedTimelineEventsDebtorScoped':
        case 'activeTimelineEventsDebtorScoped':
        case 'activeTimelineEvents':
        case 'trashedTimelineEvents':
            return fingerprintTimelineEventsScopeValue(value);
        case 'savedNotesSplit':
            return fingerprintSavedNotesSplitScopeValue(value);
        case 'caseTasksPending':
        case 'trashedCaseTasks':
        case 'dockPinnedTasks':
            return fingerprintCaseTasksPendingScopeValue(value);
        case 'caseNotesLog':
        case 'trashedCaseNotes':
        case 'dockPinnedNotes':
            return fingerprintCaseNotesLogScopeValue(value);
        case 'financialLedger':
            return fingerprintFinancialLedgerScopeValue(value);
        case 'seizedMovablesForSeizureLog':
        case 'seizedPropertiesForSeizureLog':
            return fingerprintSeizedAssetsScopeValue(value);
        default:
            return '';
    }
}

/**
 * مسودات حقول النماذج عالية التغيّر — لا ترفع shellOverlayScopeSyncToken
 * وإلا كل حرف في الملاحظات/الموعد يعيد تركيب طبقة الـ overlays كاملة.
 */
export const EXECUTION_LAZY_SYNC_DRAFT_CHURN_KEYS = new Set<string>([
    'noteTitle',
    'noteBody',
    'appointmentPurpose',
    'appointmentDateOnly',
    'appointmentTimeOptional',
]);

/** دوال يجب أن تُقارن بالمرجع — تجميدها يكسر الحفظ/الفتح */
export const EXECUTION_LAZY_SYNC_CRITICAL_HANDLER_KEYS = new Set<string>([
    'persistExecutionMerge',
    'pushTimelineEvent',
    'openDecisionsModalWithBoot',
    'openFinancialHubLedger',
    'setShowExecutionFinancialHub',
    'setShowDecisionsModal',
    'runSpecialFollowupSubmit',
    'requestFollowupSeizureDecision',
    'handleDossierAction',
    'saveCoerciveAction',
    'openEvictionResidentialGraceModal',
    'completeEvictionResidentialGrace',
    'savePoliceAssistanceEntry',
    'openPoliceAssistanceDetailsForDecision',
    'saveBreakInventoryLedgerEntry',
    'finalizeBreakInventoryEntry',
    'appendEvictionProcedure',
    'tryOpenPendingBreakInventoryLedger',
    'tryOpenPendingCustodianDetails',
    'saveJudicialCustodianEntry',
    'toggleEvictionGracePinned',
]);

/**
 * أيقونات lucide / وحدات UI ثابتة الاستيراد — مقارنة بالمرجع فقط
 * (تجنّب deep-walk عديم الفائدة على مسار ~468 مفتاحاً).
 */
export const EXECUTION_LAZY_SYNC_STABLE_UI_MODULE_KEYS = new Set<string>([
    'Activity',
    'AlertCircle',
    'AlertTriangle',
    'AnimatePresence',
    'Bell',
    'Book',
    'Bot',
    'Building2',
    'Calendar',
    'CalendarBridge',
    'Car',
    'CheckCircle',
    'ChevronDown',
    'ChevronLeft',
    'ChevronRight',
    'ChevronUp',
    'ClipboardList',
    'Clock',
    'ColleagueConsultationProvider',
    'CreditCard',
    'DebtorSeizureCategoryBadges',
    'DollarSign',
    'DossierSwitcher',
    'FileText',
    'MapPin',
    'Phone',
    'Scale',
    'Shield',
    'Users',
    'X',
    'XCircle',
]);

function isStableUiModuleKey(key: string): boolean {
    return key.startsWith('Lazy') || EXECUTION_LAZY_SYNC_STABLE_UI_MODULE_KEYS.has(key);
}

/**
 * بصمة الدلو الأوّلي (أعلام/أعداد/نصوص) — كشف سريع لتغيّر القيم الذرّية
 * دون deep-walk. الكائنات/الدوال تُترك للمسار التفصيلي (لا رفض سلبي خاطئ).
 */
export function fingerprintLazySyncPrimitiveBucket(scope: Record<string, unknown>): string {
    let out = '';
    for (const key of Object.keys(scope)) {
        if (EXECUTION_LAZY_SYNC_DRAFT_CHURN_KEYS.has(key)) continue;
        if (isStableUiModuleKey(key)) continue;
        const value = scope[key];
        if (typeof value === 'function') continue;
        if (value !== null && typeof value === 'object') continue;
        out += key;
        out += '=';
        out += String(value);
        out += ';';
    }
    return out;
}

export function isPlainComparableObject(value: unknown): value is Record<string, unknown> {
    if (value == null || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

export function areScopeValuesEqual(
    a: unknown,
    b: unknown,
    paired: WeakMap<object, object> = new WeakMap(),
    depth = 0,
): boolean {
    try {
        return areScopeValuesEqualInner(a, b, paired, depth);
    } catch {
        return Object.is(a, b);
    }
}

function areScopeValuesEqualInner(
    a: unknown,
    b: unknown,
    paired: WeakMap<object, object> = new WeakMap(),
    depth = 0,
): boolean {
    if (Object.is(a, b)) return true;
    if (depth > 48) return false;
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        for (let index = 0; index < a.length; index += 1) {
            if (!areScopeValuesEqualInner(a[index], b[index], paired, depth + 1)) return false;
        }
        return true;
    }
    if (isPlainComparableObject(a) && isPlainComparableObject(b)) {
        const prior = paired.get(a);
        if (prior === b) return true;
        paired.set(a, b);
        const aKeys = Object.keys(a);
        const bKeys = Object.keys(b);
        if (aKeys.length !== bKeys.length) return false;
        for (const key of aKeys) {
            if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
            if (!areScopeValuesEqualInner(a[key], b[key], paired, depth + 1)) return false;
        }
        return true;
    }
    return false;
}

function safeScopeValuesDiffer(a: unknown, b: unknown): boolean {
    if (Object.is(a, b)) return false;
    try {
        return !areScopeValuesEqualInner(a, b);
    } catch {
        // مقارنة عميقة فاشلة (دائرة/عمق) — لا نُسقط الواجهة ولا نُدخل حلقة token
        return false;
    }
}

function hasSelectedScopeDeltaForLazySyncInner(
    current: Record<string, unknown>,
    next: Record<string, unknown>,
): boolean {
    if (current === next) return false;
    // مجموعتا المفاتيح شبه متطابقتين دائماً (pick lists ثابتة) — تجنّب بناء Set
    // من ~470 مدخلاً في كل مزامنة، وهي على المسار الساخن لكل render للـ runtime.
    const currentKeys = Object.keys(current);
    const nextKeys = Object.keys(next);
    if (currentKeys.length !== nextKeys.length) return true;
    // دلو أوّلي: إن اختلفت الأعلام/النصوص → دلتا فوراً بلا deep-walk
    if (fingerprintLazySyncPrimitiveBucket(current) !== fingerprintLazySyncPrimitiveBucket(next)) {
        return true;
    }
    for (const key of nextKeys) {
        if (!Object.prototype.hasOwnProperty.call(current, key)) return true;
        if (EXECUTION_LAZY_SYNC_DRAFT_CHURN_KEYS.has(key)) {
            continue;
        }
        const currentValue = current[key];
        const nextValue = next[key];
        // مسار سريع — أغلب المفاتيح مراجع ثابتة بين renderين
        if (Object.is(currentValue, nextValue)) {
            continue;
        }
        if (isStableUiModuleKey(key)) {
            // Lazy*/أيقونات: مرجع فقط — لا deep-walk
            return true;
        }
        if (typeof currentValue === 'function' || typeof nextValue === 'function') {
            const eitherStub =
                isExecutionHandlerStubLeaf(currentValue) || isExecutionHandlerStubLeaf(nextValue);
            const critical = EXECUTION_LAZY_SYNC_CRITICAL_HANDLER_KEYS.has(key);
            if (eitherStub || critical) {
                if (currentValue !== nextValue) return true;
                continue;
            }
            if (typeof currentValue === 'function' && typeof nextValue === 'function') {
                continue;
            }
            return true;
        }
        if (key === 'executionDataRef') {
            continue;
        }
        if (key === 'executionData' || key === 'viewExecutionData') {
            if (fingerprintExecutionOverlayData(currentValue) === fingerprintExecutionOverlayData(nextValue)) {
                continue;
            }
            return true;
        }
        if (EXECUTION_LAZY_SYNC_FINGERPRINT_KEYS.has(key)) {
            if (
                fingerprintHeavyScopeValue(key, currentValue) !==
                fingerprintHeavyScopeValue(key, nextValue)
            ) {
                return true;
            }
            continue;
        }
        if (!safeScopeValuesDiffer(currentValue, nextValue)) {
            continue;
        }
        return true;
    }
    return false;
}

/** مزامنة lazy chunks — تجاهل هوية الدوال العامة؛ مقارنة حرجة للـ stubs والحفظ */
export function hasSelectedScopeDeltaForLazySync(
    current: Record<string, unknown>,
    next: Record<string, unknown>,
): boolean {
    try {
        return hasSelectedScopeDeltaForLazySyncInner(current, next);
    } catch {
        // عمق/دائرة/مقارنة فاشلة — لا نُسقط الواجهة ولا نُدخل حلقة token
        return false;
    }
}
