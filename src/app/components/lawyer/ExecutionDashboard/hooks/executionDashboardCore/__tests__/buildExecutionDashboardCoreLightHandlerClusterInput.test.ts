import { describe, expect, it } from 'vitest';
import { buildExecutionDashboardCoreLightHandlerClusterInput } from '../buildExecutionDashboardCoreLightHandlerClusterInput';

describe('buildExecutionDashboardCoreLightHandlerClusterInput', () => {
    it('يجمع حقول workspace و boot و pipelines لـ light cluster', () => {
        const persistExecutionMerge = () => true;
        const moveCaseTaskToTrash = () => undefined;
        const closeUnifiedSeizureLog = () => undefined;
        const openFollowupModalPersisted = () => undefined;
        const setShowPaymentModal = () => undefined;

        const input = buildExecutionDashboardCoreLightHandlerClusterInput({
            boot: {
                executionData: { id: 'e1' } as never,
                executionDataRef: { current: { id: 'e1' } },
                parentDossierId: 'parent-1',
                currentFileId: 'file-1',
                setShowPaymentModal,
            },
            file: { id: 'file-1' } as never,
            executionId: 'exec-1',
            workspacePipeline: {
                noteTitle: 't',
                pushTimelineEventRef: { current: null },
                persistExecutionMerge,
            },
            persistHandlerPipeline: { persistExecutionMerge, moveCaseTaskToTrash },
            graceMasterPipeline: { remaining: 100, totalWithExecutionFee: 500 },
            followupDebtor: { closeUnifiedSeizureLog, openFollowupModalPersisted },
            claimFinancialLedger: { totalOwed: 400 },
        });

        expect(input.executionId).toBe('exec-1');
        expect(input.currentFileId).toBe('file-1');
        expect(input.parentDossierId).toBe('parent-1');
        expect(input.noteTitle).toBe('t');
        expect(input.remaining).toBe(100);
        expect(input.totalOwed).toBe(400);
        expect(input.totalWithExecutionFee).toBe(500);
        expect(input.persistExecutionMerge).toBe(persistExecutionMerge);
        expect(input.moveCaseTaskToTrash).toBe(moveCaseTaskToTrash);
        expect(input.closeUnifiedSeizureLog).toBe(closeUnifiedSeizureLog);
        expect(input.openFollowupModalPersisted).toBe(openFollowupModalPersisted);
        expect(input.setShowPaymentModal).toBe(setShowPaymentModal);
    });
});
