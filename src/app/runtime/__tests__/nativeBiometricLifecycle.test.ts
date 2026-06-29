import { beforeEach, describe, expect, it, vi } from 'vitest';

const { checkBiometry, addResumeListener, remove } = vi.hoisted(() => ({
    checkBiometry: vi.fn(async () => ({ isAvailable: true })),
    addResumeListener: vi.fn(async (listener: (info: { isAvailable: boolean }) => void) => {
        (globalThis as { __bioResume?: typeof listener }).__bioResume = listener;
        return { remove: vi.fn(async () => undefined) };
    }),
    remove: vi.fn(async () => undefined),
}));

vi.mock('@/app/runtime/nativePlatform', () => ({
    isCapacitorNativePlatform: () => true,
}));

vi.mock('@/app/runtime/optionalCapacitorPluginLoad', () => ({
    loadOptionalCapacitorPlugin: vi.fn(async () => ({
        BiometricAuth: { checkBiometry, addResumeListener },
    })),
}));

import { wireNativeBiometricAvailabilityListener } from '@/app/runtime/nativeBiometricLifecycle';

describe('nativeBiometricLifecycle', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        delete (globalThis as { __bioResume?: unknown }).__bioResume;
    });

    it('يُبلّغ بالتوفر الأولي وعند resume', async () => {
        const changes: boolean[] = [];
        const dispose = await wireNativeBiometricAvailabilityListener((available) => {
            changes.push(available);
        });

        expect(checkBiometry).toHaveBeenCalled();
        expect(changes).toEqual([true]);

        const resume = (globalThis as { __bioResume?: (info: { isAvailable: boolean }) => void }).__bioResume;
        resume?.({ isAvailable: false });
        expect(changes).toEqual([true, false]);

        dispose();
    });
});
