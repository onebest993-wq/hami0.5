import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const iconsDir = join(root, 'src/app/components/ui/icons');

function src(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('lucide barrel split honesty', () => {
    it('lucideIcons أنواع فقط؛ كل أيقونة ملف مستقل بلا index', () => {
        const barrel = src('src/app/components/ui/lucideIcons.ts');
        expect(barrel).toContain('export type { LucideIcon, LucideProps }');
        expect(barrel).not.toMatch(/^export \{/m);
        expect(barrel).not.toContain("from 'lucide-react';\nexport type");
        expect(existsSync(join(iconsDir, 'index.ts'))).toBe(false);
        expect(existsSync(join(iconsDir, 'index.tsx'))).toBe(false);
        const modules = readdirSync(iconsDir).filter((f) => /^[A-Z][A-Za-z0-9]*\.ts$/.test(f));
        expect(modules.length).toBeGreaterThan(80);
        const sample = src('src/app/components/ui/icons/X.ts');
        expect(sample).toMatch(
            /export \{ default as X \} from 'lucide-react\/dist\/esm\/icons\/x\.js';/,
        );
        expect(src('src/app/components/lawyer/CommunityScreen/questionCardMoreMenuItems.ts')).toContain(
            "from '@/app/components/ui/icons/BellRing'",
        );
        expect(
            src('src/app/components/lawyer/LawyerHomeHubCard/components/HomeHubTabMoreTrigger.tsx'),
        ).toContain("from '@/app/components/ui/icons/ChevronDown'");
    });

    it('src بلا برميل lucide-react للقيم؛ stem/header/lock بلا lucideIcons', () => {
        const leaks: string[] = [];
        const walk = (dir: string) => {
            for (const ent of readdirSync(dir, { withFileTypes: true })) {
                const p = join(dir, ent.name);
                if (ent.isDirectory()) {
                    if (['node_modules', 'dist', 'icons'].includes(ent.name)) continue;
                    walk(p);
                    continue;
                }
                if (!/\.(tsx?|jsx?)$/.test(ent.name)) continue;
                if (p.endsWith(`${join('ui', 'lucideIcons.ts')}`)) continue;
                const text = readFileSync(p, 'utf8');
                if (/import\s+(?!type\s)\{[^}]*\}\s*from\s*['"]lucide-react['"]/.test(text)) {
                    leaks.push(p);
                }
                if (/import\s+(?!type\s)\{[^}]*\}\s*from\s*['"]@\/app\/components\/ui\/lucideIcons['"]/.test(text)) {
                    leaks.push(p);
                }
            }
        };
        walk(join(root, 'src'));
        expect(leaks).toEqual([]);

        for (const rel of [
            'src/app/components/lawyer/LawyerDashboard.tsx',
            'src/app/components/lawyer/LawyerDashboardParts/components/Header.tsx',
            'src/app/components/lawyer/AppLockOverlay.tsx',
            'src/app/bootstrap/lawyerAuth/AuthPasswordField.tsx',
        ]) {
            const text = src(rel);
            expect(text, rel).not.toContain('lucideIcons');
            expect(text, rel).not.toContain("from 'lucide-react'");
            expect(text, rel).not.toContain('components/ui/icons/');
        }
    });

    it('vite لا يدمج كل lucide في chunk واحد ولا يعيد برميل lawyer-lucide-icons', () => {
        const vite = src('vite.config.mts');
        expect(vite).toContain('/lucide-react/dist/esm/createLucideIcon');
        expect(vite).toContain('/lucide-react/dist/esm/defaultAttributes');
        expect(vite).toContain("return 'vendor-lucide'");
        expect(vite).not.toContain("return 'lawyer-lucide-icons'");
        expect(vite).not.toMatch(/normalized\.includes\('\/lucide-react\/'\)/);
        expect(src('scripts/write-lucide-icon-modules.mjs')).toContain('writeIconModules');
        expect(src('scripts/migrate-lucide-imports.mjs')).toContain('icons/${exported}');
    });
});
