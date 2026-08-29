import { describe, expect, it } from 'vitest';
import type { FileData, IncidentalCase } from '../../../LawyerShared';
import {
    normalizeFileId,
    patchIncidentalLinkedFile,
} from '../incidentalCaseLinking';

function parentWithStage(incidentalCases: IncidentalCase[] = []): FileData {
    return {
        id: 10,
        type: 'lawsuit',
        status: 'active',
        caseNo: '100/2026',
        court: 'محكمة الكرخ',
        docType: 'مدنية',
        date: '2026-01-01',
        parties: [],
        history: [],
        notes: [],
        images: [],
        stages: [
            {
                id: 's1',
                stageName: 'البداءة',
                caseNo: '100/2026',
                court: 'محكمة الكرخ',
                parties: [],
                timeline: [],
                tasks: [],
                incidentalCases,
            },
        ],
        activeStageIndex: 0,
    } as FileData;
}

describe('incidentalCaseLinking', () => {
    it('normalizeFileId accepts numeric strings and rejects junk', () => {
        expect(normalizeFileId(42)).toBe(42);
        expect(normalizeFileId('42')).toBe(42);
        expect(normalizeFileId(' 7 ')).toBe(7);
        expect(normalizeFileId('12.5')).toBeNull();
        expect(normalizeFileId('abc')).toBeNull();
        expect(normalizeFileId(null)).toBeNull();
    });

    it('patchIncidentalLinkedFile updates an existing incidental row', () => {
        const file = parentWithStage([
            {
                id: 'inc_1',
                type: 'joined',
                partyName: 'طرف قديم',
                date: '2026-01-01',
                status: 'active',
                details: 'قديم',
            },
        ]);

        const patched = patchIncidentalLinkedFile(file, 'inc_1', 99, '200/2026', 'طرف جديد');
        const row = patched.stages?.[0]?.incidentalCases?.[0];

        expect(patched.stages?.[0]?.incidentalCases).toHaveLength(1);
        expect(row?.linkedFileId).toBe(99);
        expect(row?.linkedCaseNo).toBe('200/2026');
        expect(row?.partyName).toBe('طرف جديد');
        expect(row?.details).toBe('قديم');
    });

    it('patchIncidentalLinkedFile upserts when incidental is missing and createIfMissing is set', () => {
        const file = parentWithStage([]);

        const patched = patchIncidentalLinkedFile(
            file,
            'inc_new',
            55,
            '555/2026',
            'مدعي ضد مدعى عليه',
            {
                type: 'counter',
                details: 'تفاصيل الاختبار',
                date: '2026-08-20',
                partyName: 'مدعي ضد مدعى عليه',
            },
        );

        const cases = patched.stages?.[0]?.incidentalCases ?? [];
        expect(cases).toHaveLength(1);
        expect(cases[0]).toMatchObject({
            id: 'inc_new',
            type: 'counter',
            partyName: 'مدعي ضد مدعى عليه',
            details: 'تفاصيل الاختبار',
            date: '2026-08-20',
            status: 'active',
            linkedFileId: 55,
            linkedCaseNo: '555/2026',
        });
    });

    it('patchIncidentalLinkedFile does not invent a row without createIfMissing', () => {
        const file = parentWithStage([]);
        const patched = patchIncidentalLinkedFile(file, 'inc_ghost', 1, '1/2026');
        expect(patched.stages?.[0]?.incidentalCases ?? []).toHaveLength(0);
    });

    it('patchIncidentalLinkedFile upserts on root incidentalCases when stages are absent', () => {
        const file = {
            id: 3,
            incidentalCases: [],
        } as FileData;

        const patched = patchIncidentalLinkedFile(file, 'inc_root', 8, '8/2026', undefined, {
            type: 'joined',
            date: '2026-08-20',
        });

        expect(patched.incidentalCases).toHaveLength(1);
        expect(patched.incidentalCases?.[0]).toMatchObject({
            id: 'inc_root',
            type: 'joined',
            partyName: 'دعوى منضمة',
            linkedFileId: 8,
            linkedCaseNo: '8/2026',
            status: 'active',
        });
    });
});
