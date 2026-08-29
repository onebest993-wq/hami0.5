import { describe, expect, it } from 'vitest';
import {
    clampExpenseAmount,
    clampTaskText,
    isAllowedTaskVoiceRef,
    MAX_TASK_RAW_LENGTH,
    MAX_TASK_TITLE_LENGTH,
    sanitizeLegalTask,
    sanitizeTaskPatch,
} from '../taskInputGuard';
import { legalTaskStub as task } from './legalTaskStub';

describe('taskInputGuard', () => {
    it('strips control characters and bidi overrides then clamps length', () => {
        const poisoned = `مهمة\u0000\u202Esecret`;
        expect(clampTaskText(poisoned, 20)).toBe('مهمةsecret');
        expect(clampTaskText('x'.repeat(MAX_TASK_RAW_LENGTH + 50), MAX_TASK_RAW_LENGTH)).toHaveLength(
            MAX_TASK_RAW_LENGTH,
        );
    });

    it('accepts only task-voice refs', () => {
        expect(isAllowedTaskVoiceRef('hami-voice-ref:task-voice-abc')).toBe(true);
        expect(isAllowedTaskVoiceRef('hami-voice-ref:notepad-1')).toBe(false);
        expect(isAllowedTaskVoiceRef('javascript:alert(1)')).toBe(false);
        expect(isAllowedTaskVoiceRef('https://evil.example/a.webm')).toBe(false);
        expect(isAllowedTaskVoiceRef('data:audio/webm;base64,AAAA')).toBe(false);
    });

    it('caps expense amounts and rejects non-finite values', () => {
        expect(clampExpenseAmount(2500)).toBe(2500);
        expect(clampExpenseAmount(Number.POSITIVE_INFINITY)).toBeNull();
        expect(clampExpenseAmount(-3)).toBeNull();
        expect(clampExpenseAmount(1e18)).toBe(1_000_000_000_000);
    });

    it('sanitizeTaskPatch never copies id and clamps title', () => {
        const patch = sanitizeTaskPatch({
            id: 'attacker-id',
            title: `A${'\u0007'}`.repeat(MAX_TASK_TITLE_LENGTH + 80),
            voiceRef: 'https://evil.example/x',
        } as Parameters<typeof sanitizeTaskPatch>[0]);
        expect(patch).not.toHaveProperty('id');
        expect(patch.title?.length).toBeLessThanOrEqual(MAX_TASK_TITLE_LENGTH);
        expect(patch.voiceRef).toBeNull();
    });

    it('sanitizeLegalTask drops invalid voice refs and nested bombs', () => {
        const cleaned = sanitizeLegalTask(
            task({
                id: 't1',
                title: 'x'.repeat(MAX_TASK_TITLE_LENGTH + 10),
                voiceRef: 'javascript:alert(1)',
                subTasks: Array.from({ length: 80 }, (_, i) => ({
                    id: `s${i}`,
                    title: 'فرع',
                    location: null,
                    isCompleted: false,
                })),
            }),
        );
        expect(cleaned.voiceRef).toBeNull();
        expect(cleaned.title.length).toBe(MAX_TASK_TITLE_LENGTH);
        expect(cleaned.subTasks.length).toBeLessThanOrEqual(40);
    });
});
