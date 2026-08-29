import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const roots = [
    path.join(process.cwd(), 'src/app/components/lawyer/ExecutionDashboard'),
    path.join(process.cwd(), 'src/app/components/lawyer/execution'),
];

function walk(dir: string, acc: string[] = []): string[] {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, acc);
        else if (/\.(ts|tsx)$/.test(entry.name)) acc.push(full);
    }
    return acc;
}

function hasNocheck(file: string): boolean {
    return /^\/\/ @ts-nocheck\r?\n/.test(fs.readFileSync(file, 'utf8'));
}

describe('execution nocheck debt honesty', () => {
    it('لا يبقى أي @ts-nocheck في جذور ExecutionDashboard و execution', () => {
        const remaining = roots
            .flatMap((r) => walk(r))
            .filter(hasNocheck)
            .map((f) => path.relative(process.cwd(), f).replace(/\\/g, '/'))
            .sort();
        expect(remaining).toEqual([]);
        expect(remaining.length).toBe(0);
    });
});
