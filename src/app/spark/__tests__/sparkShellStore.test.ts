import { beforeEach, describe, expect, it } from 'vitest';
import {
    registerSparkShellContext,
    readSparkShellRegistration,
    resetSparkShellStoreForTests,
} from '@/app/spark/shell/sparkShellStore';

describe('sparkShellStore', () => {
    beforeEach(() => {
        resetSparkShellStoreForTests();
    });

    it('يبدأ فارغاً', () => {
        expect(readSparkShellRegistration()).toBeNull();
    });

    it('يسجّل ويمسح سياق الإضبارة', () => {
        registerSparkShellContext({
            surface: 'execution',
            dossierKey: 'execution:ex-1',
            dossierLabel: '55/2026',
            passiveNudge: null,
        });

        expect(readSparkShellRegistration()?.surface).toBe('execution');

        registerSparkShellContext(null);
        expect(readSparkShellRegistration()).toBeNull();
    });
});
