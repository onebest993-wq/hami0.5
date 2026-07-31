import { describe, expect, it } from 'vitest';
import { readHandlerClusterContextValue } from '../executionDashboardCore/handlerClusterContextShared';
import { shouldLoadExecutionEmployeeAssignmentBridge } from '../executionHandlerClusterGate';

describe('readHandlerClusterContextValue — قراءة الأعلام من bag-of-bags', () => {
    it('يقرأ من المستوى الأعلى عند وجود المفتاح مسطّحاً', () => {
        expect(readHandlerClusterContextValue({ someFlag: true }, 'someFlag')).toBe(true);
    });

    it('يقرأ من الحقائب الداخلية (core / subsequentNoticeFlow / claimFinancials)', () => {
        const input = {
            core: { activeDebtorIsEmployee: true },
            subsequentNoticeFlow: { employeeAssignmentTabEnabled: true },
            claimFinancials: { isEvictionExecutionModule: true },
        };
        expect(readHandlerClusterContextValue(input, 'activeDebtorIsEmployee')).toBe(true);
        expect(readHandlerClusterContextValue(input, 'employeeAssignmentTabEnabled')).toBe(true);
        expect(readHandlerClusterContextValue(input, 'isEvictionExecutionModule')).toBe(true);
    });

    it('الحقيبة اللاحقة تتغلّب على السابقة (توافق collectFullHandlerClusterContext)', () => {
        const input = {
            core: { flag: 'from-core' },
            decisionsOrchestrator: { flag: 'from-decisions' },
        };
        expect(readHandlerClusterContextValue(input, 'flag')).toBe('from-decisions');
    });

    it('يعيد undefined عند غياب المفتاح كلياً', () => {
        expect(readHandlerClusterContextValue({ core: {} }, 'missing')).toBeUndefined();
    });
});

describe('shouldLoadExecutionEmployeeAssignmentBridge', () => {
    it('يحمّل الجسر عندما يكون تبويب التكليف مفعّلاً داخل subsequentNoticeFlow', () => {
        // الانحدار السابق: كانت الأعلام تُقرأ من المستوى الأعلى للـ input
        // (bag-of-bags) فتعود undefined دائماً ولا يُحمَّل الجسر أبداً —
        // وكل معالجات التكليف بالحضور تبقى stubs («جاري تجهيز الأدوات» للأبد).
        expect(
            shouldLoadExecutionEmployeeAssignmentBridge(true, {
                core: { activeDebtorIsEmployee: false },
                subsequentNoticeFlow: { employeeAssignmentTabEnabled: true },
            }),
        ).toBe(true);
    });

    it('يحمّل الجسر عند وجود تكليف سارٍ (resolvedEmployeeSummonsAssignment)', () => {
        expect(
            shouldLoadExecutionEmployeeAssignmentBridge(true, {
                subsequentNoticeFlow: {
                    resolvedEmployeeSummonsAssignment: { phase: 'active' },
                },
            }),
        ).toBe(true);
    });

    it('لا يحمّل الجسر دون سبب أو عندما يكون العنقود القسري غير محمّل', () => {
        const input = {
            core: { activeDebtorIsEmployee: false },
            subsequentNoticeFlow: { employeeAssignmentTabEnabled: false },
        };
        expect(shouldLoadExecutionEmployeeAssignmentBridge(true, input)).toBe(false);
        expect(
            shouldLoadExecutionEmployeeAssignmentBridge(false, {
                core: { activeDebtorIsEmployee: true },
            }),
        ).toBe(false);
    });
});
