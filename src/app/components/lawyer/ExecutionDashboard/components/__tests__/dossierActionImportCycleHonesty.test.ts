import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = path.join(
    process.cwd(),
    'src/app/components/lawyer/ExecutionDashboard/components',
);

function read(name: string): string {
    return fs.readFileSync(path.join(dir, name), 'utf8');
}

describe('DossierAction Modal↔Form import cycle honesty', () => {
    it('Form must not import Modal; Modal may import Form; both import types from DossierActionTypes', () => {
        const types = read('DossierActionTypes.ts');
        const form = read('DossierActionForm.tsx');
        const modal = read('DossierActionsModal.tsx');

        expect(types).toContain('export type DossierActionType');
        expect(types).toContain('export interface DossierActionPayload');

        const formHook = read('useDossierActionForm.ts');
        const formUi = read('DossierActionFormUi.tsx');
        expect(form).toMatch(/from\s+['"]\.\/useDossierActionForm['"]/);
        expect(form).toMatch(/from\s+['"]\.\/DossierActionFormUi['"]/);
        expect(formHook).toMatch(/from\s+['"]\.\/DossierActionTypes['"]/);
        expect(formUi).toMatch(/from\s+['"]\.\/DossierActionTypes['"]/);
        expect(form).not.toMatch(/from\s+['"]\.\/DossierActionsModal['"]/);
        expect(formHook).not.toMatch(/from\s+['"]\.\/DossierActionsModal['"]/);
        expect(formUi).not.toMatch(/from\s+['"]\.\/DossierActionsModal['"]/);

        expect(modal).toMatch(/from\s+['"]\.\/DossierActionTypes['"]/);
        expect(modal).toMatch(/from\s+['"]\.\/DossierActionForm['"]/);
    });
});
