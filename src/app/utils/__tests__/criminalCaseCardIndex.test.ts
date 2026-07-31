import { describe, expect, it } from 'vitest';
import {
    parseCriminalCardIndex,
    projectCriminalCaseCardIndexEntry,
    serializeCriminalCardIndex,
} from '@/app/utils/criminalCaseCardIndex';

describe('criminalCaseCardIndex', () => {
    it('projects only card-facing fields', () => {
        const entry = projectCriminalCaseCardIndexEntry({
            id: 'c1',
            ownerLawyerId: 'law-1',
            courtCaseNumber: '123/ك',
            unknownDefendant: false,
            notes: 'x'.repeat(400),
            basics: { stage: 'محكمة الجنح', legalArticle: '456', crimeType: 'سرقة' },
            location: { courtName: 'محكمة الجنح', caseNumber: '123/ك' },
            complainants: [{ fullName: 'مشتكي', isClient: true, phone: 'secret' }],
            defendants: [{ fullName: 'متهم', isJuvenile: true, nationalId: 'secret' }],
            evidence: [{ id: 'heavy' }],
            lawyerRequests: [{ id: 'r1' }],
        });

        expect(entry).toMatchObject({
            id: 'c1',
            ownerLawyerId: 'law-1',
            courtCaseNumber: '123/ك',
            basics: { stage: 'محكمة الجنح', legalArticle: '456', crimeType: 'سرقة' },
            location: { courtName: 'محكمة الجنح', caseNumber: '123/ك' },
            complainants: [{ fullName: 'مشتكي', isClient: true }],
            defendants: [{ fullName: 'متهم', isJuvenile: true }],
        });
        expect(entry?.notes?.length).toBe(240);
        expect(entry).not.toHaveProperty('evidence');
        expect(entry).not.toHaveProperty('lawyerRequests');
        expect(entry?.complainants?.[0]).not.toHaveProperty('phone');
        expect(entry?.defendants?.[0]).not.toHaveProperty('nationalId');
    });

    it('round-trips serialize/parse', () => {
        const entries = [
            projectCriminalCaseCardIndexEntry({
                id: 'a',
                basics: { stage: 'مرحلة التحقيق' },
            })!,
        ];
        const raw = serializeCriminalCardIndex(entries);
        expect(parseCriminalCardIndex(raw)).toEqual(entries);
        expect(parseCriminalCardIndex('{bad')).toBeNull();
        expect(parseCriminalCardIndex(JSON.stringify({ v: 99, entries: [] }))).toBeNull();
    });
});
