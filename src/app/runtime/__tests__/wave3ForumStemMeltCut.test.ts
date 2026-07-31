import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('wave3 forum stem melt cut', () => {
    it('lazyComponents لا يستورد ForumApiService بشكل static', () => {
        const src = fs.readFileSync(path.join(root, 'src/app/utils/lazyComponents.tsx'), 'utf8');
        expect(src).not.toMatch(/import\s*\{[^}]*ForumApiService[^}]*\}\s*from\s*['"]@\/app\/services\/forumApiService['"]/);
        expect(src).toContain("import('@/app/services/forumApiService')");
    });

    it('useLawyerDashboardNavigation يستورد من lazyComponentsIntent لا البرميل الثقيل', () => {
        const src = fs.readFileSync(
            path.join(root, 'src/app/hooks/useLawyerDashboardNavigation.ts'),
            'utf8',
        );
        expect(src).toContain("import('@/app/utils/lazyComponentsIntent')");
        expect(src).not.toContain("from '@/app/utils/lazyComponentsIntent'");
        expect(src).not.toContain("from '@/app/utils/lazyComponents'");
    });
});
