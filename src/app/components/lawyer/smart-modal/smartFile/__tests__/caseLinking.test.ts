import { describe, expect, it } from 'vitest';
import type { FileData } from '../../../LawyerShared';
import {
    addExternalCaseLink,
    cloneFileForCaseLinkBrowse,
    findCaseLinkOriginForPeer,
    isCaseLinkOriginDossier,
    linkCriminalPeerToOrigin,
    linkExistingLawsuitFiles,
    listCaseLinkCandidates,
    readCaseLinks,
    rejectCaseLinkPair,
    removeInternalCaseLinkFromOrigin,
    resolveCaseLinkBrowseUi,
    resolveCaseLinkOriginId,
    resolveCaseLinkPeerNav,
    resolveOutboundCaseLink,
} from '../caseLinking';

const base = (id: number, caseNo: string, court: string): FileData =>
    ({
        id,
        type: 'lawsuit',
        status: 'active',
        caseNo,
        court,
        docType: 'مدنية',
        lawsuitJurisdiction: 'civil',
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

const archived = (id: number, caseNo: string, court: string): FileData => ({
    ...base(id, caseNo, court),
    status: 'archived',
});

const personal = (id: number, caseNo: string, court: string): FileData => ({
    ...base(id, caseNo, court),
    lawsuitJurisdiction: 'personal',
    docType: 'نفقة',
    court: 'محكمة الأحوال الشخصية',
});

describe('caseLinking', () => {
    it('links existing files by updating origin only — peer dossier untouched', () => {
        const primary = base(1, '100/2026', 'محكمة الكرخ');
        const secondary = archived(2, '200/2026', 'محكمة الرصافة');
        const secondarySnapshot = JSON.stringify(secondary);

        const { updatedPrimary } = linkExistingLawsuitFiles(primary, secondary, {
            linkDate: '2026-06-10',
            reason: 'ربط اختبار',
        });

        expect(updatedPrimary.caseNo).toBe('100/2026');
        expect(updatedPrimary.court).toBe('محكمة الكرخ');
        expect(readCaseLinks(updatedPrimary as unknown as Record<string, unknown>)[0]?.peerCaseNo).toBe(
            '200/2026',
        );
        expect(JSON.stringify(secondary)).toBe(secondarySnapshot);
        expect(readCaseLinks(secondary as unknown as Record<string, unknown>)).toHaveLength(0);
    });

    it('allows linking active peers and cross-jurisdiction lawsuit peers', () => {
        const primary = base(1, '100/2026', 'محكمة أ');
        const activePeer = base(2, '200/2026', 'محكمة ب');
        const personalPeer = personal(3, '300/2026', 'محكمة أحوال');

        expect(rejectCaseLinkPair(primary, activePeer)).toBeNull();
        expect(rejectCaseLinkPair(primary, personalPeer)).toBeNull();

        const { updatedPrimary: linkedActive } = linkExistingLawsuitFiles(primary, activePeer, {
            linkDate: '2026-06-10',
        });
        expect(readCaseLinks(linkedActive as unknown as Record<string, unknown>)[0]?.peerFileId).toBe(2);

        const { updatedPrimary: linkedPersonal } = linkExistingLawsuitFiles(primary, personalPeer, {
            linkDate: '2026-06-11',
        });
        expect(readCaseLinks(linkedPersonal as unknown as Record<string, unknown>)[0]?.peerFileId).toBe(3);
    });

    it('links criminal peer on origin only', () => {
        const primary = base(1, '100/2026', 'محكمة أ');
        const { updatedPrimary } = linkCriminalPeerToOrigin(
            primary,
            { criminalId: 'crim-42', caseNo: 'جز/42/2026' },
            { linkDate: '2026-06-12' },
        );
        const links = readCaseLinks(updatedPrimary as unknown as Record<string, unknown>);
        expect(links).toHaveLength(1);
        expect(links[0]?.peerDossierKind).toBe('criminal');
        expect(links[0]?.peerCriminalId).toBe('crim-42');
        expect(links[0]?.peerCaseNo).toBe('جز/42/2026');
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
        const { updatedPrimary } = linkExistingLawsuitFiles(files[0], files[1], {
            linkDate: '2026-06-12',
        });
        const pool = [updatedPrimary, files[1]];
        const candidates = listCaseLinkCandidates(pool, 10);
        expect(candidates.some((c) => c.id === 20)).toBe(false);
        expect(listCaseLinkCandidates(pool, NaN)).toEqual([]);
    });

    it('lists candidates with string vs numeric ids', () => {
        const files = [base(5, '5/ب', 'أ'), base(6, '6/ب', 'ب')];
        expect(listCaseLinkCandidates(files, '5')).toHaveLength(1);
        expect(listCaseLinkCandidates(files, 5)[0]?.id).toBe(6);
    });

    it('lists candidates across different litigation degrees (unlike consolidation)', () => {
        const first = base(1, '1/ب', 'أ');
        first.stages![0].stageName = 'البداءة';
        const appeal = base(2, '2/ب', 'ب');
        appeal.stages![0].stageName = 'استئناف';
        const candidates = listCaseLinkCandidates([first, appeal], 1);
        expect(candidates.some((c) => c.id === 2)).toBe(true);
    });

    it('lists active and cross-jurisdiction lawsuit peers', () => {
        const civil = base(5, '5/ب', 'أ');
        const activeCivil = base(6, '6/ب', 'ب');
        const personalPeer = personal(7, '7/ب', 'ج');

        const candidates = listCaseLinkCandidates([civil, activeCivil, personalPeer], 5);
        expect(candidates.map((c) => c.id).sort()).toEqual([6, 7]);
        expect(listCaseLinkCandidates([civil], 5)).toHaveLength(0);
    });

    it('origin dossier stays editable; browse uses isolated clone without mutating peer', () => {
        const primary = base(1, '100/2026', 'محكمة أ');
        const secondary = base(2, '200/2026', 'محكمة ب');
        const { updatedPrimary } = linkExistingLawsuitFiles(primary, secondary, {
            linkDate: '2026-06-10',
        });
        const pool = [updatedPrimary, secondary];

        expect(isCaseLinkOriginDossier(updatedPrimary)).toBe(true);
        expect(isCaseLinkOriginDossier(secondary)).toBe(false);
        expect(resolveCaseLinkOriginId(updatedPrimary)).toBe(1);
        expect(findCaseLinkOriginForPeer(2, pool)?.id).toBe(1);

        const browseClone = cloneFileForCaseLinkBrowse(secondary);
        browseClone.caseNo = 'تعديل على النسخة فقط';
        expect(secondary.caseNo).toBe('200/2026');
        expect(browseClone.id).toBe(secondary.id);
    });

    it('removeInternalCaseLinkFromOrigin updates origin only and leaves peer untouched', () => {
        const primary = base(1, '100/2026', 'محكمة أ');
        const secondary = base(2, '200/2026', 'محكمة ب');
        const { updatedPrimary } = linkExistingLawsuitFiles(primary, secondary, {
            linkDate: '2026-06-10',
        });
        const secondarySnapshot = JSON.stringify(secondary);

        const unlinked = removeInternalCaseLinkFromOrigin(updatedPrimary, 2);
        expect(unlinked).not.toBeNull();
        expect(readCaseLinks(unlinked as unknown as Record<string, unknown>)).toHaveLength(0);
        expect(JSON.stringify(secondary)).toBe(secondarySnapshot);
        expect(unlinked?.stages?.[0]?.timeline?.some((e) => e.title?.includes('فك ربط'))).toBe(true);
    });

    it('removeInternalCaseLinkFromOrigin supports criminal peer unlink', () => {
        const primary = base(1, '100/2026', 'محكمة أ');
        const { updatedPrimary } = linkCriminalPeerToOrigin(
            primary,
            { criminalId: 'crim-9', caseNo: 'جز/9' },
            { linkDate: '2026-06-10' },
        );
        const unlinked = removeInternalCaseLinkFromOrigin(updatedPrimary, undefined, 'crim-9');
        expect(readCaseLinks(unlinked as unknown as Record<string, unknown>)).toHaveLength(0);
    });

    it('resolveCaseLinkBrowseUi shows controls on origin for active or archived lawsuit peers', () => {
        const primary = base(1, '100/2026', 'أ');
        const activePeer = base(2, '200/2026', 'ب');
        primary.caseLinks = [
            {
                id: 'link_test',
                peerFileId: 2,
                peerCaseNo: '200/2026',
                linkDate: '2026-06-10',
                originFileId: 1,
                peerDossierKind: 'lawsuit',
            },
        ];
        const pool = [primary, activePeer];

        const ui = resolveCaseLinkBrowseUi(primary, primary, pool);
        expect(ui?.peerCaseNo).toBe('200/2026');
        expect(resolveCaseLinkBrowseUi(activePeer, activePeer, pool)).toBeUndefined();
    });

    it('resolveCaseLinkBrowseUi shows criminal link on origin', () => {
        const primary = base(1, '100/2026', 'أ');
        primary.caseLinks = [
            {
                id: 'link_crim',
                peerCaseNo: 'جز/1',
                linkDate: '2026-06-10',
                originFileId: 1,
                peerDossierKind: 'criminal',
                peerCriminalId: 'crim-1',
            },
        ];
        const ui = resolveCaseLinkBrowseUi(primary, primary, [primary]);
        expect(ui?.peerDossierKind).toBe('criminal');
        expect(ui?.peerCriminalId).toBe('crim-1');
    });

    it('clone preserves all stages for browse copy', () => {
        const peer = base(2, '200/2026', 'ب');
        peer.stages = [
            ...(peer.stages ?? []),
            {
                id: 's2',
                stageName: 'الاستئناف',
                caseNo: '200/استئناف',
                court: 'محكمة',
                parties: [],
                timeline: [],
                tasks: [],
            },
        ] as FileData['stages'];
        peer.activeStageIndex = 1;
        const clone = cloneFileForCaseLinkBrowse(peer);
        expect(clone.stages).toHaveLength(2);
        expect(clone.activeStageIndex).toBe(1);
    });

    it('resolveOutboundCaseLink ignores legacy inbound pollution on peer dossier', () => {
        const primary = base(1, '100/2026', 'محكمة أ');
        primary.caseLinks = [
            {
                id: 'link_legacy',
                peerFileId: 2,
                peerCaseNo: '200/2026',
                linkDate: '2026-06-10',
                originFileId: 2,
            },
        ];
        expect(resolveOutboundCaseLink(primary)).toBeUndefined();
    });

    it('resolveCaseLinkPeerNav returns origin and peer roles', () => {
        const primary = base(1, '100/2026', 'أ');
        const secondary = base(2, '200/2026', 'ب');
        const { updatedPrimary } = linkExistingLawsuitFiles(primary, secondary, {
            linkDate: '2026-06-10',
        });
        const pool = [updatedPrimary, secondary];
        const navFromOrigin = resolveCaseLinkPeerNav(updatedPrimary, pool);
        expect(navFromOrigin?.origin.id).toBe(1);
        expect(navFromOrigin?.peer.id).toBe(2);
        const navFromPeer = resolveCaseLinkPeerNav(secondary, pool);
        expect(navFromPeer?.origin.id).toBe(1);
        expect(navFromPeer?.peer.id).toBe(2);
    });
});
