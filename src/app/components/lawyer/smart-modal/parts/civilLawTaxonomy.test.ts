import { describe, expect, it } from 'vitest';
import {
    articleMatchesCivilLawTaxonomy,
    articleMatchesTaxonomyNode,
    getCivilLawTaxonomy,
} from './civilLawTaxonomy';

describe('civilLawTaxonomy', () => {
    it('defines five civil procedure sections without overlapping article ownership at section level', () => {
        const sections = getCivilLawTaxonomy('civil_procedure').sections;
        expect(sections).toHaveLength(5);
        expect(sections[0]?.from).toBe(1);
        expect(sections[2]?.from).toBe(141);
        expect(sections[4]?.to).toBe(325);
    });

    it('excludes repealed article 9 from its node but keeps neighbors', () => {
        const node = getCivilLawTaxonomy('civil_procedure').sections[0]?.branches[0]?.nodes[2];
        expect(node?.exclude).toContain(9);
        expect(articleMatchesTaxonomyNode('8', node!)).toBe(true);
        expect(articleMatchesTaxonomyNode('9', node!)).toBe(false);
        expect(articleMatchesTaxonomyNode('10', node!)).toBe(true);
    });

    it('filters by section then branch then node without cross-branch leakage', () => {
        expect(
            articleMatchesCivilLawTaxonomy({
                articleNumber: '15',
                codeType: 'civil_procedure',
                sectionId: 'civ-s1',
                branchId: 'civ-s1-b2',
                nodeId: null,
            }),
        ).toBe(true);
        expect(
            articleMatchesCivilLawTaxonomy({
                articleNumber: '50',
                codeType: 'civil_procedure',
                sectionId: 'civ-s1',
                branchId: 'civ-s1-b2',
                nodeId: null,
            }),
        ).toBe(false);
        expect(
            articleMatchesCivilLawTaxonomy({
                articleNumber: '100',
                codeType: 'civil_procedure',
                sectionId: 'civ-s3',
                branchId: null,
                nodeId: null,
            }),
        ).toBe(false);
    });

    it('maps evidence law into three top-level sections', () => {
        expect(getCivilLawTaxonomy('evidence').sections).toHaveLength(3);
    });
});
