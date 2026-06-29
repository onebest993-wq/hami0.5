/// <reference lib="webworker" />
import { buildGlobalSearchIndex } from '@/app/services/search/globalSearchIndexPure';
import type { BuildGlobalSearchIndexInput, GlobalSearchEntry } from '@/app/services/globalSearchIndex';

type WorkerRequest = {
    id: number;
    input: BuildGlobalSearchIndexInput;
};

type WorkerResponse = {
    id: number;
    index?: GlobalSearchEntry[];
    error?: string;
};

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
    const { id, input } = event.data;
    try {
        const index = buildGlobalSearchIndex(input);
        const response: WorkerResponse = { id, index };
        self.postMessage(response);
    } catch (error) {
        const response: WorkerResponse = { id, error: error instanceof Error ? error.message : String(error) };
        self.postMessage(response);
    }
};

export {};
