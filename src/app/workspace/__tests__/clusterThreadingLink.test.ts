import { describe, expect, it } from 'vitest';
import { buildClusterScanIndex } from '../buildClusterScanIndex';
import { findCrossSectionLinks } from '../clusterMatchRules';

describe('cluster threading links', () => {
    it('يربط معاملة إدارية بدعوى بنفس اسم الموكل', () => {
        const index = buildClusterScanIndex({
            lawsuitFiles: [
                {
                    id: 'law-1',
                    type: 'lawsuit',
                    caseNo: '2026/ولائي/100',
                    parties: [{ name: 'شركة الأفق', isClient: true }],
                },
            ],
            executionFiles: [],
            criminalCases: [],
            urgentCases: [],
            threadingTransactions: [
                {
                    id: 'tx-1',
                    title: 'تسجيل عقار',
                    clientName: 'شركة الأفق',
                    targetDepartment: 'الطابو',
                    status: 'Active',
                },
            ],
            notes: [],
            fieldTasks: [],
        });

        expect(index.some((r) => r.type === 'threading')).toBe(true);

        const links = findCrossSectionLinks(
            {
                type: 'threading',
                id: 'tx-1',
                clientName: 'شركة الأفق',
                caseNumber: '',
                title: 'معاملة إدارية — تسجيل عقار — شركة الأفق',
            },
            index,
        );

        expect(links.some((l) => l.type === 'lawsuit' && l.id === 'law-1')).toBe(true);
        expect(links.some((l) => l.type === 'threading')).toBe(false);
    });
});
