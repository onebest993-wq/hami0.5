import { describe, expect, it } from 'vitest';
import { validateTaskData } from '../validationUtils';

describe('validateTaskData (civil dossier)', () => {
    it('rejects empty or short titles', () => {
        expect(validateTaskData({ task: '' }).valid).toBe(false);
        expect(validateTaskData({ task: 'ab' }).valid).toBe(false);
    });

    it('accepts valid task with optional deadline', () => {
        expect(validateTaskData({ task: 'متابعة المحكمة', deadline: '' }).valid).toBe(true);
        expect(validateTaskData({ task: 'متابعة المحكمة', deadline: '2026-12-01' }).valid).toBe(true);
    });

    it('rejects invalid deadline', () => {
        expect(validateTaskData({ task: 'متابعة', deadline: 'not-a-date' }).valid).toBe(false);
    });
});
