import { describe, expect, it } from 'vitest';
import {
    articleMatchesPersonalStatusLawTaxonomy,
    articleMatchesPersonalStatusTaxonomyNode,
    getPersonalStatusLawTaxonomy,
} from './personalStatusLawTaxonomy';

describe('personalStatusLawTaxonomy', () => {
    it('defines five sections for law 188', () => {
        const sections = getPersonalStatusLawTaxonomy('personal_status_188')?.sections;
        expect(sections).toHaveLength(5);
        expect(sections?.[0]?.from).toBe(1);
        expect(sections?.[4]?.to).toBe(93);
    });

    it('filters marriage articles within first section branch', () => {
        expect(
            articleMatchesPersonalStatusLawTaxonomy({
                articleNumber: '5',
                codeType: 'personal_status_188',
                sectionId: 'ps188-s1',
                branchId: 'ps188-s1-b2',
                nodeId: null,
            }),
        ).toBe(true);
        expect(
            articleMatchesPersonalStatusLawTaxonomy({
                articleNumber: '25',
                codeType: 'personal_status_188',
                sectionId: 'ps188-s1',
                branchId: 'ps188-s1-b2',
                nodeId: null,
            }),
        ).toBe(false);
    });

    it('maps node ranges for inheritance section', () => {
        const node = getPersonalStatusLawTaxonomy('personal_status_188')?.sections[4]?.branches[1]
            ?.nodes[2];
        expect(node?.from).toBe(89);
        expect(node?.to).toBe(91);
        expect(articleMatchesPersonalStatusTaxonomyNode('90', node!)).toBe(true);
    });

    it('returns true for all articles when no taxonomy exists', () => {
        expect(
            articleMatchesPersonalStatusLawTaxonomy({
                articleNumber: '1',
                codeType: 'personal_status_supplementary',
                sectionId: null,
                branchId: null,
                nodeId: null,
            }),
        ).toBe(true);
    });

    it('defines seven sections for jaafari code', () => {
        const sections = getPersonalStatusLawTaxonomy('jaafari_code')?.sections;
        expect(sections).toHaveLength(7);
        expect(sections?.[0]?.from).toBe(1);
        expect(sections?.[6]?.to).toBe(337);
    });

    it('filters jaafari divorce articles within section 4 branch', () => {
        expect(
            articleMatchesPersonalStatusLawTaxonomy({
                articleNumber: '120',
                codeType: 'jaafari_code',
                sectionId: 'psj-s4',
                branchId: 'psj-s4-b1',
                nodeId: null,
            }),
        ).toBe(true);
        expect(
            articleMatchesPersonalStatusLawTaxonomy({
                articleNumber: '200',
                codeType: 'jaafari_code',
                sectionId: 'psj-s4',
                branchId: 'psj-s4-b1',
                nodeId: null,
            }),
        ).toBe(false);
    });

    it('handles split article ranges with exclude for jaafari defects branch', () => {
        const node = getPersonalStatusLawTaxonomy('jaafari_code')?.sections[1]?.branches[4]?.nodes[0];
        expect(articleMatchesPersonalStatusTaxonomyNode('57', node!)).toBe(true);
        expect(articleMatchesPersonalStatusTaxonomyNode('63', node!)).toBe(true);
        expect(articleMatchesPersonalStatusTaxonomyNode('59', node!)).toBe(false);
    });
});
