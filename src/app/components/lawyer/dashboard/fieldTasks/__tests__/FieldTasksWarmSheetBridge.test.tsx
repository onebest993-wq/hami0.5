import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FieldTasksWarmSheetBridge } from '@/app/components/lawyer/dashboard/fieldTasks/FieldTasksWarmSheetBridge';

const completeTask = vi.fn();

vi.mock('@/app/hooks/useQuantumTasksContext', () => ({
    useQuantumTasksData: () => ({
        pendingTasks: [
            {
                id: 'task-1',
                title: 'مهمة ميدانية',
                location: 'بغداد',
                status: 'pending',
                pinnedToFieldCurtain: true,
                subTasks: [],
                rawText: '',
                parsedDate: null,
                reminderAt: null,
                isFatalDeadline: false,
                linkedCaseId: null,
                completedAt: null,
                documentRequirements: [],
                expenses: [],
                voiceRef: null,
                voiceTranscript: null,
                voiceDurationSec: null,
            },
        ],
        storageHydrated: true,
    }),
    useQuantumTasksActions: () => ({
        completeTask,
    }),
}));

describe('FieldTasksWarmSheetBridge', () => {
    it('يعرض المهام الحقيقية بلا skeleton', () => {
        render(
            <FieldTasksWarmSheetBridge open onClose={vi.fn()} onManageAll={vi.fn()} />,
        );

        expect(screen.getByTestId('field-tasks-sheet')).toBeTruthy();
        expect(screen.queryByTestId('field-tasks-sheet-loading')).toBeNull();
        expect(screen.getByText('مهمة ميدانية')).toBeTruthy();
        expect(screen.getByText('بغداد')).toBeTruthy();
    });
});
