import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const newCasePath = path.join(root, 'src/app/components/lawyer/criminal-system/CriminalNewCase.tsx');

describe('CriminalNewCase composition', () => {
    it('delegates form sections instead of duplicating inline JSX', () => {
        const source = fs.readFileSync(newCasePath, 'utf8');
        expect(source).toContain('ComplainantSection');
        expect(source).toContain('DefendantSection');
        expect(source).toContain('CaseInfoSection');
        expect(source).toContain('useCriminalNewCaseForm');
        expect(source).not.toContain('draft.complainants.map');
    });

    it('keeps CriminalNewCase shell under ~200 lines', () => {
        const lines = fs.readFileSync(newCasePath, 'utf8').split('\n').length;
        expect(lines).toBeLessThan(200);
    });
});
