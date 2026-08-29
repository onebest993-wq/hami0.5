type ArchivePortalModule = typeof import('@/app/components/lawyer/ArchivePortal.tsx');

export type ArchivePortalComponent = ArchivePortalModule['ArchivePortal'];

const LOAD_TIMEOUT_MS = 18_000;

let archivePortalPromise: Promise<ArchivePortalModule> | null = null;
let lawsuitArchivePortalPromise: Promise<ArchivePortalModule> | null = null;
let cachedArchivePortal: ArchivePortalComponent | null = null;
let lawsuitFileGridPromise: Promise<void> | null = null;
let lawsuitFileGridReady = false;
let executionSurfacePromise: Promise<void> | null = null;
let executionSurfaceReady = false;
let executionFileGridPromise: Promise<void> | null = null;
let executionFileGridReady = false;
let cachedExecutionSurface:
    | (typeof import('@/app/components/lawyer/ArchivePortal/ArchivePortalExecutionSurface'))['ArchivePortalExecutionSurface']
    | null = null;
let cachedExecutionFileGrid:
    | (typeof import('@/app/components/lawyer/ArchivePortal/components/ExecutionArchiveFileGrid'))['ExecutionArchiveFileGrid']
    | null = null;

const archivePortalListeners = new Set<() => void>();
const lawsuitFileGridListeners = new Set<() => void>();
const executionSurfaceListeners = new Set<() => void>();
const executionFileGridListeners = new Set<() => void>();

function notifyArchivePortalListeners(): void {
    archivePortalListeners.forEach((listener) => listener());
}

function notifyLawsuitFileGridListeners(): void {
    lawsuitFileGridListeners.forEach((listener) => listener());
}

function notifyExecutionSurfaceListeners(): void {
    executionSurfaceListeners.forEach((listener) => listener());
}

function notifyExecutionFileGridListeners(): void {
    executionFileGridListeners.forEach((listener) => listener());
}

export function subscribeArchivePortalCache(listener: () => void): () => void {
    archivePortalListeners.add(listener);
    return () => {
        archivePortalListeners.delete(listener);
    };
}

export function subscribeLawsuitFileGridReady(listener: () => void): () => void {
    lawsuitFileGridListeners.add(listener);
    return () => {
        lawsuitFileGridListeners.delete(listener);
    };
}

export function subscribeExecutionSurfaceReady(listener: () => void): () => void {
    executionSurfaceListeners.add(listener);
    return () => {
        executionSurfaceListeners.delete(listener);
    };
}

export function subscribeExecutionFileGridReady(listener: () => void): () => void {
    executionFileGridListeners.add(listener);
    return () => {
        executionFileGridListeners.delete(listener);
    };
}

export function getCachedArchivePortal(): ArchivePortalComponent | null {
    return cachedArchivePortal;
}

/** شبكة بطاقات الدعاوى جاهزة للتبنّي بلا Suspense بعد الكروم */
export function getLawsuitFileGridReady(): boolean {
    return lawsuitFileGridReady;
}

/** سطح مخزن التنفيذ جاهز — يمنع Suspense الداخلي بعد اعتماد Portal */
export function getExecutionSurfaceReady(): boolean {
    return executionSurfaceReady;
}

/** شبكة بطاقات التنفيذ جاهزة — يمنع «جاري تحميل بطاقات التنفيذ» بعد الاعتماد */
export function getExecutionFileGridReady(): boolean {
    return executionFileGridReady;
}

export function getCachedExecutionSurface(): NonNullable<typeof cachedExecutionSurface> | null {
    return cachedExecutionSurface;
}

export function getCachedExecutionFileGrid(): NonNullable<typeof cachedExecutionFileGrid> | null {
    return cachedExecutionFileGrid;
}

/**
 * تقييم LawsuitArchiveFileGrid أثناء InstantShell — لا يُؤجّل notify للـ Portal.
 * Host الدعاوى ينتظر هذه الجاهزية قبل تركيب children.
 */
function ensureLawsuitFileGridPromise(): Promise<void> {
    if (!lawsuitFileGridPromise) {
        lawsuitFileGridPromise = import(
            '@/app/components/lawyer/ArchivePortal/components/LawsuitArchiveFileGrid'
        )
            .then(() => undefined)
            .catch(() => undefined)
            .then(() => {
                lawsuitFileGridReady = true;
                notifyLawsuitFileGridListeners();
            });
    }
    return lawsuitFileGridPromise;
}

function resetLawsuitFileGridCache(): void {
    lawsuitFileGridPromise = null;
    lawsuitFileGridReady = false;
    notifyLawsuitFileGridListeners();
}

function resetExecutionSurfaceCache(): void {
    executionSurfacePromise = null;
    executionSurfaceReady = false;
    cachedExecutionSurface = null;
    notifyExecutionSurfaceListeners();
}

function resetExecutionFileGridCache(): void {
    executionFileGridPromise = null;
    executionFileGridReady = false;
    cachedExecutionFileGrid = null;
    notifyExecutionFileGridListeners();
}

export function resetArchivePortalModuleCacheForTests(): void {
    archivePortalPromise = null;
    lawsuitArchivePortalPromise = null;
    cachedArchivePortal = null;
    resetLawsuitFileGridCache();
    resetExecutionSurfaceCache();
    resetExecutionFileGridCache();
    notifyArchivePortalListeners();
}

export function resetHubArchiveModuleCacheForTests(): void {
    archivePortalPromise = null;
    lawsuitArchivePortalPromise = null;
    cachedArchivePortal = null;
    resetLawsuitFileGridCache();
    resetExecutionSurfaceCache();
    resetExecutionFileGridCache();
    notifyArchivePortalListeners();
}

export function invalidateArchivePortalModuleCache(): void {
    archivePortalPromise = null;
    lawsuitArchivePortalPromise = null;
    cachedArchivePortal = null;
    resetLawsuitFileGridCache();
    resetExecutionSurfaceCache();
    resetExecutionFileGridCache();
    notifyArchivePortalListeners();
    void import('@/app/runtime/executionArchiveOpenSession')
        .then((m) => m.resetExecutionArchiveOpenSession())
        .catch(() => undefined);
}

function withLoadTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timeoutId = window.setTimeout(() => {
            reject(new Error(`انتهت مهلة تحميل ${label}. تحقق من الاتصال ثم أعد المحاولة.`));
        }, LOAD_TIMEOUT_MS);

        promise
            .then((value) => {
                window.clearTimeout(timeoutId);
                resolve(value);
            })
            .catch((error) => {
                window.clearTimeout(timeoutId);
                reject(error);
            });
    });
}

function ensureLawsuitArchivePortalPromise(): Promise<ArchivePortalModule> {
    if (!lawsuitArchivePortalPromise) {
        lawsuitArchivePortalPromise = withLoadTimeout(
            import('@/app/components/lawyer/ArchivePortal/ArchivePortalLawsuitEntry.tsx'),
            'أرشيف الدعاوى',
        )
            .then((mod) => {
                cachedArchivePortal = mod.ArchivePortal;
                notifyArchivePortalListeners();
                return mod;
            })
            .catch((error) => {
                lawsuitArchivePortalPromise = null;
                throw error;
            });
    }
    return lawsuitArchivePortalPromise;
}

function ensureArchivePortalPromise(): Promise<ArchivePortalModule> {
    if (!archivePortalPromise) {
        archivePortalPromise = withLoadTimeout(
            import('@/app/components/lawyer/ArchivePortal.tsx'),
            'أرشيف الإضابير',
        )
            .then((mod) => {
                cachedArchivePortal = mod.ArchivePortal;
                notifyArchivePortalListeners();
                return mod;
            })
            .catch((error) => {
                archivePortalPromise = null;
                throw error;
            });
    }
    return archivePortalPromise;
}

export function loadArchivePortalModule(): Promise<ArchivePortalModule> {
    return ensureArchivePortalPromise();
}

/**
 * سطح التنفيذ (lazy داخل OverlayEntry) — يُقيَّم أثناء InstantBody قبل التركيب.
 */
function ensureExecutionSurfacePromise(): Promise<void> {
    if (!executionSurfacePromise) {
        const loadSurface = import(
            '@/app/components/lawyer/ArchivePortal/ArchivePortalExecutionSurface'
        ).then((m) => {
            cachedExecutionSurface = m.ArchivePortalExecutionSurface;
            executionSurfaceReady = true;
            notifyExecutionSurfaceListeners();
        });
        executionSurfacePromise = loadSurface.catch(() => {
            executionSurfacePromise = null;
        });
    }
    return executionSurfacePromise;
}

/**
 * شبكة بطاقات التنفيذ — تقييم قبل اعتماد Portal لتفادي Suspense الداخلي.
 */
function ensureExecutionFileGridPromise(): Promise<void> {
    if (!executionFileGridPromise) {
        executionFileGridPromise = import(
            '@/app/components/lawyer/ArchivePortal/components/ExecutionArchiveFileGrid'
        )
            .then((m) => {
                cachedExecutionFileGrid = m.ExecutionArchiveFileGrid;
                executionFileGridReady = true;
                notifyExecutionFileGridListeners();
            })
            .catch(() => {
                executionFileGridPromise = null;
            });
    }
    return executionFileGridPromise ?? Promise.resolve();
}

/** دعاوى — أرشيف + شبكة دعاوى فقط (بلا chunk التنفيذ) */
export function loadLawsuitArchiveHubModule(): Promise<ArchivePortalModule> {
    prefetchLawsuitArchiveContent();
    return ensureLawsuitArchivePortalPromise();
}

/** تنفيذ — Portal فوراً؛ Surface/FileGrid تُسخَّن بالخلفية بلا حجب أول paint */
export function loadExecutionArchiveHubModule(): Promise<ArchivePortalModule> {
    prefetchExecutionArchiveContent();
    return loadArchivePortalModule();
}

/** شبكة بطاقات الدعاوى — تقييم أثناء InstantShell قبل تركيب Portal children */
export function prefetchLawsuitArchiveContent(): void {
    if (typeof window === 'undefined') return;
    void ensureLawsuitFileGridPromise();
}

function ensureExecutionSmartCardPromise(): void {
    void import('@/app/components/lawyer/ArchivePortal/components/ExecutionSmartCard').catch(
        () => undefined,
    );
}

function ensureExecutionArchiveLitePromise(): void {
    void import(
        '@/app/components/lawyer/ArchivePortal/components/ExecutionArchiveToolbar'
    ).catch(() => undefined);
}

function ensureExecutionArchivePinPromise(): void {
    void import('@/app/components/lawyer/ArchivePortal/components/ExecutionArchiveCardPin')
        .then((m) => {
            m.prefetchExecutionArchivePinStore();
        })
        .catch(() => undefined);
}

function ensureExecutionArchivePreviewPromise(): void {
    void import(
        '@/app/components/lawyer/ArchivePortal/components/ArchivePortalExecutionPreviewModal'
    ).catch(() => undefined);
}

/** سطح + شبكة مخزن التنفيذ — يمنع انتظار Suspense الداخلي بعد اعتماد Portal */
export function prefetchExecutionArchiveContent(): void {
    if (typeof window === 'undefined') return;
    void ensureExecutionSurfacePromise();
    void ensureExecutionFileGridPromise();
    ensureExecutionSmartCardPromise();
    ensureExecutionArchiveLitePromise();
    ensureExecutionArchivePinPromise();
    ensureExecutionArchivePreviewPromise();
}

export function prefetchLawsuitArchiveHubModule(): void {
    if (typeof window === 'undefined') return;
    void loadLawsuitArchiveHubModule().catch(() => undefined);
}

export function prefetchExecutionArchiveHubModule(): void {
    if (typeof window === 'undefined') return;
    void loadExecutionArchiveHubModule().catch(() => undefined);
}

export function hydrateArchiveHubForInstantOpen(archiveId: 'execution' | 'lawsuit'): Promise<boolean> {
    if (archiveId === 'lawsuit') {
        prefetchLawsuitArchiveContent();
    } else {
        prefetchExecutionArchiveContent();
    }
    const loader =
        archiveId === 'lawsuit' ? loadLawsuitArchiveHubModule() : loadExecutionArchiveHubModule();
    return loader.then(() => true).catch(() => false);
}
