import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, normalize, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const SRC = resolve(root, 'src');

const FROM_RE =
    /(?:^|\n)(?:export\s+)?import\s+(?!type\s)(?:[\s\S]*?)\sfrom\s+['"]([^'"]+)['"]/g;

const FORBIDDEN = [
    'components/ProfileContent.tsx',
    'components/ProfileSettingsSheetHost.tsx',
    'components/ProfilePageAccessBlocked.tsx',
    'components/ProfileSettingsSheet.tsx',
    'hooks/useRoyalLawyerProfile.ts',
    'hooks/useProfilePageAccess.ts',
    'hooks/useAccreditedLawyerMark.ts',
    'utils/lazyComponents.tsx',
    'runtime/profileSettingsSheetLoader.ts',
    'RoyalLawyerProfile/index.tsx',
];

function resolveSpecifier(fromFile: string, spec: string): string | null {
    if (spec.endsWith('.css')) return null;
    if (!(spec.startsWith('.') || spec.startsWith('@/'))) return null;
    const base = spec.startsWith('@/')
        ? resolve(SRC, spec.slice(2))
        : resolve(dirname(fromFile), spec);
    const candidates = [
        base,
        `${base}.ts`,
        `${base}.tsx`,
        join(base, 'index.ts'),
        join(base, 'index.tsx'),
    ];
    for (const candidate of candidates) {
        if (!existsSync(candidate)) continue;
        try {
            if (statSync(candidate).isFile()) return normalize(candidate);
        } catch {
            continue;
        }
    }
    return null;
}

function staticImportsOf(file: string): string[] {
    const src = readFileSync(file, 'utf8');
    const specs: string[] = [];
    FROM_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = FROM_RE.exec(src))) {
        specs.push(match[1]!);
    }
    return specs;
}

function walkStaticGraph(entryRel: string): string[] {
    const entry = resolve(root, entryRel);
    const seen = new Set<string>();
    const stack = [entry];
    while (stack.length) {
        const cur = stack.pop()!;
        if (seen.has(cur)) continue;
        seen.add(cur);
        if (!cur.replace(/\\/g, '/').includes('/src/')) continue;
        for (const spec of staticImportsOf(cur)) {
            const next = resolveSpecifier(cur, spec);
            if (next) stack.push(next);
        }
    }
    return [...seen].map((file) => relative(root, file).replace(/\\/g, '/'));
}

describe('profile open first-page static stem graph', () => {
    it('غطاء الفتح لا يصل ثابتاً إلى Royal/الاستوديو/برميل lazyComponents', () => {
        const graph = walkStaticGraph(
            'src/app/components/lawyer/dashboard/profile/ProfileOpenFirstPage.tsx',
        );

        expect(graph.some((p) => p.endsWith('ProfileFirstPaintTree.tsx'))).toBe(true);
        expect(graph.some((p) => p.endsWith('ProfilePageSurfaceFrame.tsx'))).toBe(true);
        expect(graph.some((p) => p.endsWith('ProfileContentBodySections.tsx'))).toBe(true);
        expect(graph.some((p) => p.endsWith('lazyComponentsIntent.ts'))).toBe(true);

        const hits = graph.filter((p) => FORBIDDEN.some((tail) => p.replace(/\\/g, '/').endsWith(tail)));
        expect(hits).toEqual([]);
    });
});
