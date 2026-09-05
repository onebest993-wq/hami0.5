/**
 * HandlerCluster stubs — عقد stub → real
 *
 * 1) قبل اكتمال تحميل جسور `ExecutionDashboardHandlerCluster*Bridge`،
 *    يُستبدل كل معالِج ناقص بـ Proxy. الضغطة تُسخّن الجسر وتنتظر المعالج الحي ثم تنفّذه.
 * 2) عند جاهزية الجسر، يُنشَر الـ cluster الحقيقي عبر
 *    `usePublishHandlerClusterWhenFingerprintChanges` ويستبدل stubs.
 * 3) لا تُحذف stubs قبل ضمان تحميل الجسور — نافذة السباق جزء من عقد التشغيل.
 * 4) أسماء Vite `execution-handler-cluster-*` يجب أن تبقى متطابقة مع ملفات الجسور.
 */
/** Placeholders until execution-core-handlers loads — must never fail silently. */
const HANDLER_STUB_BRAND = Symbol.for('hami.executionHandlerStub');

const STUB_TOAST_COOLDOWN_MS = 2_400;
/** سقف مهلة — مسار الـ cluster يُوقَظ فور النشر، والاستطلاع فقط لـ `readLive`. */
const STUB_LIVE_WAIT_MS = 2_400;
const STUB_LIVE_POLL_MS = 40;

type StubNotifier = (path: string) => void;

let stubNotifier: StubNotifier | null = null;
let stubTimeoutNotifier: StubNotifier | null = null;
let lastStubToastAt = 0;
let stubInvocationCount = 0;
let liveHandlerCluster: Record<string, unknown> | null = null;
const inflightStubInvokes = new Map<string, Promise<unknown>>();
const liveWaiters = new Set<() => void>();
const abortWaiters = new Set<() => void>();

export function registerExecutionHandlerStubNotifier(notifier: StubNotifier | null): void {
    stubNotifier = notifier;
}

export function registerExecutionHandlerStubTimeoutNotifier(notifier: StubNotifier | null): void {
    stubTimeoutNotifier = notifier;
}

export function abortExecutionHandlerLiveWait(): void {
    for (const abort of [...abortWaiters]) abort();
    inflightStubInvokes.clear();
}

export function publishExecutionLiveHandlerCluster(
    cluster: Record<string, unknown> | null,
): void {
    liveHandlerCluster = cluster;
    for (const wake of [...liveWaiters]) wake();
}

export function resetExecutionHandlerStubNotifierForTests(): void {
    stubNotifier = null;
    stubTimeoutNotifier = null;
    lastStubToastAt = 0;
    stubInvocationCount = 0;
    liveHandlerCluster = null;
    inflightStubInvokes.clear();
    liveWaiters.clear();
    abortWaiters.clear();
}

export function getExecutionHandlerStubInvocationCountForTests(): number {
    return stubInvocationCount;
}

export function lookupExecutionLiveHandler(
    path: string,
    cluster: Record<string, unknown> | null = liveHandlerCluster,
): ((...args: unknown[]) => unknown) | undefined {
    if (!cluster || !path) return undefined;
    let current: unknown = cluster;
    for (const part of path.split('.')) {
        if (!current || (typeof current !== 'object' && typeof current !== 'function')) {
            return undefined;
        }
        current = (current as Record<string, unknown>)[part];
    }
    if (typeof current === 'function' && !isExecutionHandlerStubLeaf(current)) {
        return current as (...args: unknown[]) => unknown;
    }
    return undefined;
}

function notifyStubInvocation(path: string): void {
    stubInvocationCount += 1;
    try {
        stubNotifier?.(path);
    } catch {
        /* لا نكسر المسار إن فشل التسخين */
    }
}

function notifyStubTimeout(path: string): void {
    const now = Date.now();
    if (now - lastStubToastAt < STUB_TOAST_COOLDOWN_MS) return;
    lastStubToastAt = now;
    try {
        stubTimeoutNotifier?.(path);
    } catch {
        /* لا نكسر المسار إن فشل الإشعار */
    }
}

export const EXECUTION_HANDLER_WAIT_TIMEOUT = Symbol.for('hami.executionHandlerWaitTimeout');

export function isExecutionHandlerWaitTimeout(value: unknown): boolean {
    return value === EXECUTION_HANDLER_WAIT_TIMEOUT;
}

function stubCallResult(path: string): unknown {
    if (/Submit/i.test(path)) return { ok: false };
    return EXECUTION_HANDLER_WAIT_TIMEOUT;
}

type LiveWaitOutcome =
    | { status: 'live'; fn: (...args: unknown[]) => unknown }
    | { status: 'timeout' }
    | { status: 'abort' };

function waitForLiveHandler(
    path: string,
    readLive: (() => unknown) | undefined,
    deadline: number,
): Promise<LiveWaitOutcome> {
    const tryRead = () => readLiveHandler(path, readLive);
    const immediate = tryRead();
    if (immediate) return Promise.resolve({ status: 'live', fn: immediate });

    return new Promise((resolve) => {
        let settled = false;
        const finish = (outcome: LiveWaitOutcome) => {
            if (settled) return;
            settled = true;
            liveWaiters.delete(onWake);
            abortWaiters.delete(onAbort);
            clearTimeout(timeoutId);
            if (pollId != null) clearInterval(pollId);
            resolve(outcome);
        };
        const onWake = () => {
            const live = tryRead();
            if (live) finish({ status: 'live', fn: live });
        };
        const onAbort = () => finish({ status: 'abort' });
        liveWaiters.add(onWake);
        abortWaiters.add(onAbort);
        const timeoutId = setTimeout(() => finish({ status: 'timeout' }), Math.max(0, deadline - Date.now()));
        const pollId = readLive ? setInterval(onWake, STUB_LIVE_POLL_MS) : null;
    });
}

function readLiveHandler(
    path: string,
    readLive?: () => unknown,
): ((...args: unknown[]) => unknown) | undefined {
    if (readLive) {
        const fromReader = readLive();
        if (typeof fromReader === 'function' && !isExecutionHandlerStubLeaf(fromReader)) {
            return fromReader as (...args: unknown[]) => unknown;
        }
    }
    return lookupExecutionLiveHandler(path);
}

export type InvokeMaybeStubFunctionOptions = {
    readLive?: () => unknown;
    /** دمج ضغطات الزر نفسها — لا تستخدمه لمسارات persist ذات patches مختلفة */
    coalesce?: boolean;
};

/**
 * ينتظر المعالج الحي ثم يستدعيه بنفس الحجج.
 * `readLive` للمسارات المقيمة خارج cluster (persist / وفاة الخصوم).
 */
export function invokeMaybeStubFunctionOrWait(
    path: string,
    args: unknown[],
    options?: InvokeMaybeStubFunctionOptions,
): unknown {
    const immediate = readLiveHandler(path, options?.readLive);
    if (immediate) return immediate(...args);

    const coalesce = options?.coalesce !== false;
    if (coalesce) {
        const existing = inflightStubInvokes.get(path);
        if (existing) return existing;
    }

    notifyStubInvocation(path);
    const pending = (async () => {
        const outcome = await waitForLiveHandler(path, options?.readLive, Date.now() + STUB_LIVE_WAIT_MS);
        if (outcome.status === 'live') return outcome.fn(...args);
        if (outcome.status === 'timeout') notifyStubTimeout(path);
        return stubCallResult(path);
    })().finally(() => {
        if (coalesce && inflightStubInvokes.get(path) === pending) {
            inflightStubInvokes.delete(path);
        }
    });
    if (coalesce) inflightStubInvokes.set(path, pending);
    return pending;
}

function invokeExecutionHandlerOrWait(path: string, args: unknown[]): unknown {
    return invokeMaybeStubFunctionOrWait(path, args);
}

function handlerLeaf(path: string): unknown {
    const fn = (...args: unknown[]) => invokeExecutionHandlerOrWait(path, args);
    return new Proxy(fn, {
        get(_target, prop) {
            if (prop === HANDLER_STUB_BRAND) return true;
            if (prop === 'then') return undefined;
            if (prop === Symbol.toPrimitive) return () => '';
            if (prop === 'toString') return () => `ExecutionHandlerStub(${path})`;
            if (typeof prop === 'symbol') return undefined;
            return handlerLeaf(`${path}.${String(prop)}`);
        },
        apply(_target, _thisArg, args) {
            return invokeExecutionHandlerOrWait(path, args as unknown[]);
        },
    });
}

/**
 * Fallback لمعالِج لم يصل بعد من handler cluster (نافذة الـ stubs).
 * تسطيح scope bag يتخطى قيم الـ stubs (functions)، فتصل المفاتيح المسطّحة undefined —
 * هذا البديل ينتظر المعالج الحي ثم ينفّذه بدل انهيار "X is not a function".
 */
export function executionHandlerNotReadyFallback(path: string): (...args: unknown[]) => unknown {
    return (...args: unknown[]) => invokeExecutionHandlerOrWait(path, args);
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
    'focusSeizurePropertyInlineCompletion',
    'focusSeizureMovableInlineCompletion',
    'focusSeizureThirdPartyInlineCompletion',
    'focusSeizureNoticeInlineCompletion',
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
        pushTimelineEvent: (...args: unknown[]) => invokeExecutionHandlerOrWait('pushTimelineEvent', args),
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
