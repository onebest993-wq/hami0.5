import { describe, expect, it } from 'vitest';
import { inferQuickNoteType, quickNoteTitle } from '../quickNoteUtils';

describe('quickNoteUtils', () => {
    it('detects schedule keywords', () => {
        expect(inferQuickNoteType('موعد جلسة غداً')).toBe('schedule');
        expect(inferQuickNoteType('تذكير بالمرافعة')).toBe('schedule');
    });

    it('defaults to text for ordinary notes', () => {
        expect(inferQuickNoteType('ملاحظة عن العقد')).toBe('text');
        expect(inferQuickNoteType('')).toBe('text');
    });

    it('maps titles by note type', () => {
        expect(quickNoteTitle('voice')).toBe('تسجيل صوتي');
        expect(quickNoteTitle('schedule')).toBe('موعد سريع');
        expect(quickNoteTitle('text')).toBe('ملاحظة سريعة');
    });
});
