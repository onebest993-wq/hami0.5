import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { legalTaskStub } from '@/app/services/tasks/__tests__/legalTaskStub';
import {
    publishQuantumTasksMetrics,
    getQuantumPendingSnapshot,
    resetQuantumTasksMetricsMemory,
} from '@/app/utils/quantumTasksMetrics';
import { QUANTUM_TASKS_STORAGE_KEY, serializeQuantumTasks } from '@/app/utils/quantumTasksStorageDeserialize';

const mocks = vi.hoisted(() => ({
    readReady: vi.fn(async () => null as string | null),
}));

vi.mock('@/app/services/storage/readSecureOrDrainLegacySync', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/services/storage/readSecureOrDrainLegacySync')>();
    return {
        ...actual,
        readSecurePayloadWhenReady: mocks.readReady,
    };
});

import {
    FIELD_TASKS_CURTAIN_PEEK_READY_EVENT,
    publishFieldTasksCurtainPeekFromDiskSync,
    resetFieldTasksCurtainPeekForTests,
    scheduleFieldTasksCurtainPeekFromSecureStore,
} from '@/app/utils/quantumTasksCurtainPeek';

describe('quantumTasksCurtainPeek', () => {
    beforeEach(() => {
        resetQuantumTasksMetricsMemory();
        resetFieldTasksCurtainPeekForTests();
        mocks.readReady.mockReset();
        mocks.readReady.mockResolvedValue(null);
        try {
            localStorage.removeItem(QUANTUM_TASKS_STORAGE_KEY);
        } catch {
            /* ignore */
        }
    });

    afterEach(() => {
        resetQuantumTasksMetricsMemory();
        resetFieldTasksCurtainPeekForTests();
        try {
            localStorage.removeItem(QUANTUM_TASKS_STORAGE_KEY);
        } catch {
            /* ignore */
        }
    });

    it('ينشر لقطة الستارة من leftover عند اللمسة', () => {
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        const pinned = legalTaskStub({
            id: 'peek-disk',
            title: 'من القرص',
            pinnedToFieldCurtain: true,
            parsedDate: today,
        });
        localStorage.setItem(QUANTUM_TASKS_STORAGE_KEY, JSON.stringify(serializeQuantumTasks([pinned])));

        publishFieldTasksCurtainPeekFromDiskSync();
        expect(getQuantumPendingSnapshot().some((t) => t.id === 'peek-disk')).toBe(true);
    });

    it('لا يستبدل لقطة موجودة', () => {
        const existing = legalTaskStub({ id: 'live', title: 'حية', pinnedToFieldCurtain: true });
        publishQuantumTasksMetrics([existing], [existing]);
        localStorage.setItem(
            QUANTUM_TASKS_STORAGE_KEY,
            JSON.stringify(serializeQuantumTasks([legalTaskStub({ id: 'other', title: 'أخرى' })])),
        );
        publishFieldTasksCurtainPeekFromDiskSync();
        expect(getQuantumPendingSnapshot().map((t) => t.id)).toEqual(['live']);
    });

    it('يفك SecureStore غير المتزامن عند اللمسة ويملأ اللقطة', async () => {
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        const pinned = legalTaskStub({
            id: 'peek-secure',
            title: 'من المخزن',
            pinnedToFieldCurtain: true,
            parsedDate: today,
        });
        mocks.readReady.mockResolvedValue(JSON.stringify(serializeQuantumTasks([pinned])));
        const ready = new Promise<void>((resolve) => {
            window.addEventListener(FIELD_TASKS_CURTAIN_PEEK_READY_EVENT, () => resolve(), { once: true });
        });
        scheduleFieldTasksCurtainPeekFromSecureStore();
        await ready;
        expect(getQuantumPendingSnapshot().some((t) => t.id === 'peek-secure')).toBe(true);
    });
});

describe('quantumTasksCurtainPeek', () => {
    beforeEach(() => {
        resetQuantumTasksMetricsMemory();
        try {
            localStorage.removeItem(QUANTUM_TASKS_STORAGE_KEY);
        } catch {
            /* ignore */
        }
    });

    afterEach(() => {
        resetQuantumTasksMetricsMemory();
        try {
            localStorage.removeItem(QUANTUM_TASKS_STORAGE_KEY);
        } catch {
            /* ignore */
        }
    });

    it('ينشر لقطة الستارة من leftover عند اللمسة', () => {
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        const pinned = legalTaskStub({
            id: 'peek-disk',
            title: 'من القرص',
            pinnedToFieldCurtain: true,
            parsedDate: today,
        });
        localStorage.setItem(QUANTUM_TASKS_STORAGE_KEY, JSON.stringify(serializeQuantumTasks([pinned])));

        publishFieldTasksCurtainPeekFromDiskSync();
        expect(getQuantumPendingSnapshot().some((t) => t.id === 'peek-disk')).toBe(true);
    });

    it('لا يستبدل لقطة موجودة', () => {
        const existing = legalTaskStub({ id: 'live', title: 'حية', pinnedToFieldCurtain: true });
        publishQuantumTasksMetrics([existing], [existing]);
        localStorage.setItem(
            QUANTUM_TASKS_STORAGE_KEY,
            JSON.stringify(serializeQuantumTasks([legalTaskStub({ id: 'other', title: 'أخرى' })])),
        );
        publishFieldTasksCurtainPeekFromDiskSync();
        expect(getQuantumPendingSnapshot().map((t) => t.id)).toEqual(['live']);
    });
});
