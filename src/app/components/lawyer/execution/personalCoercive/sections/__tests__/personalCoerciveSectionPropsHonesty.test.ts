import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SECTIONS = path.resolve(__dirname, '..');
const BAG = path.join(SECTIONS, 'personalCoerciveSectionBag.ts');

const TARGETS = [
    'TravelBanSection.tsx',
    'ForcedBringSection.tsx',
    'ExecutiveDetentionJudgeSection.tsx',
    'InvestigationCourtSection.tsx',
    'DossierPresentationSection.tsx',
    'GuarantorFollowupStrip.tsx',
];

function countPropAny(src: string): number {
    // Match `name: any` / `name?: any` in exported props bags (not JSX).
    const matches = src.match(/^\s*\w+\??:\s*any\b/gm);
    return matches?.length ?? 0;
}

describe('personalCoercive section props honesty', () => {
    it('exposes a shared panel bag + Pick helper', () => {
        expect(fs.existsSync(BAG)).toBe(true);
        const src = fs.readFileSync(BAG, 'utf8');
        expect(src).toContain('export type PersonalCoerciveSectionBag');
        expect(src).toContain('export type PickPersonalCoerciveSectionProps');
        expect(src).toContain('usePersonalCoercivePanelModel');
    });

    it('all personalCoercive sections use Pick bag and zero prop-level any', () => {
        for (const name of TARGETS) {
            const src = fs.readFileSync(path.join(SECTIONS, name), 'utf8');
            expect(src, name).toContain('PickPersonalCoerciveSectionProps');
            expect(src, name).toContain('personalCoerciveSectionBag');
            expect(countPropAny(src), `${name} prop any`).toBe(0);
        }
    });
});
