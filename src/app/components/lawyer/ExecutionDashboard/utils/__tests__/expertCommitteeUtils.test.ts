import { describe, expect, it } from 'vitest';
import {
    buildExpertObjectionEntityPatch,
    nextExpertCommitteeSizeAfterReportObjection,
    normalizeOddExpertCount,
    readExpertCommitteeSize,
} from '../expertCommitteeUtils';

describe('expertCommitteeUtils', () => {
    it('normalizes to odd counts', () => {
        expect(normalizeOddExpertCount(1)).toBe(1);
        expect(normalizeOddExpertCount(2)).toBe(3);
        expect(normalizeOddExpertCount(3)).toBe(3);
        expect(normalizeOddExpertCount(4)).toBe(5);
    });

    it('progresses 1→3→5 on report objection', () => {
        expect(nextExpertCommitteeSizeAfterReportObjection(1)).toBe(3);
        expect(nextExpertCommitteeSizeAfterReportObjection(3)).toBe(5);
        expect(nextExpertCommitteeSizeAfterReportObjection(5)).toBe(7);
    });

    it('report objection increases size; expert objection keeps size', () => {
        const entity = { expertCommitteeSize: 1, expertNames: ['أ'] };
        const reportPatch = buildExpertObjectionEntityPatch(entity, 'report');
        expect(reportPatch.expertCommitteeSize).toBe(3);
        expect(reportPatch.status).toBe('estimation_objected');

        const afterReport = { expertCommitteeSize: 3, expertNames: [] };
        const expertsPatch = buildExpertObjectionEntityPatch(afterReport, 'experts');
        expect(expertsPatch.expertCommitteeSize).toBe(3);

        const reportAgain = buildExpertObjectionEntityPatch(afterReport, 'report');
        expect(reportAgain.expertCommitteeSize).toBe(5);
    });

    it('reads size from names when field missing', () => {
        expect(readExpertCommitteeSize({ expertNames: ['a', 'b'] })).toBe(3);
        expect(readExpertCommitteeSize({})).toBe(1);
    });
});
