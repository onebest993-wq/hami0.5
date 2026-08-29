import { describe, expect, it } from 'vitest';
import {
    isCurrentBffAuthSyncGeneration,
    nextBffAuthSyncGeneration,
} from '@/app/context/bffAuthSyncGeneration';

describe('bffAuthSyncGeneration', () => {
    it('يُبطِل الجيل السابق بعد دخول جديد', () => {
        const boot = nextBffAuthSyncGeneration();
        expect(isCurrentBffAuthSyncGeneration(boot)).toBe(true);
        const login = nextBffAuthSyncGeneration();
        expect(isCurrentBffAuthSyncGeneration(boot)).toBe(false);
        expect(isCurrentBffAuthSyncGeneration(login)).toBe(true);
    });
});
