import { describe, expect, it, vi, beforeEach } from 'vitest';
import { deserializeQuantumTasks } from '@/app/utils/quantumTasksStorage';

describe('deserializeQuantumTasks voice fields', () => {
    it('restores voice attachment metadata', () => {
        const tasks = deserializeQuantumTasks({
            tasks: [
                {
                    id: 't1',
                    rawText: 'مهمة',
                    title: 'مهمة',
                    status: 'pending',
                    voiceRef: 'hami-voice-ref:task-voice-t1',
                    voiceTranscript: 'نص',
                    voiceDurationSec: 15,
                },
            ],
        });
        expect(tasks[0]?.voiceRef).toBe('hami-voice-ref:task-voice-t1');
        expect(tasks[0]?.voiceTranscript).toBe('نص');
        expect(tasks[0]?.voiceDurationSec).toBe(15);
    });

    it('defaults voice fields when absent', () => {
        const tasks = deserializeQuantumTasks({
            tasks: [{ id: 't2', rawText: 'x', title: 'x', status: 'pending' }],
        });
        expect(tasks[0]?.voiceRef).toBeNull();
        expect(tasks[0]?.voiceTranscript).toBeNull();
        expect(tasks[0]?.voiceDurationSec).toBeNull();
    });
});
