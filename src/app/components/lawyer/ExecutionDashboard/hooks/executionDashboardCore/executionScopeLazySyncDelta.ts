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

export function areScopeValuesEqual(a: unknown, b: unknown): boolean {
    if (Object.is(a, b)) return true;
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        for (let index = 0; index < a.length; index += 1) {
            if (!areScopeValuesEqual(a[index], b[index])) return false;
        }
        return true;
    }
    if (isPlainComparableObject(a) && isPlainComparableObject(b)) {
        const aKeys = Object.keys(a);
        const bKeys = Object.keys(b);
        if (aKeys.length !== bKeys.length) return false;
        for (const key of aKeys) {
            if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
            if (!areScopeValuesEqual(a[key], b[key])) return false;
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
        if (!areScopeValuesEqual(currentValue, nextValue)) {
            return true;
        }
    }
    return false;
}
