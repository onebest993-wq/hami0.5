import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const modalPath = path.join(
    process.cwd(),
    'src/app/components/lawyer/smart-modal/modals/flow-modals/AddIncidentalCaseModal.tsx',
);

describe('AddIncidentalCaseModal open-edge reset (A1)', () => {
    it('resets form only on open edge via wasOpenRef — not on isAppeal/editData churn while open', () => {
        const src = fs.readFileSync(modalPath, 'utf8');
        expect(src).toContain('wasOpenRef');
        expect(src).toContain('if (wasOpenRef.current) return');
        expect(src).toContain('wasOpenRef.current = true');
        expect(src).toContain('wasOpenRef.current = false');
        // يجب ألا يُعاد التهيئة بمجرد isOpen دون حافة الفتح
        expect(src).not.toMatch(/if\s*\(\s*isOpen\s*\)\s*\{\s*setSpawnConfirm/);
    });
});
