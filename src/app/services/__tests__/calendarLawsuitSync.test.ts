import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSmartFileProceduralActions } from '@/app/components/lawyer/smart-modal/hooks/useSmartFileProceduralActions';
import { CalendarDB } from '@/app/services/lawyer-cloud';
import { flushPendingCalendarSyncs } from '@/app/services/calendarBridge';
import type { CaseStage } from '@/app/components/lawyer/LawyerShared';

describe('lawsuit appointment → calendar', () => {
    beforeEach(() => {
        vi.spyOn(CalendarDB, 'getEvents').mockResolvedValue([]);
        vi.spyOn(CalendarDB, 'saveEventsBatch').mockResolvedValue(undefined as never);
    });

    it('syncs new appointment without throwing (lawsuitCalendarContext defined)', async () => {
        const stages: CaseStage[] = [
            {
                id: 's1',
                name: 'أولى',
                status: 'active',
                timeline: [],
                tasks: [],
            },
        ];
        const setStages = vi.fn();
        const saveToCloud = vi.fn();

        const { result } = renderHook(() =>
            useSmartFileProceduralActions({
                stages,
                setStages,
                activeStageIndex: 0,
                viewingStageIndex: 0,
                currentStage: stages[0],
                parentData: {
                    id: 99,
                    caseNo: '2026/ب/1',
                    court: 'بغداد',
                    parties: [{ name: 'أحمد', role: 'مدعي' }],
                } as never,
                setParentData: vi.fn(),
                saveToCloud,
                setStatus: vi.fn(),
                setIsPaused: vi.fn(),
                setPauseReason: vi.fn(),
                setLinkedCaseNo: vi.fn(),
                setIsInterrupted: vi.fn(),
                setInterruptionData: vi.fn(),
                setEditingTask: vi.fn(),
                setEditingIncidental: vi.fn(),
                setEditingFastTrack: vi.fn(),
                setEditingAttachment: vi.fn(),
                setEditingEvent: vi.fn(),
                setShowFastTrackModal: vi.fn(),
                setShowAttachmentModal: vi.fn(),
                setShowJudgeRecusalModal: vi.fn(),
                setShowTransferJurisdictionModal: vi.fn(),
                setShowCaseConsolidationModal: vi.fn(),
                setShowMaterialErrorModal: vi.fn(),
                setShowPauseModal: vi.fn(),
                setShowInterruptionModal: vi.fn(),
                setShowResumeInterruptionModal: vi.fn(),
                setShowExtraordinaryAppealModal: vi.fn(),
                setShowProvisionalOrderModal: vi.fn(),
                setShowInterlocutoryModal: vi.fn(),
                isPaused: false,
                pauseReason: '',
                isInterrupted: false,
                interruptionData: null,
                status: 'نشطة',
                calendarUserId: 'lawyer-1',
            }),
        );

        await act(async () => {
            result.current.handleAddAppointment({
                date: '2026-08-20',
                title: 'جلسة مرافعة',
                details: 'اختبار',
                purpose: 'مرافعة اعتيادية',
            });
            await flushPendingCalendarSyncs();
        });

        expect(CalendarDB.saveEventsBatch).toHaveBeenCalled();
        const saved = vi.mocked(CalendarDB.saveEventsBatch).mock.calls[0]?.[0]?.[0];
        expect(saved?.userId).toBe('lawyer-1');
        expect(saved?.date).toBe('2026-08-20');
        expect(saved?.sourceModule).toBe('lawsuit');
    });
});
