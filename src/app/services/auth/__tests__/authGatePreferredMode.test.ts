import { afterEach, describe, expect, it } from 'vitest';
import {
    consumePreferredAuthGateMode,
    peekPreferredAuthGateMode,
    setPreferredAuthGateMode,
} from '@/app/services/auth/authGatePreferredMode';

describe('authGatePreferredMode', () => {
    afterEach(() => {
        sessionStorage.clear();
    });

    it('keeps login mode across peek so a remount does not dump the form', () => {
        setPreferredAuthGateMode('login');
        expect(peekPreferredAuthGateMode()).toBe('login');
        expect(peekPreferredAuthGateMode()).toBe('login');
        expect(consumePreferredAuthGateMode()).toBe('login');
        expect(peekPreferredAuthGateMode()).toBeNull();
    });
});
