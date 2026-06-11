import { describe, expect, it } from 'vitest';
import {
    resolveSettlementDuePhase,
    shouldShowSettlementDueActions,
} from '../utils';

describe('settlement due phase', () => {
    it('waiting before due date', () => {
        expect(resolveSettlementDuePhase('2026-06-10', '2026-06-04')).toBe('waiting');
        expect(shouldShowSettlementDueActions('2026-06-10', '2026-06-04')).toBe(false);
    });

    it('due on due date shows action buttons', () => {
        expect(resolveSettlementDuePhase('2026-06-04', '2026-06-04')).toBe('due');
        expect(shouldShowSettlementDueActions('2026-06-04', '2026-06-04')).toBe(true);
    });

    it('overdue after due date shows action buttons', () => {
        expect(resolveSettlementDuePhase('2026-05-01', '2026-06-04')).toBe('overdue');
        expect(shouldShowSettlementDueActions('2026-05-01', '2026-06-04')).toBe(true);
    });
});
