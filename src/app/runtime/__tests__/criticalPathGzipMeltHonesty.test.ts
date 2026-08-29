import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('critical path gzip melt (home-paint / supabase off entry)', () => {
    it('wifeFetchGuard لا يستورد SecureAPIClient ثابتاً — يمنع vendor-supabase عبر apply', () => {
        const src = fs.readFileSync(path.join(root, 'src/app/security/wifeFetchGuard.ts'), 'utf8');
        expect(src).not.toMatch(/from ['"]@\/app\/services\/SecureAPIClient['"]/);
        expect(src).toContain("import('@/app/services/SecureAPIClient')");
    });

    it('vite يثبّت localOnlyUrlPolicy في boot-local-only خارج home-paint', () => {
        const vite = fs.readFileSync(path.join(root, 'vite.config.mts'), 'utf8');
        expect(vite).toContain("return 'boot-local-only'");
        expect(vite).toContain('/src/app/services/settings/localOnlyUrlPolicy');
        expect(vite).toContain('applyLawyerSettingsFactoryReset');
        expect(vite).toContain('apply\\.(ts|tsx|js|jsx)$');
    });

    it('index لا يستورد apply ولا supabase-client ثابتاً', () => {
        const index = fs.readFileSync(path.join(root, 'src/index.tsx'), 'utf8');
        expect(index).toContain('armLocalOnlyIsolationAtBoot');
        expect(index).not.toContain("from '@/app/services/settings/apply'");
        expect(index).not.toContain("from '@/app/lib/supabase-client'");
        expect(index).not.toContain("from '@/app/services/SecureAPIClient'");
    });
});
