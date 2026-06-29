import { beforeEach, describe, expect, it, vi } from 'vitest';

const warmGlobalSearchPipeline = vi.fn();
const warmGlobalSearchExtras = vi.fn();

vi.mock('@/app/services/globalSearchWarm', () => ({
    warmGlobalSearchPipeline,
}));

vi.mock('@/app/services/globalSearchLoad', () => ({
    warmGlobalSearchExtras,
}));

vi.mock('@/app/runtime/globalSearchLoader', () => ({
    prefetchGlobalSearchOverlay: vi.fn(),
    prefetchGlobalSearchOverlayChunk: vi.fn(),
    prefetchGlobalSearchSearchEngine: vi.fn(),
}));

import {
    clearGlobalSearchWarmSnapshot,
    registerGlobalSearchWarmSnapshot,
    warmGlobalSearchOnHover,
    warmGlobalSearchOnOpen,
} from '@/app/hooks/lawyerDashboard/globalSearchIntentWarm';
import {
    prefetchGlobalSearchOverlay,
    prefetchGlobalSearchOverlayChunk,
    prefetchGlobalSearchSearchEngine,
} from '@/app/runtime/globalSearchLoader';

const snapshot = {
    userId: 'guest-lawyer-1',
    files: [],
    executionFiles: [],
    globalNotes: [],
    notifications: [],
    criminalCases: [],
    cacheGeneration: 1,
};

describe('globalSearchIntentWarm', () => {
    beforeEach(() => {
        clearGlobalSearchWarmSnapshot();
        warmGlobalSearchPipeline.mockClear();
        warmGlobalSearchExtras.mockClear();
        vi.mocked(prefetchGlobalSearchOverlay).mockClear();
        vi.mocked(prefetchGlobalSearchOverlayChunk).mockClear();
        vi.mocked(prefetchGlobalSearchSearchEngine).mockClear();
    });

    it('warmGlobalSearchOnOpen يبدأ فهرس idle في الخلفية بعد paint', async () => {
        registerGlobalSearchWarmSnapshot(snapshot);
        warmGlobalSearchOnOpen();
        expect(prefetchGlobalSearchOverlayChunk).toHaveBeenCalled();
        expect(warmGlobalSearchPipeline).not.toHaveBeenCalled();
        await Promise.resolve();
        expect(prefetchGlobalSearchSearchEngine).toHaveBeenCalled();
        await vi.waitFor(() => {
            expect(warmGlobalSearchExtras).toHaveBeenCalledWith(snapshot.userId);
            expect(warmGlobalSearchPipeline).toHaveBeenCalledWith(snapshot, false);
        });
    });

    it('warmGlobalSearchOnOpen لا يشغّل extras ولا pipeline عند document.hidden', async () => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        registerGlobalSearchWarmSnapshot(snapshot);
        warmGlobalSearchOnOpen();
        expect(prefetchGlobalSearchOverlayChunk).toHaveBeenCalled();
        expect(warmGlobalSearchExtras).not.toHaveBeenCalled();
        await Promise.resolve();
        expect(warmGlobalSearchPipeline).not.toHaveBeenCalled();
        Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    });

    it('warmGlobalSearchOnOpen يعمل بلا snapshot', async () => {
        warmGlobalSearchOnOpen();
        expect(prefetchGlobalSearchOverlayChunk).toHaveBeenCalled();
        expect(warmGlobalSearchPipeline).not.toHaveBeenCalled();
        await Promise.resolve();
        expect(prefetchGlobalSearchSearchEngine).toHaveBeenCalled();
    });

    it('warmGlobalSearchOnHover prefetches overlay, warms extras, and starts core pipeline', async () => {
        registerGlobalSearchWarmSnapshot(snapshot);
        warmGlobalSearchOnHover();
        expect(prefetchGlobalSearchOverlay).toHaveBeenCalled();
        await vi.waitFor(() => {
            expect(warmGlobalSearchExtras).toHaveBeenCalledWith(snapshot.userId);
            expect(warmGlobalSearchPipeline).toHaveBeenCalledWith(snapshot, false);
        });
    });
});
