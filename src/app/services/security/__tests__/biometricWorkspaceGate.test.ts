import { describe, expect, it, beforeEach } from 'vitest';
import {
    clearBiometricWorkspaceUnlock,
    isBiometricWorkspaceUnlocked,
    markBiometricWorkspaceUnlocked,
    resetBiometricWorkspaceGateForTests,
} from '@/app/services/security/biometricWorkspaceGate';

describe('biometricWorkspaceGate', () => {
    beforeEach(() => {
        resetBiometricWorkspaceGateForTests();
    });

    it('يبدأ مقفلاً لهذه العملية', () => {
        expect(isBiometricWorkspaceUnlocked()).toBe(false);
    });

    it('يثبت الفتح ويمسحه', () => {
        markBiometricWorkspaceUnlocked();
        expect(isBiometricWorkspaceUnlocked()).toBe(true);
        clearBiometricWorkspaceUnlock();
        expect(isBiometricWorkspaceUnlocked()).toBe(false);
    });
});
