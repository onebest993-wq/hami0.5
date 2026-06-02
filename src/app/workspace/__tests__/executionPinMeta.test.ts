import { describe, expect, it } from 'vitest';
import { extractExecutionClientName, extractExecutionCaseNumber } from '../executionPinMeta';
import { buildExecutionWorkspacePin } from '../workspacePinBuilders';
import { buildClusterScanIndex } from '../buildClusterScanIndex';
import { findCrossSectionLinks } from '../clusterMatchRules';
import { enrichPinFromScan } from '../enrichPinFromScan';

describe('executionPinMeta', () => {
    it('يستخرج اسم الموكل من creditors[].isClient', () => {
        const name = extractExecutionClientName({
            creditors: [{ name: 'أحمد كريم', isClient: true }],
            debtors: [{ name: 'خصم' }],
        });
        expect(name).toBe('أحمد كريم');
    });

    it('يربط عبر parentId إلى دعوى مدنية', () => {
        const lawsuits = [
            {
                id: 'law-9',
                type: 'lawsuit',
                caseNo: '2026/ولائي/100',
                parties: [{ name: 'شركة النور', isClient: true }],
            },
        ];
        const caseNo = extractExecutionCaseNumber(
            { parentId: 'law-9', fileNumber: '500', fileYear: '2026' },
            lawsuits,
        );
        expect(caseNo).toBe('2026/ولائي/100');
    });
});

describe('execution cluster integration', () => {
    it('يربط تثبيتاً قديماً بحقول فارغة بعد الإثراء من المسح', () => {
        const lawsuits = [
            {
                id: 'law-1',
                type: 'lawsuit',
                caseNo: '2026/150',
                parties: [{ name: 'سارة علي', isClient: true }],
            },
        ];
        const executions = [
            {
                id: 'ex-1',
                fileNumber: '900',
                fileYear: '2026',
                creditors: [{ name: 'سارة علي', isClient: true }],
            },
        ];
        const index = buildClusterScanIndex({
            lawsuitFiles: lawsuits,
            executionFiles: executions,
            criminalCases: [],
            urgentCases: [],
        });
        const stalePin = {
            id: 'ex-1',
            type: 'execution' as const,
            title: 'تنفيذ',
            clientName: '',
            caseNumber: '',
            routePath: 'workspace:execution:ex-1',
        };
        const enriched = enrichPinFromScan(stalePin, index);
        expect(enriched.clientName).toBe('سارة علي');
        const links = findCrossSectionLinks(enriched, index);
        expect(links.some((l) => l.type === 'lawsuit')).toBe(true);
    });

    it('buildExecutionWorkspacePin يمرّر lawsuitFiles', () => {
        const pin = buildExecutionWorkspacePin(
            {
                id: 'ex-2',
                parentId: 'law-2',
                creditors: [{ name: 'موكل', isClient: true }],
            },
            [{ id: 'law-2', caseNo: '2026/200', parties: [{ name: 'موكل', isClient: true }] }],
        );
        expect(pin?.caseNumber).toBe('2026/200');
    });
});
