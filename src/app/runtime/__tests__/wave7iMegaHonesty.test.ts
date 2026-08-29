import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const cs = path.join(root, 'src/app/components/lawyer/criminal-system');

describe('wave7i mega honesty', () => {
    it('lawyerRequest يركّب detention + judicial lifecycle + crud/create/trash', () => {
        const t = fs.readFileSync(path.join(cs, 'criminalStoreLawyerRequestActions.ts'), 'utf8');
        expect(t).toContain('createCriminalDetentionDecisionActions');
        expect(t).toContain('createCriminalJudicialDecisionLifecycleActions');
        expect(t).toContain('createCriminalLawyerRequestCrudActions');
        expect(t).toContain('createCriminalLawyerRequestCreateActions');
        expect(t).toContain('createCriminalLawyerRequestTrashActions');
        expect(t).not.toContain('extendDetentionOnDecision:');
        expect(t).not.toContain('fileJudicialDecisionAppeal:');
        expect(t.trimEnd().split(/\r?\n/).length).toBeLessThanOrEqual(80);
        for (const slice of [
            'criminalStoreDetentionDecisionActions.ts',
            'criminalStoreJudicialDecisionLifecycleActions.ts',
            'criminalStoreLawyerRequestCrudActions.ts',
            'criminalStoreLawyerRequestCreateActions.ts',
            'criminalStoreLawyerRequestTrashActions.ts',
            'criminalStoreLawyerRequestCreatePayload.ts',
            'criminalStoreLawyerRequestAssetSeizureApply.ts',
        ]) {
            expect(fs.existsSync(path.join(cs, slice))).toBe(true);
        }
    });

    it('sessionDraft يركّب complainant + defendant', () => {
        const t = fs.readFileSync(path.join(cs, 'criminalStoreSessionDraftActions.ts'), 'utf8');
        expect(t).toContain('createCriminalSessionDraftComplainantActions');
        expect(t).toContain('createCriminalSessionDraftDefendantActions');
        expect(t).not.toContain('addComplainant:');
        expect(t).not.toContain('addDefendant:');
        expect(t.split(/\r?\n/).length).toBeLessThan(250);
    });

    it('cap bake report exists and passed', () => {
        const report = path.join(root, 'perf-reports', 'wave6-cap-section-bake.json');
        expect(fs.existsSync(report)).toBe(true);
        const j = JSON.parse(fs.readFileSync(report, 'utf8')) as {
            ok?: boolean;
            sectionBakeCdp?: boolean;
            biometricProbe?: { hasBiometricPlugin?: boolean };
        };
        expect(j.ok).toBe(true);
        expect(j.sectionBakeCdp).toBe(true);
        expect(j.biometricProbe?.hasBiometricPlugin).toBe(true);
    });
});
