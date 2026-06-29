import { describe, it, expect } from 'vitest';
import { migrateCriminalPersistState } from '@/app/components/lawyer/criminal-system/criminalStorePersistMigrate';

describe('migrateCriminalPersistState', () => {
    it('يُرجع null/undefined كما هي', () => {
        expect(migrateCriminalPersistState(null)).toBe(null);
        expect(migrateCriminalPersistState(undefined)).toBe(undefined);
    });

    it('يُرجع primitives دون تغيير', () => {
        expect(migrateCriminalPersistState('x')).toBe('x');
        expect(migrateCriminalPersistState(42)).toBe(42);
    });

    it('يُ normalizes draft فارغ مع casesById فارغ', () => {
        const input = {
            draft: { basics: { stage: '' }, complainants: [], defendants: [] },
            casesById: {},
            pendingSeveranceContext: null,
        };
        const out = migrateCriminalPersistState(input) as typeof input;
        expect(out).toBeTruthy();
        expect(out.casesById).toEqual({});
    });
});
