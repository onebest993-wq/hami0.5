import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useSmartFileStageActions } from '../useSmartFileStageActions';
import type { CaseStage } from '../../../LawyerShared';

describe('useSmartFileStageActions', () => {
    it('updates the currently viewed stage when saving case info from the edit modal', () => {
        const stages: CaseStage[] = [
            { id: 's1', stageName: 'البداءة', court: 'محكمة البداءة', timeline: [] } as CaseStage,
            { id: 's2', stageName: 'الاستئناف', court: '', timeline: [] } as CaseStage,
        ];
        const setStages = vi.fn();
        const setParentData = vi.fn();
        const saveToCloud = vi.fn();

        const { result } = renderHook(() =>
            useSmartFileStageActions({
                stages,
                setStages,
                activeStageIndex: 0,
                viewingStageIndex: 1,
                setActiveStageIndex: vi.fn(),
                setViewingStageIndex: vi.fn(),
                currentStage: stages[0],
                displayStage: stages[1],
                parentData: { docType: 'دعوى' } as never,
                setParentData,
                saveToCloud,
                modalSetters: {
                    setShowApptModal: vi.fn(),
                    setShowNoteModal: vi.fn(),
                    setShowDocModal: vi.fn(),
                    setShowIncidentalModal: vi.fn(),
                    setShowInterlocutoryModal: vi.fn(),
                    setShowFastTrackModal: vi.fn(),
                    setShowAttachmentModal: vi.fn(),
                },
                setIsEditingStageName: vi.fn(),
                tempStageName: '',
            }),
        );

        act(() => {
            result.current.handleUpdateCaseInfo({
                court: 'محكمة الاستئناف',
                judge: 'القاضي الجديد',
                caseNo: '123/استئناف/2026',
            });
        });

        expect(setStages).toHaveBeenCalledTimes(1);
        const updatedStages = setStages.mock.calls[0]?.[0] as CaseStage[];
        expect(updatedStages[0]?.court).toBe('محكمة البداءة');
        expect(updatedStages[1]?.court).toBe('محكمة الاستئناف');
        expect(updatedStages[1]?.judge).toBe('القاضي الجديد');
        expect(updatedStages[1]?.caseNo).toBe('123/استئناف/2026');
        expect(saveToCloud).toHaveBeenCalledTimes(1);
    });
});
