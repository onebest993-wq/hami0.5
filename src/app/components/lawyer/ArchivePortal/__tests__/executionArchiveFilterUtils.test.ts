import { describe, expect, it } from 'vitest';
import {
    buildExecutionJurisdictionCounts,
    filterExecutionArchiveFiles,
    getExecutionArchiveBasePool,
    isCivilExecutionArchive,
    isLegalEntityPerspectiveAllowed,
    isShariaExecutionArchive,
    matchesExecutionArchiveFilters,
    matchesExecutionArchiveSearch,
    matchesExecutionPerspectiveFilter,
} from '../executionArchiveFilterUtils';
import type { LooseArchiveFile } from '../types';

describe('executionArchiveFilterUtils', () => {
    it('classifies financial debt as civil not sharia', () => {
        const file = {
            id: 'civil-1',
            claimType: 'استحصال دين مالي',
            docType: 'السندات المتضمنة إقراراً بدين',
            creditors: [{ name: 'دائن', isClient: true }],
            debtors: [{ name: 'مدين' }],
        } as LooseArchiveFile;

        expect(isCivilExecutionArchive(file)).toBe(true);
        expect(isShariaExecutionArchive(file)).toBe(false);
        expect(matchesExecutionArchiveFilters(file, 'civil', 'all')).toBe(true);
        expect(matchesExecutionArchiveFilters(file, 'sharia', 'all')).toBe(false);
    });

    it('classifies visitation as sharia not civil', () => {
        const file = {
            id: 'sharia-1',
            claimType: 'مشاهدة',
            classification: 'أحوال شخصية',
            creditors: [{ name: 'أم', isClient: true }],
            debtors: [{ name: 'أب' }],
        } as LooseArchiveFile;

        expect(isShariaExecutionArchive(file)).toBe(true);
        expect(isCivilExecutionArchive(file)).toBe(false);
        expect(matchesExecutionArchiveFilters(file, 'sharia', 'all')).toBe(true);
        expect(matchesExecutionArchiveFilters(file, 'civil', 'all')).toBe(false);
    });

    it('isolates debtor agent perspective', () => {
        const file = {
            id: 'debtor-agent',
            claimType: 'استحصال دين مالي',
            representedParty: 'debtor',
            creditors: [{ name: 'دائن' }],
            debtors: [{ name: 'موكل', isClient: true }],
        } as LooseArchiveFile;

        expect(matchesExecutionPerspectiveFilter(file, 'debtor_agent')).toBe(true);
        expect(matchesExecutionPerspectiveFilter(file, 'creditor_agent')).toBe(false);
    });

    it('isolates legal entity debtor', () => {
        const file = {
            id: 'legal-entity',
            claimType: 'استحصال دين مالي',
            debtor_entity_kind: 'legal_entity',
            creditors: [{ name: 'دائن', isClient: true }],
            debtors: [{ name: 'شركة', entityKind: 'legal_entity' }],
        } as LooseArchiveFile;

        expect(matchesExecutionPerspectiveFilter(file, 'legal_entity')).toBe(true);
        expect(matchesExecutionPerspectiveFilter(file, 'creditor_agent')).toBe(true);
    });

    it('classifies eviction as civil', () => {
        const file = {
            id: 'eviction-1',
            claimType: 'إخلاء',
            creditors: [{ name: 'مالك', isClient: true }],
            debtors: [{ name: 'مستأجر' }],
        } as LooseArchiveFile;

        expect(isCivilExecutionArchive(file)).toBe(true);
        expect(isShariaExecutionArchive(file)).toBe(false);
    });

    it('never matches legal entity perspective for sharia dossiers', () => {
        const file = {
            id: 'sharia-legal-block',
            claimType: 'مشاهدة',
            debtor_entity_kind: 'legal_entity',
            debtors: [{ name: 'شركة', entityKind: 'legal_entity' }],
        } as LooseArchiveFile;

        expect(isLegalEntityPerspectiveAllowed('sharia')).toBe(false);
        expect(matchesExecutionArchiveFilters(file, 'sharia', 'legal_entity')).toBe(false);
        expect(matchesExecutionPerspectiveFilter(file, 'legal_entity', 'sharia')).toBe(false);
    });

    it('counts active and trash pools separately per jurisdiction', () => {
        const files = [
            {
                id: 'a1',
                claimType: 'استحصال دين مالي',
            },
            {
                id: 'a2',
                claimType: 'مشاهدة',
            },
            {
                id: 't1',
                claimType: 'استحصال دين مالي',
                executionTrashDeletedAt: '2026-01-01T00:00:00.000Z',
            },
        ] as LooseArchiveFile[];

        const active = getExecutionArchiveBasePool(files, 'active');
        const trash = getExecutionArchiveBasePool(files, 'trash');
        const archived = getExecutionArchiveBasePool(files, 'archived');
        expect(active).toHaveLength(2);
        expect(trash).toHaveLength(1);
        expect(archived).toHaveLength(0);
        expect(buildExecutionJurisdictionCounts(active)).toEqual({
            all: 2,
            civil: 1,
            sharia: 1,
        });
        expect(buildExecutionJurisdictionCounts(trash)).toEqual({
            all: 1,
            civil: 1,
            sharia: 0,
        });
    });

    it('getExecutionArchiveBasePool separates active, archived, and trash', () => {
        const files = [
            { id: 'a1', claimType: 'استحصال دين مالي' },
            {
                id: 'a2',
                claimType: 'استحصال دين مالي',
                executionArchivedAt: '2026-02-01T00:00:00.000Z',
            },
            {
                id: 't1',
                claimType: 'استحصال دين مالي',
                executionTrashDeletedAt: '2026-01-01T00:00:00.000Z',
            },
        ] as LooseArchiveFile[];

        expect(getExecutionArchiveBasePool(files, 'active')).toHaveLength(1);
        expect(getExecutionArchiveBasePool(files, 'archived')).toHaveLength(1);
        expect(getExecutionArchiveBasePool(files, 'trash')).toHaveLength(1);
    });

    it('filterExecutionArchiveFiles applies lifecycle, jurisdiction, perspective, and search', () => {
        const files = [
            {
                id: 'active-civil',
                fileNumber: 'EX-100',
                claimType: 'استحصال دين مالي',
                creditors: [{ name: 'أحمد الدائن', isClient: true }],
                debtors: [{ name: 'سامي المدين' }],
            },
            {
                id: 'trash-civil',
                fileNumber: 'EX-200',
                claimType: 'استحصال دين مالي',
                executionTrashDeletedAt: '2026-01-01T00:00:00.000Z',
                creditors: [{ name: 'دائن آخر' }],
                debtors: [{ name: 'مدين آخر' }],
            },
            {
                id: 'active-sharia',
                claimType: 'مشاهدة',
                classification: 'أحوال شخصية',
            },
        ] as LooseArchiveFile[];

        expect(
            filterExecutionArchiveFiles(files, { mode: 'active', jurisdiction: 'civil' })
        ).toHaveLength(1);
        expect(
            filterExecutionArchiveFiles(files, { mode: 'trash', jurisdiction: 'all' })
        ).toHaveLength(1);
        expect(
            filterExecutionArchiveFiles(files, {
                mode: 'active',
                jurisdiction: 'all',
                searchQuery: 'EX-100',
            })
        ).toHaveLength(1);
        expect(
            filterExecutionArchiveFiles(files, {
                mode: 'active',
                jurisdiction: 'all',
                searchQuery: 'أحمد',
            })
        ).toHaveLength(1);
    });

    it('matchesExecutionArchiveSearch matches creditor and file number', () => {
        const file = {
            id: 'search-1',
            fileNumber: 'EX-555',
            claimType: 'استحصال دين مالي',
            creditors: [{ name: 'محمد علي', isClient: true }],
            debtors: [{ name: 'خالد' }],
        } as LooseArchiveFile;

        expect(matchesExecutionArchiveSearch(file, '')).toBe(true);
        expect(matchesExecutionArchiveSearch(file, 'ex-555')).toBe(true);
        expect(matchesExecutionArchiveSearch(file, 'محمد')).toBe(true);
        expect(matchesExecutionArchiveSearch(file, 'غير موجود')).toBe(false);
    });
});
