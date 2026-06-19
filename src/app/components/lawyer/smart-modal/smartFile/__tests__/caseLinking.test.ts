import { describe, expect, it } from 'vitest';
import type { FileData } from '../../../LawyerShared';
import {
    addExternalCaseLink,
    linkExistingLawsuitFiles,
    listCaseLinkCandidates,
    readCaseLinks,
} from '../caseLinking';

const base = (id: number, caseNo: string, court: string): FileData =>
    ({
        id,
        type: 'lawsuit',
        status: 'active',
        caseNo,
        court,
        docType: 'مدنية',
        date: '2026-01-01',
        parties: [{ id: 1, name: `موكل ${id}`, role: 'مدعي', isClient: true, side: 'right' }],
        history: [],
        notes: [],
        images: [],
        stages: [
            {
                id: `s${id}`,
                stageName: 'البداءة',
                caseNo,
                court,
                parties: [{ id: 1, name: `موكل ${id}`, role: 'مدعي', isClient: true, side: 'right' }],
                timeline: [],
                tasks: [],
            },
        ],
        activeStageIndex: 0,
    }) as FileData;

describe('caseLinking', () => {
    it('links two existing files bidirectionally without changing primary identity', () => {
        const primary = base(1, '100/2026', 'محكمة الكرخ');
        const secondary = base(2, '200/2026', 'محكمة الرصافة');

        const { updatedPrimary, updatedSecondary } = linkExistingLawsuitFiles(primary, secondary, {
            linkDate: '2026-06-10',
            reason: 'ربط اختبار',
        });

        expect(updatedPrimary.caseNo).toBe('100/2026');
        expect(updatedPrimary.court).toBe('محكمة الكرخ');
        expect(updatedSecondary.caseNo).toBe('200/2026');
        expect(readCaseLinks(updatedPrimary as unknown as Record<string, unknown>)[0]?.peerCaseNo).toBe(
            '200/2026',
        );
        expect(readCaseLinks(updatedSecondary as unknown as Record<string, unknown>)[0]?.peerCaseNo).toBe(
            '100/2026',
        );
    });

    it('adds external case link reference only', () => {
        const primary = base(3, '300/2026', 'محكمة اختبار');
        const updated = addExternalCaseLink(primary, '999/2026', {
            linkDate: '2026-06-11',
            reason: 'مرجع خارجي',
        });

        expect(updated.caseNo).toBe('300/2026');
        expect(updated.court).toBe('محكمة اختبار');
        const links = readCaseLinks(updated as unknown as Record<string, unknown>);
        expect(links).toHaveLength(1);
        expect(links[0]?.isExternal).toBe(true);
        expect(links[0]?.peerCaseNo).toBe('999/2026');
    });

    it('excludes already-linked peer from candidates', () => {
        const files = [base(10, '10/ب', 'أ'), base(20, '20/ب', 'ب')];
        const { updatedPrimary, updatedSecondary } = linkExistingLawsuitFiles(files[0], files[1], {
            linkDate: '2026-06-12',
        });
        const pool = [updatedPrimary, updatedSecondary];
        const candidates = listCaseLinkCandidates(pool, 10);
        expect(candidates.some((c) => c.id === 20)).toBe(false);
    });

    it('lists candidates with string vs numeric ids', () => {
        const files = [base(5, '5/ب', 'أ'), base(6, '6/ب', 'ب')];
        expect(listCaseLinkCandidates(files, '5')).toHaveLength(1);
        expect(listCaseLinkCandidates(files, 5)[0]?.id).toBe(6);
    });
});
