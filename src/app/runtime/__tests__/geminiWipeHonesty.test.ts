import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

const FORBIDDEN = [
    /GEMINI_API_KEY/,
    /GOOGLE_API_KEY/,
    /generativelanguage\.googleapis\.com/,
    /@google\/generative-ai/,
    /spark-text-audit/,
    /spark-vault-extract/,
    /gemini-chat/,
    /VITE_SPARK_TEXT_AUDIT_ENABLED/,
    /VITE_SPARK_VAULT_EXTRACT_ENABLED/,
    /google\/gemini/,
    /google\/gemma/,
];

const SKIP_DIR = new Set(['node_modules', '.git', 'dist', 'coverage', '.audit', 'docs']);

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
        if (ent.name === 'geminiWipeHonesty.test.ts') continue;
        acc.push(full);
    }
}

describe('gemini wipe honesty', () => {
    it('لا مفاتيح ولا دوال ولا نماذج Google Gemini في المسارات الحية', () => {
        const files: string[] = [];
        walk(join(root, 'src'), files);
        walk(join(root, 'supabase', 'functions'), files);
        walk(join(root, 'scripts'), files);
        files.push(join(root, 'package.json'), join(root, '.env.example'));

        for (const file of files) {
            if (!existsSync(file)) continue;
            const text = readFileSync(file, 'utf8');
            for (const pattern of FORBIDDEN) {
                expect(text, `${file} ← ${pattern}`).not.toMatch(pattern);
            }
        }

        expect(existsSync(join(root, 'supabase', 'functions', 'gemini-chat'))).toBe(false);
        expect(existsSync(join(root, 'supabase', 'functions', 'spark-text-audit'))).toBe(false);
        expect(existsSync(join(root, 'supabase', 'functions', 'spark-vault-extract'))).toBe(false);
        expect(existsSync(join(root, 'supabase', 'functions', 'analyze-case'))).toBe(false);
        expect(existsSync(join(root, 'supabase', 'functions', 'diagnostic-rag'))).toBe(false);
        expect(existsSync(join(root, 'supabase', 'functions', 'diagnostic-models'))).toBe(false);
        expect(existsSync(join(root, 'src', 'app', 'spark'))).toBe(false);
        expect(existsSync(join(root, 'scripts', 'spark-text-audit-probe.mjs'))).toBe(false);
    });
});
