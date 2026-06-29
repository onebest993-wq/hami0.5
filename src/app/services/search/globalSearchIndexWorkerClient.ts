import type { BuildGlobalSearchIndexInput, GlobalSearchEntry } from '@/app/services/globalSearchIndex';
import { buildGlobalSearchIndex } from '@/app/services/search/globalSearchIndexPure';

type WorkerRequest = {
    id: number;
    input: BuildGlobalSearchIndexInput;
};

type WorkerResponse = {
    id: number;
    index?: GlobalSearchEntry[];
    error?: string;
};

let worker: Worker | null = null;
let workerFailed = false;
let requestSeq = 0;
let activeBuildGeneration = 0;
const pending = new Map<number, { generation: number; resolve: (v: GlobalSearchEntry[]) => void; reject: (e: Error) => void }>();

function settleWorkerMessage(event: MessageEvent<WorkerResponse>): void {
    const { id, index, error } = event.data;
    const job = pending.get(id);
    if (!job) return;
    pending.delete(id);
    if (job.generation !== activeBuildGeneration) return;
    if (error) {
        job.reject(new Error(error));
        return;
    }
    job.resolve(index ?? []);
}

function ensureWorker(): Worker | null {
    if (workerFailed || typeof Worker === 'undefined') return null;
    if (worker) return worker;
    try {
        worker = new Worker(new URL('@/app/workers/globalSearchIndex.worker.ts', import.meta.url), {
            type: 'module',
        });
        worker.onmessage = settleWorkerMessage;
        worker.onerror = () => {
            workerFailed = true;
            worker?.terminate();
            worker = null;
            for (const [, job] of pending) {
                job.reject(new Error('global-search-worker-error'));
            }
            pending.clear();
        };
        return worker;
    } catch {
        workerFailed = true;
        return null;
    }
}

export function isGlobalSearchWorkerAvailable(): boolean {
    return ensureWorker() !== null;
}

export function prefetchGlobalSearchIndexWorker(): void {
    ensureWorker();
}

export function buildGlobalSearchIndexOffThread(
    input: BuildGlobalSearchIndexInput,
): Promise<GlobalSearchEntry[]> {
    const instance = ensureWorker();
    if (!instance) {
        return Promise.resolve(buildGlobalSearchIndex(input));
    }

    const id = ++requestSeq;
    const generation = ++activeBuildGeneration;
    return new Promise<GlobalSearchEntry[]>((resolve, reject) => {
        pending.set(id, { generation, resolve, reject });
        const payload: WorkerRequest = { id, input };
        instance.postMessage(payload);
    });
}

export function terminateGlobalSearchIndexWorker(): void {
    worker?.terminate();
    worker = null;
    workerFailed = false;
    pending.clear();
}
