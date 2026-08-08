import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
    collectExecutionViewScopeBindings,
    collectPhoneBodyScopeWiringKeys,
    isPassthroughScopeKey,
    loadExecutionCoreScopeContext,
    validateScopeKeys,
} from '../../../../../../../scripts/phone-body-scope-utils.mjs';

const { core: corePathText } = loadExecutionCoreScopeContext(process.cwd());
const keysPath = path.join(process.cwd(), 'scripts/_phone-body-keys.json');
const phoneBodyPath = path.join(
    process.cwd(),
    'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardPhoneBody.tsx',
);
const pickBagPath = path.join(
    process.cwd(),
    'src/app/components/lawyer/ExecutionDashboard/hooks/pickExecutionPhoneBodyScopeReadBag.ts',
);
const orchestratorPath = path.join(
    process.cwd(),
    'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardPhoneBodyScope.ts',
);

describe('ExecutionDashboard phone-body scope', () => {
    it('does not treat destructuring source keys or TS noise as bindings', () => {
        const bindings = collectExecutionViewScopeBindings(corePathText);
        expect(bindings.has('district')).toBe(false);
        expect(bindings.has('type')).toBe(false);
        expect(bindings.has('key')).toBe(false);
    });

    it('scope keys align with phone body scope wiring', () => {
        const keys = JSON.parse(fs.readFileSync(keysPath, 'utf8'));
        expect(validateScopeKeys(corePathText, keys)).toEqual([]);
        const body = fs.readFileSync(phoneBodyPath, 'utf8');
        const pickBag = fs.readFileSync(pickBagPath, 'utf8');
        const orchestrator = fs.readFileSync(orchestratorPath, 'utf8');
        const wired = collectPhoneBodyScopeWiringKeys({ body, pickBag, orchestrator });
        const missing = keys.filter((k: string) => {
            if (isPassthroughScopeKey(k)) return false;
            if (wired.has(k)) return false;
            if (wired.has('__full_props_passthrough__')) return false;
            return true;
        });
        expect(missing).toEqual([]);
    });

    it('includes dossier lifecycle bindings', () => {
        const keys = JSON.parse(fs.readFileSync(keysPath, 'utf8'));
        expect(keys).toContain('dossierStatusDraft');
        expect(keys).toContain('monthlyAlimony');
        expect(keys).toContain('setDossierLifecyclePanelOpen');
    });
});
