import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';

let workspaceScheduled = false;
let workspaceLoaded = false;
let workspaceLoadPromise: Promise<void> | null = null;

let executionDossiersLoaded = false;
let executionDossiersLoadPromise: Promise<void> | null = null;

let criminalDossiersLoaded = false;
let criminalDossiersLoadPromise: Promise<void> | null = null;

let smartDossiersLoaded = false;
let smartDossiersLoadPromise: Promise<void> | null = null;

let adminLoaded = false;
let adminLoadPromise: Promise<void> | null = null;

/** CSS أقسام اللوحة الشائعة — منتدى/مستودع/إعدادات/ملف/بحث/تقويم. */
export function ensureDeferredWorkspaceFeatureStylesLoaded(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    if (workspaceLoaded) return Promise.resolve();
    if (workspaceLoadPromise) return workspaceLoadPromise;

    workspaceScheduled = true;
    workspaceLoadPromise = import('@/styles/deferred-features-workspace.css')
        .then(() => {
            workspaceLoaded = true;
        })
        .catch(() => {
            workspaceLoadPromise = null;
        });

    return workspaceLoadPromise ?? Promise.resolve();
}

/** CSS إضبارة التنفيذ + المركز المالي. */
export function ensureDeferredExecutionDossierStylesLoaded(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    if (executionDossiersLoaded) return Promise.resolve();
    if (executionDossiersLoadPromise) return executionDossiersLoadPromise;

    executionDossiersLoadPromise = import('@/styles/deferred-features-dossiers-execution.css')
        .then(() => {
            executionDossiersLoaded = true;
        })
        .catch(() => {
            executionDossiersLoadPromise = null;
        });

    return executionDossiersLoadPromise ?? Promise.resolve();
}

/** CSS الإضبارة الجزائية. */
export function ensureDeferredCriminalDossierStylesLoaded(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    if (criminalDossiersLoaded) return Promise.resolve();
    if (criminalDossiersLoadPromise) return criminalDossiersLoadPromise;

    criminalDossiersLoadPromise = import('@/styles/deferred-features-dossiers-criminal.css')
        .then(() => {
            criminalDossiersLoaded = true;
        })
        .catch(() => {
            criminalDossiersLoadPromise = null;
        });

    return criminalDossiersLoadPromise ?? Promise.resolve();
}

/** CSS الملف الذكي / المستعجل / المذكرات. */
export function ensureDeferredSmartDossierStylesLoaded(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    if (smartDossiersLoaded) return Promise.resolve();
    if (smartDossiersLoadPromise) return smartDossiersLoadPromise;

    smartDossiersLoadPromise = import('@/styles/deferred-features-dossiers-smart.css')
        .then(() => {
            smartDossiersLoaded = true;
        })
        .catch(() => {
            smartDossiersLoadPromise = null;
        });

    return smartDossiersLoadPromise ?? Promise.resolve();
}

/**
 * كل أوراق الأضابير — تسخين نية عامة / توافق المسارات القديمة.
 * الفتح الحي يفضّل الدوال المجال أعلاه.
 */
export function ensureDeferredDossierFeatureStylesLoaded(): Promise<void> {
    return Promise.all([
        ensureDeferredExecutionDossierStylesLoaded(),
        ensureDeferredCriminalDossierStylesLoaded(),
        ensureDeferredSmartDossierStylesLoaded(),
    ]).then(() => undefined);
}

/** CSS شاشة الإدارة — منفصل عن أضابير المحامي. */
export function ensureDeferredAdminFeatureStylesLoaded(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    if (adminLoaded) return Promise.resolve();
    if (adminLoadPromise) return adminLoadPromise;

    adminLoadPromise = import('@/styles/deferred-features-admin.css')
        .then(() => {
            adminLoaded = true;
        })
        .catch(() => {
            adminLoadPromise = null;
        });

    return adminLoadPromise ?? Promise.resolve();
}

/**
 * توافق المسارات الحالية (منتدى/إعدادات/تقويم…) —
 * يحمّل حزمة مساحة العمل فقط، بلا أضابير ثقيلة.
 */
export function ensureDeferredFeatureStylesLoaded(): Promise<void> {
    return ensureDeferredWorkspaceFeatureStylesLoaded();
}

/** تسخين idle بعد اللوحة — مساحة العمل فقط. */
export function scheduleDeferredFeatureStyles(): void {
    if (workspaceScheduled || workspaceLoaded || typeof window === 'undefined') return;
    workspaceScheduled = true;

    const load = () => {
        void ensureDeferredWorkspaceFeatureStylesLoaded();
    };

    const idleTimeout = isCapacitorNativePlatform() ? 8_000 : 12_000;

    if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(load, { timeout: idleTimeout });
    } else {
        window.setTimeout(load, isCapacitorNativePlatform() ? 3_000 : 2_000);
    }
}

/** نية أضبورة ثقيلة — مساحة عمل + كل أوراق الأضابير. */
export function prefetchDeferredFeatureStyles(): void {
    if (typeof window === 'undefined') return;
    void ensureDeferredWorkspaceFeatureStylesLoaded();
    void ensureDeferredDossierFeatureStylesLoaded();
}

export function prefetchDeferredDossierFeatureStyles(): void {
    if (typeof window === 'undefined') return;
    void ensureDeferredDossierFeatureStylesLoaded();
}

export function prefetchDeferredExecutionDossierStyles(): void {
    if (typeof window === 'undefined') return;
    void ensureDeferredExecutionDossierStylesLoaded();
}

export function prefetchDeferredCriminalDossierStyles(): void {
    if (typeof window === 'undefined') return;
    void ensureDeferredCriminalDossierStylesLoaded();
}

export function prefetchDeferredSmartDossierStyles(): void {
    if (typeof window === 'undefined') return;
    void ensureDeferredSmartDossierStylesLoaded();
}

export function resetDeferredFeatureStylesForTests(): void {
    workspaceScheduled = false;
    workspaceLoaded = false;
    workspaceLoadPromise = null;
    executionDossiersLoaded = false;
    executionDossiersLoadPromise = null;
    criminalDossiersLoaded = false;
    criminalDossiersLoadPromise = null;
    smartDossiersLoaded = false;
    smartDossiersLoadPromise = null;
    adminLoaded = false;
    adminLoadPromise = null;
}
