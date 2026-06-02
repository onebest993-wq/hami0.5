import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsRuntime';

type PrefetchPriority = 'critical' | 'high' | 'low';

type PrefetchJob = {
    id: string;
    priority: PrefetchPriority;
    loader: () => Promise<unknown>;
};

const scheduled = new Set<string>();
const inflight = new Set<string>();
let waveTimer: number | undefined;

function canPrefetch(): boolean {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return false;
    if (typeof navigator === 'undefined') return true;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } })
        .connection;
    if (!conn) return true;
    if (conn.saveData) return false;
    const effective = String(conn.effectiveType ?? '');
    return effective !== 'slow-2g' && effective !== '2g';
}

function settingsAllowPrefetch(): boolean {
    try {
        return getLawyerSettingsSnapshot().performance.prefetchScreens !== false;
    } catch {
        return true;
    }
}

function runJob(job: PrefetchJob): void {
    if (inflight.has(job.id)) return;
    inflight.add(job.id);
    void job.loader()
        .catch(() => {
            /* prefetch اختياري */
        })
        .finally(() => {
            inflight.delete(job.id);
        });
}

function flushQueue(queue: PrefetchJob[]): void {
    if (!canPrefetch() || !settingsAllowPrefetch()) return;

    const order: PrefetchPriority[] = ['critical', 'high', 'low'];
    for (const priority of order) {
        for (const job of queue) {
            if (job.priority !== priority) continue;
            runJob(job);
        }
    }
}

function scheduleWave(queue: PrefetchJob[], delayMs: number): void {
    if (waveTimer !== undefined) window.clearTimeout(waveTimer);
    waveTimer = window.setTimeout(() => flushQueue(queue), delayMs);
}

/** منسّق وحيد — يمنع تكرار استيراد نفس الـ chunk من عدة مواقع. */
export const PrefetchScheduler = {
    enqueue(job: PrefetchJob): void {
        if (!canPrefetch() || !settingsAllowPrefetch()) return;
        if (scheduled.has(job.id)) return;
        scheduled.add(job.id);
        runJob(job);
    },

    enqueueWave(jobs: PrefetchJob[], options?: { delayMs?: number }): void {
        const pending = jobs.filter((j) => !scheduled.has(j.id));
        if (!pending.length) return;
        for (const job of pending) scheduled.add(job.id);

        const delayMs = options?.delayMs ?? (import.meta.env.DEV ? 2_500 : 800);
        if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(() => scheduleWave(pending, 0), { timeout: delayMs + 500 });
        } else {
            scheduleWave(pending, delayMs);
        }
    },

    planAuthenticatedEntry(): void {
        this.enqueue({
            id: 'lawyer-dashboard',
            priority: 'critical',
            loader: () => import('@/app/components/lawyer/LawyerDashboard'),
        });
    },

    planLawyerHomeWave(): void {
        this.enqueueWave(
            [
                {
                    id: 'unified-command-hub',
                    priority: 'high',
                    loader: () => import('@/app/components/lawyer/dashboard/UnifiedCommandHub'),
                },
                {
                    id: 'lawyer-home-hub',
                    priority: 'high',
                    loader: () => import('@/app/components/lawyer/LawyerHomeHubCard'),
                },
                {
                    id: 'legal-command-dock',
                    priority: 'high',
                    loader: () => import('@/app/components/lawyer/LegalCommandCenterDock'),
                },
                {
                    id: 'smart-file-modal',
                    priority: 'high',
                    loader: () =>
                        Promise.all([
                            import('@/app/components/lawyer/SmartFileModal'),
                            import('@/app/components/lawyer/smart-modal/SmartFileModalContent'),
                        ]),
                },
                {
                    id: 'criminal-dashboard',
                    priority: 'high',
                    loader: () =>
                        Promise.all([
                            import('@/app/components/lawyer/criminal-system/CriminalDashboard'),
                            import('@/app/components/lawyer/criminal-system/criminalStore'),
                        ]),
                },
            ],
            { delayMs: import.meta.env.DEV ? 1_200 : 600 },
        );
    },

    planLawyerSecondaryWave(): void {
        this.enqueueWave(
            [
                {
                    id: 'execution-creation',
                    priority: 'low',
                    loader: () => import('@/app/components/lawyer/ExecutionCreationView'),
                },
                {
                    id: 'execution-dashboard',
                    priority: 'low',
                    loader: () => import('@/app/components/lawyer/ExecutionDashboard'),
                },
            ],
            { delayMs: import.meta.env.DEV ? 4_000 : 8_000 },
        );
    },

    reset(): void {
        scheduled.clear();
        inflight.clear();
        if (waveTimer !== undefined) {
            window.clearTimeout(waveTimer);
            waveTimer = undefined;
        }
    },
};
