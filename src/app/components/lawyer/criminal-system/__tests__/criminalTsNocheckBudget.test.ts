import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

const criminalRoot = path.join(process.cwd(), 'src/app/components/lawyer/criminal-system');

describe('criminal section @ts-nocheck budget', () => {
    it('has zero production files still using @ts-nocheck', () => {
        const files = globSync('**/*.{ts,tsx}', {
            cwd: criminalRoot,
            absolute: true,
            ignore: ['**/__tests__/**', '**/*.test.ts', '**/*.test.tsx'],
        });
        const withNocheck = files.filter((file) => {
            const head = fs.readFileSync(file, 'utf8').slice(0, 80);
            return head.includes('@ts-nocheck');
        });
        expect(withNocheck).toEqual([]);
    });
});
