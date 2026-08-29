/**
 * HandlerCluster stubs — عقد stub → real
 *
 * 1) قبل اكتمال تحميل جسور `ExecutionDashboardHandlerCluster*Bridge`،
 *    يُستبدل كل معالِج ناقص بـ Proxy يُبلّغ عبر `registerExecutionHandlerStubNotifier`
 *    (toast «جاري تجهيز الأدوات») بدل انهيار "X is not a function".
 * 2) عند جاهزية الجسر، يُنشَر الـ cluster الحقيقي عبر
 *    `usePublishHandlerClusterWhenFingerprintChanges` ويستبدل stubs.
 * 3) لا تُحذف stubs قبل ضمان تحميل الجسور — نافذة السباق جزء من عقد التشغيل.
 * 4) أسماء Vite `execution-handler-cluster-*` يجب أن تبقى متطابقة مع ملفات الجسور.
 */
/** Placeholders until execution-core-handlers loads — must never fail silently. */
const HANDLER_STUB_BRAND = Symbol.for('hami.executionHandlerStub');

const STUB_TOAST_COOLDOWN_MS = 2_400;

type StubNotifier = (path: string) => void;

let stubNotifier: StubNotifier | null = null;
let lastStubToastAt = 0;
let stubInvocationCount = 0;

export function registerExecutionHandlerStubNotifier(notifier: StubNotifier | null): void {
    stubNotifier = notifier;
}

export function resetExecutionHandlerStubNotifierForTests(): void {
    stubNotifier = null;
    lastStubToastAt = 0;
    stubInvocationCount = 0;
}

export function getExecutionHandlerStubInvocationCountForTests(): number {
    return stubInvocationCount;
}

function notifyStubInvocation(path: string): void {
    stubInvocationCount += 1;
    const now = Date.now();
    if (now - lastStubToastAt < STUB_TOAST_COOLDOWN_MS) return;
    lastStubToastAt = now;
    try {
        stubNotifier?.(path);
    } catch {
        /* لا نكسر المسار إن فشل الإشعار */
    }
}

function stubCallResult(path: string): unknown {
    if (/Submit/i.test(path)) return { ok: false };
    return undefined;
}

function handlerLeaf(path: string): unknown {
    const fn = (..._args: unknown[]) => {
        notifyStubInvocation(path);
        return stubCallResult(path);
    };
    return new Proxy(fn, {
        get(_target, prop) {
            if (prop === HANDLER_STUB_BRAND) return true;
            if (prop === 'then') return undefined;
            if (prop === Symbol.toPrimitive) return () => '';
            if (prop === 'toString') return () => `ExecutionHandlerStub(${path})`;
            if (typeof prop === 'symbol') return undefined;
            return handlerLeaf(`${path}.${String(prop)}`);
        },
        apply(_target, _thisArg, _args) {
            notifyStubInvocation(path);
            return stubCallResult(path);
        },
    });
}

const HANDLER_STUB = handlerLeaf('cluster');

/**
 * Fallback لمعالِج لم يصل بعد من handler cluster (نافذة الـ stubs).
 * تسطيح scope bag يتخطى قيم الـ stubs (functions)، فتصل المفاتيح المسطّحة undefined —
 * هذا البديل يستدعي إشعار «جاري تجهيز الأدوات» بدل انهيار "X is not a function".
 */
export function executionHandlerNotReadyFallback(path: string): (...args: unknown[]) => unknown {
    return (..._args: unknown[]) => {
        notifyStubInvocation(path);
        return stubCallResult(path);
    };
}

const REST_EXTRA_DEFAULTS = {
    showResidentialEvictionGraceControl: false,
    showResidentialGraceEarlyEndRequest: false,
    residentialGraceAllowsFieldwork: false,
    showBreakInventoryRequest: false,
    firstActiveAppealDecisionId: null as string | null,
};

/** Keys consumed by pickHandlerClusterAssemblyHandlers + rest extras */
const ASSEMBLY_HANDLER_KEYS = [
    'notesTasksHandlers',
    'paymentHandlers',
    'notifyDebtorHandler',
    'heirsNotificationHandlers',
    'debtorSummonsCoerciveHandlers',
    'gracePeriodEndHandler',
    'evictionHeirsMemoHandlers',
    'evictionResidentialGraceHandlers',
    'policeAssistanceHandlers',
    'breakInventoryHandlers',
    'guarantorFollowupHandlers',
    'evictionFinancialHandlers',
    'moduleExpenseHandlers',
    'followupSeizureHandlers',
    'seizureAssetModalHandlers',
    'coerciveActionBridge',
    'coerciveActionHandlers',
    'seizureReleaseHandlers',
    'thirdPartyReceiveHandlers',
    'standaloneMarkHandlers',
    'salarySeizurePatch',
    'thirdPartySeizureHandlers',
    'realEstateSeizureHandlers',
    'dossierFollowupHandlers',
    'debtorEmploymentHandler',
    'stayHandlers',
    'voluntaryPeriodHandlers',
    'employeeAssignmentHandlers',
    'publicationNoticeHandlers',
    'appointmentHandler',
    'parentDossierPersistence',
    'pushTimelineEventBinding',
    'dossierLifecycleActions',
    'dossierMetaWorkflow',
    'evictionProceduresHandlers',
] as const;

/** مفاتيح dossierFollowupHandlers — يجب أن تكون object stub وليس function proxy لـ scopeBagPick */
const DOSSIER_FOLLOWUP_HANDLER_STUB_LEAF_KEYS = [
    'handleDossierAction',
    'runSpecialFollowupSubmit',
    'creditorOtherPartyTrackHandlers',
    'otherPartyTabSubmitHandler',
    'openOtherPartyAppealsModal',
] as const;

function buildHandlerGroupStub(prefix: string, keys: readonly string[]): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const key of keys) {
        out[key] = handlerLeaf(`${prefix}.${key}`);
    }
    return out;
}

function buildStubCluster(): Record<string, unknown> {
    const out: Record<string, unknown> = {
        pushTimelineEvent: (..._args: unknown[]) => {
            notifyStubInvocation('pushTimelineEvent');
            return undefined;
        },
        ...REST_EXTRA_DEFAULTS,
    };
    for (const key of ASSEMBLY_HANDLER_KEYS) {
        if (key === 'dossierFollowupHandlers') {
            out[key] = buildHandlerGroupStub('dossierFollowupHandlers', DOSSIER_FOLLOWUP_HANDLER_STUB_LEAF_KEYS);
            continue;
        }
        out[key] = handlerLeaf(key);
    }
    return out;
}

export const EXECUTION_HANDLER_CLUSTER_STUBS: Record<string, unknown> = buildStubCluster();

export function isExecutionHandlerStubLeaf(value: unknown): boolean {
    return typeof value === 'function' && (value as { [HANDLER_STUB_BRAND]?: boolean })[HANDLER_STUB_BRAND] === true;
}
