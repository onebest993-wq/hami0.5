import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const COMPONENTS_DIR = path.resolve(__dirname, '../components');
const HOST = path.resolve(__dirname, '../../ExecutionCreationView.tsx');

function read(file: string): string {
    return fs.readFileSync(path.join(COMPONENTS_DIR, file), 'utf8');
}

describe('Execution creation visible field wiring (O25)', () => {
    it('host view-model exposes judgment and eviction setters', () => {
        const host = fs.readFileSync(HOST, 'utf8');
        expect(host).toContain('setJudgmentDate');
        expect(host).toContain('setEvictionPremisesUse');
        expect(host).toContain('judgmentDate, setJudgmentDate');
        expect(host).toContain('evictionPremisesUse, setEvictionPremisesUse');
    });

    it('court judgment identity binds تاريخ الحكم to setJudgmentDate', () => {
        const identity = read('InstrumentTypeIdentityFields.tsx');
        expect(identity).toContain('data-testid="execution-creation-judgment-date"');
        expect(identity).toContain('onJudgmentDateChange');
        expect(identity).toContain("aria-label=\"تاريخ الحكم\"");
        expect(identity).toContain("onChange={(e) => onJudgmentDateChange?.(e.target.value)}");
    });

    it('eviction section binds premises use to commercial/residential setters', () => {
        const eviction = read('EvictionSection.tsx');
        expect(eviction).toContain('data-testid="execution-creation-eviction-premises-use"');
        expect(eviction).toContain("onPremisesUseChange('residential')");
        expect(eviction).toContain("onPremisesUseChange('commercial')");
        expect(eviction).toContain('سكني');
        expect(eviction).toContain('تجاري');
    });

    it('form body threads setters into instrument details', () => {
        const body = read('ExecutionCreationFormBody.tsx');
        // القسم صار lazy عبر lazyProps، فالربط بصيغة كائن لا سمة JSX
        expect(body).toMatch(/onJudgmentDateChange[:=]\s*\{?setJudgmentDate\}?/);
        expect(body).toMatch(
            /onEvictionPremisesUseChange[:=]\s*\{?setEvictionPremisesUse\}?/,
        );
    });
});
