import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
    collectExecutionViewScopeBindings,
    validateScopeKeys,
} from '../../../../../../../scripts/phone-body-scope-utils.mjs';

const corePath = path.join(
    process.cwd(),
    'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts',
);
const keysPath = path.join(process.cwd(), 'scripts/_phone-body-keys.json');

describe('ExecutionDashboard phone-body scope', () => {
    it('does not treat destructuring source keys or TS noise as bindings', () => {
        const view = fs.readFileSync(corePath, 'utf8');
        const bindings = collectExecutionViewScopeBindings(view);
        expect(bindings.has('district')).toBe(false);
        expect(bindings.has('type')).toBe(false);
        expect(bindings.has('key')).toBe(false);
    });

    it('scope keys align with real hook bindings', () => {
        const view = fs.readFileSync(corePath, 'utf8');
        const keys = JSON.parse(fs.readFileSync(keysPath, 'utf8'));
        expect(validateScopeKeys(view, keys)).toEqual([]);
    });

    it('includes dossier lifecycle bindings', () => {
        const keys = JSON.parse(fs.readFileSync(keysPath, 'utf8'));
        expect(keys).toContain('dossierStatusDraft');
        expect(keys).toContain('monthlyAlimony');
        expect(keys).toContain('setDossierLifecyclePanelOpen');
    });
});
