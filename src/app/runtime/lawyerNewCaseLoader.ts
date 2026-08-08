import type { JurisdictionId } from '@/app/components/lawyer/LawyerNewCase/constants';
import type { IncidentalSpawnContextEnriched } from '@/app/domain/lawsuit/incidentalSpawnPrefill';

type LawyerNewCaseModule = typeof import('@/app/components/lawyer/LawyerNewCase');

export type LawyerNewCaseComponent = LawyerNewCaseModule['LawyerNewCase'];

const LOAD_TIMEOUT_MS = 45_000;

let lawyerNewCasePromise: Promise<LawyerNewCaseModule> | null = null;
let cachedLawyerNewCase: LawyerNewCaseComponent | null = null;

const lawyerNewCaseListeners = new Set<() => void>();

function notifyLawyerNewCaseListeners(): void {
    lawyerNewCaseListeners.forEach((listener) => listener());
}

export function subscribeLawyerNewCaseCache(listener: () => void): () => void {
    lawyerNewCaseListeners.add(listener);
    return () => {
        lawyerNewCaseListeners.delete(listener);
    };
}

export function getCachedLawyerNewCase(): LawyerNewCaseComponent | null {
    return cachedLawyerNewCase;
}

export type LawyerNewCaseJurisdictionId = JurisdictionId;

let pendingJurisdiction: JurisdictionId | null = null;

export function setPendingLawyerNewCaseJurisdiction(id: JurisdictionId | null): void {
    pendingJurisdiction = id;
    notifyLawyerNewCaseListeners();
}

export function getPendingLawyerNewCaseJurisdiction(): JurisdictionId | null {
    return pendingJurisdiction;
}

export function consumePendingLawyerNewCaseJurisdiction(): JurisdictionId | null {
    const value = pendingJurisdiction;
    pendingJurisdiction = null;
    return value;
}

let pendingIncidentalSpawn: IncidentalSpawnContextEnriched | null = null;

/** يحفظ سياق الدعوى الحادثة قبل فتح نموذج الإضبارة (يتجاوز سباق تحميل الـ chunk). */
export function setPendingIncidentalSpawnContext(
    ctx: IncidentalSpawnContextEnriched | null,
): void {
    pendingIncidentalSpawn = ctx;
    notifyLawyerNewCaseListeners();
}

export function getPendingIncidentalSpawnContext(): IncidentalSpawnContextEnriched | null {
    return pendingIncidentalSpawn;
}

export function clearPendingIncidentalSpawnContext(): void {
    if (!pendingIncidentalSpawn) return;
    pendingIncidentalSpawn = null;
    notifyLawyerNewCaseListeners();
}

export function resetLawyerNewCaseModuleCacheForTests(): void {
    lawyerNewCasePromise = null;
    cachedLawyerNewCase = null;
    pendingJurisdiction = null;
    pendingIncidentalSpawn = null;
    notifyLawyerNewCaseListeners();
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

function ensureLawyerNewCasePromise(): Promise<LawyerNewCaseModule> {
    if (!lawyerNewCasePromise) {
        lawyerNewCasePromise = withLoadTimeout(
            import('@/app/components/lawyer/LawyerNewCase'),
            'نموذج إنشاء الدعوى',
        )
            .then((mod) => {
                cachedLawyerNewCase = mod.LawyerNewCase;
                notifyLawyerNewCaseListeners();
                return mod;
            })
            .catch((error) => {
                lawyerNewCasePromise = null;
                throw error;
            });
    }
    return lawyerNewCasePromise;
}

export function loadLawyerNewCaseModule(): Promise<LawyerNewCaseModule> {
    return ensureLawyerNewCasePromise();
}

export function prefetchLawyerNewCaseModule(): void {
    if (typeof window === 'undefined') return;
    void loadLawyerNewCaseModule().catch(() => undefined);
}
