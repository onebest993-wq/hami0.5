import { describe, expect, it, beforeAll } from 'vitest';
import {
    filterExecutionLawsByHierarchy,
    filterExecutionLawsByScope,
    ALL_EXECUTION_ARTICLES_SCOPE,
    resolveExecutionLawLeaf,
    type ExecutionLawArticle,
} from '../executionLaws';
import { loadExecutionLawSeedData } from '../executionLawsLoader';
import {
    EXECUTION_LAW_HIERARCHY,
    buildExecutionLawAdminBrowseFilters,
} from '../executionLawHierarchy';

describe('executionLawHierarchy', () => {
    let executionLawData: ExecutionLawArticle[];

    beforeAll(async () => {
        executionLawData = await loadExecutionLawSeedData();
    });

    it('defines 6 task-oriented parent tabs', () => {
        expect(EXECUTION_LAW_HIERARCHY).toHaveLength(6);
        expect(EXECUTION_LAW_HIERARCHY[0].id).toBe('instruments_prelude');
        expect(EXECUTION_LAW_HIERARCHY[3].id).toBe('executive_seizure');
    });

    it('maps article 20 to voluntary execution notice', () => {
        const leaf = resolveExecutionLawLeaf(20);
        expect(leaf.id).toBe('voluntary_execution_notice');
        expect(leaf.parentId).toBe('instruments_prelude');
    });

    it('maps article 82 to salary garnishment under seizure tab', () => {
        const leaf = resolveExecutionLawLeaf(82);
        expect(leaf.id).toBe('salary_garnishment');
        expect(leaf.parentId).toBe('executive_seizure');
    });

    it('maps article 103 to adjudication delivery (eviction)', () => {
        const leaf = resolveExecutionLawLeaf(103);
        expect(leaf.id).toBe('adjudication_delivery');
        expect(leaf.parentId).toBe('auctions_eviction');
    });

    it('maps article 130 to closing provisions', () => {
        const leaf = resolveExecutionLawLeaf(130);
        expect(leaf.id).toBe('closing_provisions');
        expect(leaf.parentId).toBe('distribution_appeals');
    });

    it('filters all articles scope from first to last article', () => {
        const allArticles = filterExecutionLawsByScope(
            executionLawData,
            ALL_EXECUTION_ARTICLES_SCOPE,
            'all_in_parent',
            '',
        );
        expect(allArticles.length).toBe(130);
        expect(allArticles[0]?.number).toBe(1);
        expect(allArticles[allArticles.length - 1]?.number).toBe(130);
    });

    it('filters by parent and leaf without cross-tab bleed', () => {
        const parentOnly = filterExecutionLawsByHierarchy(
            executionLawData,
            'instruments_prelude',
            'all_in_parent',
            '',
        );
        expect(parentOnly.every((a) => a.parentId === 'instruments_prelude')).toBe(true);
        expect(parentOnly.some((a) => a.number === 1)).toBe(true);
        expect(parentOnly.some((a) => a.number === 40)).toBe(false);

        const leafOnly = filterExecutionLawsByHierarchy(
            executionLawData,
            'settlements_emergency',
            'bail_travel_ban',
            '',
        );
        expect(leafOnly.every((a) => a.number === 30)).toBe(true);
    });

    it('exports admin browse filters aligned with leaf taxonomy', () => {
        const filters = buildExecutionLawAdminBrowseFilters();
        expect(filters.length).toBe(
            EXECUTION_LAW_HIERARCHY.reduce((n, p) => n + p.children.length, 0),
        );
        expect(filters.some((f) => f.id === 'exec-movables_seizure' && f.from === 63 && f.to === 70)).toBe(
            true,
        );
    });

    it('covers all 130 articles in exactly one leaf range', () => {
        const covered = new Set<number>();
        for (const parent of EXECUTION_LAW_HIERARCHY) {
            for (const child of parent.children) {
                for (let n = child.articleFrom; n <= child.articleTo; n += 1) {
                    covered.add(n);
                }
            }
        }
        for (let n = 1; n <= 130; n += 1) {
            expect(covered.has(n), `article ${n} missing from taxonomy`).toBe(true);
        }
        expect(covered.size).toBe(130);
    });
});
