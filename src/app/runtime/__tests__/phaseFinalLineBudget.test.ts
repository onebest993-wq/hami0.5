/**
 * Durable full-src ≤1000 line-budget guard — includes tests and __tests__ trees.
 */
import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const SRC_ROOT = path.join(root, 'src');
const BUDGET = 1000;
const TS_EXT = /\.(ts|tsx)$/;

function walkTsFiles(dir: string, out: string[]): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const abs = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walkTsFiles(abs, out);
        } else if (TS_EXT.test(entry.name)) {
            out.push(abs);
        }
    }
}

function lineCount(absPath: string): number {
    return fs.readFileSync(absPath, 'utf8').split(/\r?\n/).length;
}

function collectOverBudget(): Array<{ path: string; lines: number }> {
    const files: string[] = [];
    walkTsFiles(SRC_ROOT, files);
    return files
        .map((abs) => ({
            path: path.relative(root, abs).replace(/\\/g, '/'),
            lines: lineCount(abs),
        }))
        .filter(({ lines }) => lines > BUDGET)
        .sort((a, b) => b.lines - a.lines);
}

describe('phase-final line budget — full src ≤1000', () => {
    it('has no .ts/.tsx file under src/ exceeding 1000 lines', () => {
        const over = collectOverBudget();
        expect(
            over,
            over.length
                ? `Files over ${BUDGET} lines:\n${over.map((f) => `  ${f.path} (${f.lines})`).join('\n')}`
                : undefined,
        ).toEqual([]);
    });
});

describe('phase-9 close artifact', () => {
    it('exists and reports closed-honest with empty over1000 scan', () => {
        const closePath = path.join(root, '.cursor/phase-9-close.json');
        expect(fs.existsSync(closePath)).toBe(true);
        const close = JSON.parse(fs.readFileSync(closePath, 'utf8')) as {
            status: string;
            scan: { srcOver1000: unknown[] };
            verification: { tscApp: number };
        };
        expect(close.status).toBe('closed-honest');
        expect(close.scan.srcOver1000).toEqual([]);
        expect(close.verification.tscApp).toBe(0);
    });
});
