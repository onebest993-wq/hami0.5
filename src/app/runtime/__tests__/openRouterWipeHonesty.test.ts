import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

const FORBIDDEN = [
    /OPENROUTER/,
    /openrouter\.ai/,
    /legal-analysis/,
    /execution-copilot/,
    /meta-llama/,
    /qwen\/qwen/,
    /arcee-ai/,
    /VITE_OPENAI_API_KEY/,
    /OPENAI_API_KEY/,
    /VITE_PINECONE/,
    /useExecutionAICopilot/,
    /ExecutionAICopilot/,
    /ai_copilot_/,
    /sk-or-v1/,
    /gpt-4o/i,
    /pinecone/i,
    /buildZeroLawEmbedding/,
    /query_embedding/,
    /vector\(768\)/,
    /text-embedding/,
];

const SKIP_DIR = new Set(['node_modules', '.git', 'dist', 'coverage', 'docs']);
const SKIP_FILE = new Set([
    'openRouterWipeHonesty.test.ts',
    'geminiWipeHonesty.test.ts',
]);

function walk(dir: string, acc: string[]): void {
    if (!existsSync(dir)) return;
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
        if (ent.name.startsWith('.') && ent.name !== '.env.example') continue;
        const full = join(dir, ent.name);
        if (ent.isDirectory()) {
            if (SKIP_DIR.has(ent.name)) continue;
            walk(full, acc);
            continue;
        }
        if (!/\.(ts|tsx|mjs|js|json|toml|example)$/.test(ent.name)) continue;
        if (SKIP_FILE.has(ent.name)) continue;
        acc.push(full);
    }
}

describe('openrouter / remote LLM wipe honesty', () => {
    it('لا مفاتيح ولا مسارات ولا نماذج LLM خارجية في المسارات الحية', () => {
        const files: string[] = [];
        walk(join(root, 'src'), files);
        walk(join(root, 'supabase', 'functions'), files);
        walk(join(root, 'supabase', 'migrations'), files);
        walk(join(root, 'scripts'), files);
        walk(join(root, 'api'), files);
        walk(join(root, '.audit'), files);
        files.push(
            join(root, 'package.json'),
            join(root, '.env.example'),
            join(root, '.env.production.example'),
        );

        expect(existsSync(join(root, 'code-quality-report.json'))).toBe(false);

        for (const file of files) {
            if (!existsSync(file)) continue;
            const text = readFileSync(file, 'utf8');
            for (const pattern of FORBIDDEN) {
                expect(text, `${file} ← ${pattern}`).not.toMatch(pattern);
            }
        }

        for (const envRel of ['.env', join('hami', '.env'), '.env.local', '.env.development', '.env.production.local']) {
            const envPath = join(root, envRel);
            if (!existsSync(envPath)) continue;
            const text = readFileSync(envPath, 'utf8');
            expect(text, envRel).not.toMatch(/OPENROUTER/);
            expect(text, envRel).not.toMatch(/OPENAI_API_KEY/);
            expect(text, envRel).not.toMatch(/PINECONE/);
            expect(text, envRel).not.toMatch(/sk-or-v1/);
        }

        expect(existsSync(join(root, 'src', 'app', 'api', 'legal-analysis'))).toBe(false);
        expect(existsSync(join(root, 'supabase', 'functions', 'execution-copilot'))).toBe(false);
        expect(existsSync(join(root, 'src', 'app', 'utils', 'executionCopilot.ts'))).toBe(false);
        expect(existsSync(join(root, 'tmp-ed-units.json'))).toBe(false);
        expect(existsSync(join(root, 'tmp-ed-units2.json'))).toBe(false);
        expect(
            existsSync(
                join(
                    root,
                    'src',
                    'app',
                    'components',
                    'lawyer',
                    'ExecutionDashboard',
                    'hooks',
                    'useExecutionAICopilot.ts',
                ),
            ),
        ).toBe(false);
    });
});
