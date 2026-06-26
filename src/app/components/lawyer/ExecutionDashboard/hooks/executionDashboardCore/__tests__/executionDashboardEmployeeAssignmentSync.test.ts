import { describe, expect, it } from 'vitest';
import {
    employeePhaseUnlocksPersonalCoercive,
    investigationMergeToastMessage,
    shouldShowEmployeeAssignmentCoerciveBlock,
} from '../executionDashboardEmployeeAssignmentSync';

describe('executionDashboardEmployeeAssignmentSync', () => {
    it('unlocks personal coercive for post-absence phases', () => {
        expect(employeePhaseUnlocksPersonalCoercive(true, 'absent_declared')).toBe(true);
        expect(employeePhaseUnlocksPersonalCoercive(true, 'investigation_pending')).toBe(true);
        expect(employeePhaseUnlocksPersonalCoercive(true, 'warrant_ui')).toBe(true);
        expect(employeePhaseUnlocksPersonalCoercive(true, 'active')).toBe(false);
        expect(employeePhaseUnlocksPersonalCoercive(false, 'absent_declared')).toBe(false);
    });

    it('shows coercive block when employee and phase qualifies', () => {
        expect(shouldShowEmployeeAssignmentCoerciveBlock(true, 'warrant_ui')).toBe(true);
        expect(shouldShowEmployeeAssignmentCoerciveBlock(true, 'active')).toBe(false);
    });

    it('formats investigation merge toast messages', () => {
        expect(investigationMergeToastMessage(1, 0).type).toBe('success');
        expect(investigationMergeToastMessage(0, 1).options?.decisionsLink).toBe(true);
        expect(investigationMergeToastMessage(2, 1).message).toContain('2 موافقة');
    });
});
