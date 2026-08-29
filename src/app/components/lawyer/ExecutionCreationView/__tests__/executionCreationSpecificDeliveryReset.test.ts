import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const CASCADE_HOOK = path.resolve(
    __dirname,
    '../hooks/useExecutionCreationClaimCascade.ts',
);
const MAIN_FILE = path.resolve(__dirname, '../../ExecutionCreationView.tsx');

describe('ExecutionCreationView specific delivery reset guard', () => {
    it('clears specificDeliveryItems via claim cascade hook, not undefined setter', () => {
        const mainFileSource = fs.readFileSync(MAIN_FILE, 'utf8');
        const cascadeSource = fs.readFileSync(CASCADE_HOOK, 'utf8');

        expect(mainFileSource).not.toContain('setSpecificDeliveryItemNature');
        expect(cascadeSource).toContain("value === 'تسليم شيء معين'");
        expect(cascadeSource).toContain('setSpecificDeliveryItems([])');
        expect(mainFileSource).toContain('useExecutionCreationClaimCascade');
    });
});
