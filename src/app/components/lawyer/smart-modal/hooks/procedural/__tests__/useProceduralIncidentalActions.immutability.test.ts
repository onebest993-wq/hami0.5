import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const proceduralDir = path.join(
    process.cwd(),
    'src/app/components/lawyer/smart-modal/hooks/procedural',
);

const clusterFiles = [
    'useProceduralIncidentalActions.ts',
    'createProceduralIncidentalCaseHandlers.ts',
    'createProceduralIncidentalJurisdictionHandlers.ts',
    'createProceduralIncidentalLinkHandlers.ts',
];

describe('useProceduralIncidentalActions immutability (A5)', () => {
    it('uses replaceStageAt for stage updates — no [...stages] + index assign', () => {
        const sources = clusterFiles.map((name) =>
            fs.readFileSync(path.join(proceduralDir, name), 'utf8'),
        );
        const combined = sources.join('\n');

        expect(combined).toContain("import { replaceStageAt } from '../../smartFile/stageImmutable'");
        expect(combined).toContain('replaceStageAt(');
        expect(combined).not.toMatch(/const updatedStages = \[\.\.\.stages\]/);
        expect(combined).not.toMatch(/const updatedStages = \[\.\.\.prevStages\]/);
        expect(combined).not.toMatch(/updatedStages\[activeStageIndex\]\s*=/);
    });
});
