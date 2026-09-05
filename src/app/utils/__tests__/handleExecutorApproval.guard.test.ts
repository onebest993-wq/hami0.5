import { describe, expect, it, vi } from 'vitest';
import { handleExecutorApproval } from '../executorApprovalWorkflow';

describe('handleExecutorApproval', () => {
    it('لا ينهار عند غياب actions (مثل openPoliceAssistanceModal)', () => {
        expect(() =>
            handleExecutorApproval(
                'Police Assistance Request',
                'ex-1',
                'dec-1',
                undefined,
                { requestTitle: 'مفاتحة الشرطة' },
            ),
        ).not.toThrow();
    });

    it('يستدعي openPoliceAssistanceModal عند توفره', () => {
        const openPoliceAssistanceModal = vi.fn();
        handleExecutorApproval(
            'Police Assistance Request',
            'ex-1',
            'dec-1',
            {
                openPoliceAssistanceModal,
                openScheduledDateModal: vi.fn(),
                showToast: vi.fn(),
                appendDossierTask: vi.fn(),
                getFieldVisitDeadlineIso: () => null,
                promptOpenExecutionReport: vi.fn(),
                pushCalendarAppointment: vi.fn(),
                patchDecision: vi.fn(),
                openBreakInventoryFurnitureModal: vi.fn(),
                openJudicialCustodianModal: vi.fn(),
                appendCaseNote: vi.fn(),
                persistJudicialCustodianDetails: vi.fn(),
            },
            { requestTitle: 'مفاتحة الشرطة' },
        );
        expect(openPoliceAssistanceModal).toHaveBeenCalledWith({
            decisionId: 'dec-1',
            requestTitle: 'مفاتحة الشرطة',
        });
    });
});
