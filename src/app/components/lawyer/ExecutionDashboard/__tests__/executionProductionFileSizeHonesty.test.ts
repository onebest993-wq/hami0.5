import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const LINE_LIMIT = 700;

/** Named exceptions with an honest reason — keep empty when none remain. */
const HONEST_EXCEPTIONS: ReadonlyArray<{ rel: string; reason: string }> = [];

const SCOPES = [
    'src/app/components/lawyer/ExecutionDashboard',
    'src/app/components/lawyer/execution',
] as const;

function lineCount(filePath: string): number {
    return fs.readFileSync(filePath, 'utf8').split(/\r?\n/).length;
}

function walkProductionTsFiles(absDir: string): string[] {
    const out: string[] = [];
    if (!fs.existsSync(absDir)) return out;
    const stack = [absDir];
    while (stack.length) {
        const dir = stack.pop()!;
        for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, ent.name);
            if (ent.isDirectory()) {
                if (ent.name === '__tests__' || ent.name === 'node_modules') continue;
                stack.push(full);
                continue;
            }
            if (!ent.isFile()) continue;
            if (!/\.(ts|tsx)$/.test(ent.name)) continue;
            if (/\.test\.(ts|tsx)$/.test(ent.name)) continue;
            out.push(full);
        }
    }
    return out;
}

describe('Execution production file size honesty', () => {
    it(`expects 0 production files >= ${LINE_LIMIT} under ExecutionDashboard + lawyer/execution (or documents named exceptions)`, () => {
        const root = process.cwd();
        const exceptionSet = new Set(
            HONEST_EXCEPTIONS.map((e) => path.normalize(e.rel).replace(/\\/g, '/')),
        );

        const oversized: Array<{ rel: string; lines: number }> = [];
        for (const scope of SCOPES) {
            const abs = path.join(root, scope);
            for (const file of walkProductionTsFiles(abs)) {
                const lines = lineCount(file);
                if (lines < LINE_LIMIT) continue;
                const rel = path.relative(root, file).replace(/\\/g, '/');
                if (exceptionSet.has(rel)) continue;
                oversized.push({ rel, lines });
            }
        }

        oversized.sort((a, b) => b.lines - a.lines || a.rel.localeCompare(b.rel));

        for (const ex of HONEST_EXCEPTIONS) {
            const abs = path.join(root, ex.rel);
            expect(fs.existsSync(abs), `exception file missing: ${ex.rel}`).toBe(true);
            expect(lineCount(abs), `exception no longer oversized: ${ex.rel}`).toBeGreaterThanOrEqual(
                LINE_LIMIT,
            );
            expect(String(ex.reason || '').trim().length, `exception needs reason: ${ex.rel}`).toBeGreaterThan(
                8,
            );
        }

        expect(
            oversized,
            oversized.length
                ? `production files still >= ${LINE_LIMIT}:\n${oversized
                      .map((f) => `  ${f.lines}\t${f.rel}`)
                      .join('\n')}`
                : undefined,
        ).toEqual([]);
    });
});
