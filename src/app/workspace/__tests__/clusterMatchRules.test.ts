import { describe, expect, it } from 'vitest';
import { findCrossSectionLinks, isClusterLinkingEligibleType } from '../clusterMatchRules';
import type { ClusterScanRecord } from '../types';

describe('clusterMatchRules', () => {
    const index: ClusterScanRecord[] = [
        {
            id: '1',
            type: 'lawsuit',
            title: 'دعوى',
            clientName: 'سارة علي',
            caseNumber: '2026/150',
            routePath: 'workspace:lawsuit:1',
        },
        {
            id: 'ex1',
            type: 'execution',
            title: 'تنفيذ',
            clientName: 'سارة علي',
            caseNumber: '7890/2026',
            routePath: 'workspace:execution:ex1',
        },
    ];

    it('يدعم التنفيذ في الربط العنقودي', () => {
        expect(isClusterLinkingEligibleType('execution')).toBe(true);
    });

    it('يربط إضبارة تنفيذ بدعوى عند تطابق الموكل', () => {
        const links = findCrossSectionLinks(
            {
                type: 'execution',
                id: 'ex1',
                clientName: 'سارة علي',
                caseNumber: '7890/2026',
            },
            index,
        );
        expect(links.some((l) => l.type === 'lawsuit')).toBe(true);
    });

    it('يربط دعوى بتنفيذ عند تطابق رقم القضية', () => {
        const lawsuitPin = { ...index[0]!, caseNumber: '2026/150' };
        const execRecord = { ...index[1]!, caseNumber: '2026/150' };
        const links = findCrossSectionLinks(lawsuitPin, [lawsuitPin, execRecord]);
        expect(links.some((l) => l.type === 'execution')).toBe(true);
    });
});
