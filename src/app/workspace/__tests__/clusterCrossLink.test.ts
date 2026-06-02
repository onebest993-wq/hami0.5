import { describe, expect, it } from 'vitest';
import { buildClusterScanIndex } from '../buildClusterScanIndex';
import { findCrossSectionLinks } from '../clusterMatchRules';

describe('cluster cross-section linking', () => {
    it('يربط طلباً مستعجلاً بدعوى مدنية بنفس رقم القضية', () => {
        const index = buildClusterScanIndex({
            lawsuitFiles: [
                {
                    id: 'law-1',
                    type: 'lawsuit',
                    caseNo: '2026/ولائي/456',
                    parties: [{ name: 'شركة الأفق', isClient: true }],
                },
            ],
            executionFiles: [],
            criminalCases: [],
            urgentCases: [
                {
                    id: 'urg-1',
                    actionType: 'حجز',
                    requestNumber: '2026/ولائي/456',
                    applicantName: 'موكل',
                },
            ],
            notes: [],
            fieldTasks: [],
        });

        const links = findCrossSectionLinks(
            {
                type: 'urgent',
                id: 'urg-1',
                clientName: '',
                caseNumber: '2026/ولائي/456',
                title: 'حجز — 2026/ولائي/456',
            },
            index,
        );

        expect(links.some((l) => l.type === 'lawsuit' && l.id === 'law-1')).toBe(true);
        expect(links.some((l) => l.type === 'urgent')).toBe(false);
    });

    it('يفهرس المفكرة والمهام في المسح', () => {
        const index = buildClusterScanIndex({
            lawsuitFiles: [],
            executionFiles: [],
            criminalCases: [],
            urgentCases: [],
            notes: [{ id: 'n1', title: 'ملاحظة 2026/ولائي/456', body: '' }],
            fieldTasks: [
                {
                    id: 't1',
                    title: 'تبليغ',
                    rawText: 'تبليغ',
                    linkedCaseId: null,
                    status: 'pending',
                    subTasks: [],
                },
            ],
        });

        expect(index.some((r) => r.type === 'notepad')).toBe(true);
        expect(index.some((r) => r.type === 'task')).toBe(true);
    });
});
