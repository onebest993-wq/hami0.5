import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    primeCriminalModalsHostMount,
    resetCriminalModalsHostPrimeForTests,
    subscribeCriminalModalsHostPrime,
} from '@/app/components/lawyer/criminal-system/criminalModalsHostPrime';

describe('criminalModalsHostPrime', () => {
    beforeEach(() => {
        resetCriminalModalsHostPrimeForTests();
        vi.restoreAllMocks();
    });

    it('notifies subscribers immediately when already primed', () => {
        const late = vi.fn();
        primeCriminalModalsHostMount();
        const unsub = subscribeCriminalModalsHostPrime(late);
        expect(late).toHaveBeenCalledTimes(1);
        unsub();
    });

    it('notifies live subscribers on prime', () => {
        const live = vi.fn();
        const unsub = subscribeCriminalModalsHostPrime(live);
        expect(live).not.toHaveBeenCalled();
        primeCriminalModalsHostMount();
        expect(live).toHaveBeenCalledTimes(1);
        unsub();
    });
});
