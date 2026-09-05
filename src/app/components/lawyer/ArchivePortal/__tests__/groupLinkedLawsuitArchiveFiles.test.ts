import { describe, expect, it } from 'vitest';
import {
    groupLinkedLawsuitArchiveFiles,
    resolveLinkedClusterInnerColumns,
    resolveLinkedDossierClusterRole,
    linkedDossierClusterRoleLabel,
} from '../groupLinkedLawsuitArchiveFiles';

describe('groupLinkedLawsuitArchiveFiles', () => {
    it('leaves unlinked files as singles', () => {
        const units = groupLinkedLawsuitArchiveFiles([
            { id: 1, caseNo: 'A' },
            { id: 2, caseNo: 'B' },
        ]);
        expect(units.map((u) => u.kind)).toEqual(['single', 'single']);
    });

    it('clusters independentChallengeLink peers into one frame', () => {
        const units = groupLinkedLawsuitArchiveFiles([
            { id: 10, caseNo: 'أساس' },
            {
                id: 11,
                caseNo: 'مستقل',
                independentChallengeLink: { sourceFileId: 10, sourceCaseNo: 'أساس' },
            },
            { id: 20, caseNo: 'منفرد' },
        ]);
        expect(units).toHaveLength(2);
        expect(units[0]?.kind).toBe('cluster');
        if (units[0]?.kind === 'cluster') {
            expect(units[0].files.map((f) => f.id)).toEqual([10, 11]);
        }
        expect(units[1]?.kind).toBe('single');
    });

    it('clusters via caseLinks bidirectionally', () => {
        const units = groupLinkedLawsuitArchiveFiles([
            {
                id: 'a',
                caseLinks: [{ peerFileId: 'b', originFileId: 'a' }],
            },
            { id: 'b' },
            { id: 'c' },
        ]);
        expect(units[0]?.kind).toBe('cluster');
        if (units[0]?.kind === 'cluster') {
            expect(units[0].files.map((f) => String(f.id))).toEqual(['a', 'b']);
        }
        expect(units[1]?.kind).toBe('single');
    });

    it('scales inner columns with member count', () => {
        expect(resolveLinkedClusterInnerColumns(1, 4)).toBe(1);
        expect(resolveLinkedClusterInnerColumns(2, 4)).toBe(2);
        expect(resolveLinkedClusterInnerColumns(5, 4)).toBe(3);
        expect(resolveLinkedClusterInnerColumns(3, 1)).toBe(1);
    });

    it('labels base vs independent within a cluster', () => {
        const base = { id: 10, caseNo: 'أساس' };
        const spawn = {
            id: 11,
            caseNo: 'مستقل',
            independentChallengeLink: { sourceFileId: 10, sourceCaseNo: 'أساس' },
        };
        const cluster = [base, spawn];
        expect(resolveLinkedDossierClusterRole(base, cluster)).toBe('base');
        expect(resolveLinkedDossierClusterRole(spawn, cluster)).toBe('independent');
        expect(linkedDossierClusterRoleLabel('base')).toBe('الأساس');
        expect(linkedDossierClusterRoleLabel('independent')).toBe('طعن مستقل');
    });
});
