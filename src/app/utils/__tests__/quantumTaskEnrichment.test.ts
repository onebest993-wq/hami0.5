import { describe, expect, it } from 'vitest';
import { parseTaskInput } from '@/app/utils/nlpParser';
import { applySilentPracticalEnrichment } from '../quantumTaskEnrichment';

describe('applySilentPracticalEnrichment', () => {
    it('marks silent fatal keywords without NLP fatal flag', () => {
        const trimmed = 'موعد تمييز غداً';
        const parsed = parseTaskInput(trimmed);
        const enriched = applySilentPracticalEnrichment(trimmed, parsed);
        expect(enriched.isFatalDeadline).toBe(true);
    });

    it('uses scheduledFor when provided from weekly agenda', () => {
        const scheduled = new Date(2026, 4, 20);
        const trimmed = 'زيارة محكمة';
        const parsed = parseTaskInput(trimmed);
        const enriched = applySilentPracticalEnrichment(trimmed, parsed, { scheduledFor: scheduled });
        expect(enriched.parsedDate?.getFullYear()).toBe(2026);
        expect(enriched.parsedDate?.getMonth()).toBe(4);
        expect(enriched.parsedDate?.getDate()).toBe(20);
    });

    it('uses trimmed raw text as title when NLP title is empty', () => {
        const trimmed = 'متابعة ملف 123';
        const parsed = { ...parseTaskInput(trimmed), title: '   ' };
        const enriched = applySilentPracticalEnrichment(trimmed, parsed);
        expect(enriched.title).toBe('متابعة ملف 123');
    });
});
