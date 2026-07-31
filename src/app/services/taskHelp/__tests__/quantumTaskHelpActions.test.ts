import { describe, expect, it } from 'vitest';
import type { LegalTask } from '@/app/types/TaskEngine';
import type { TaskHelpRequest } from '@/app/types/taskHelpTypes';
import {
    canRequestTaskHelp,
    helpFieldsPatchFromRequest,
} from '../quantumTaskHelpActions';

function task(partial: Partial<LegalTask> = {}): LegalTask {
    return {
        id: 't1',
        rawText: 'مهمة',
        title: 'مهمة',
        location: null,
        parsedDate: null,
        reminderAt: null,
        isFatalDeadline: false,
        linkedCaseId: null,
        status: 'pending',
        completedAt: null,
        pinnedToFieldCurtain: false,
        fieldCurtainPinnedAt: null,
        subTasks: [],
        documentRequirements: [],
        expenses: [],
        voiceRef: null,
        voiceTranscript: null,
        voiceDurationSec: null,
        ...partial,
    };
}

describe('quantumTaskHelpActions hot-path guards', () => {
    it('blocks duplicate help requests while collaboration is active', () => {
        expect(canRequestTaskHelp(task())).toBe(true);
        expect(canRequestTaskHelp(task({ completedAt: new Date() }))).toBe(false);
        expect(canRequestTaskHelp(task({ collaborationStatus: 'PENDING' }))).toBe(false);
        expect(canRequestTaskHelp(task({ collaborationStatus: 'ACCEPTED' }))).toBe(false);
        expect(canRequestTaskHelp(null)).toBe(false);
    });

    it('maps help request to delegated status only after accept', () => {
        const pending: TaskHelpRequest = {
            id: 'h1',
            sourceTaskId: 't1',
            requesterId: 'o1',
            shareScope: 'PUBLIC_FORUM',
            collaborationStatus: 'PENDING',
            isSanitised: true,
            title: 'x',
            sharedNotes: [],
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
        };
        expect(helpFieldsPatchFromRequest(pending).status).toBeUndefined();
        expect(
            helpFieldsPatchFromRequest({
                ...pending,
                collaborationStatus: 'ACCEPTED',
                assigneeId: 'a1',
            }).status,
        ).toBe('delegated');
    });
});
