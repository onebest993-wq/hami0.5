import { describe, expect, it } from 'vitest';
import {
    EMPTY_TASK_VOICE,
    newTaskId,
    pendingTaskShell,
} from '@/app/services/tasks/quantumPendingTaskFactory';

describe('quantumPendingTaskFactory', () => {
    it('pendingTaskShell starts pending with empty nested collections and empty voice', () => {
        const shell = pendingTaskShell();
        expect(shell.status).toBe('pending');
        expect(shell.completedAt).toBeNull();
        expect(shell.pinnedToFieldCurtain).toBe(false);
        expect(shell.fieldCurtainPinnedAt).toBeNull();
        expect(shell.subTasks).toEqual([]);
        expect(shell.documentRequirements).toEqual([]);
        expect(shell.expenses).toEqual([]);
        expect(shell.voiceRef).toBe(EMPTY_TASK_VOICE.voiceRef);
        expect(shell.voiceTranscript).toBeNull();
        expect(shell.voiceDurationSec).toBeNull();
    });

    it('pendingTaskShell applies overrides after defaults', () => {
        const shell = pendingTaskShell({
            subTasks: [{ id: 's1', title: 'فرع', location: null, isCompleted: false, kind: 'branch' }],
        });
        expect(shell.subTasks).toHaveLength(1);
        expect(shell.subTasks[0]!.title).toBe('فرع');
        expect(shell.status).toBe('pending');
    });

    it('newTaskId returns a non-empty id', () => {
        expect(newTaskId().length).toBeGreaterThan(8);
    });
});
