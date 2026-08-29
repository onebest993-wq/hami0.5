import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('profile studio load is deferred from the profile page', () => {
    it('صفحة الملف لا تُسخّن الاستوديو عند التركيب', () => {
        const content = readFileSync(
            resolve(root, 'src/app/components/lawyer/RoyalLawyerProfile/components/ProfileContent.tsx'),
            'utf8',
        );
        expect(content).not.toContain('prefetchProfileSettingsSheet');
        expect(content).not.toContain('primeProfileStudio');
    });

    it('المضيف يحمّل chunk الاستوديو عند الفتح فقط', () => {
        const host = readFileSync(
            resolve(
                root,
                'src/app/components/lawyer/RoyalLawyerProfile/components/ProfileSettingsSheetHost.tsx',
            ),
            'utf8',
        );
        expect(host).toContain('if (!open) return;');
        expect(host).toContain('primeProfileStudio()');
        const effect = host.slice(host.indexOf('useLayoutEffect'), host.indexOf('if (!Component)'));
        expect(effect.indexOf('if (!open) return;')).toBeLessThan(effect.indexOf('primeProfileStudio()'));
    });

    it('hover/open للصفحة لا يسحبان الاستوديو — النية من زر الاستوديو', () => {
        const prime = readFileSync(resolve(root, 'src/app/runtime/profileShellPrime.ts'), 'utf8');
        const hover = prime.slice(prime.indexOf("case 'hover'"), prime.indexOf("case 'open'"));
        const open = prime.slice(prime.indexOf("case 'open'"), prime.indexOf('default:'));
        expect(hover).not.toContain('primeProfileStudio');
        expect(open).not.toContain('primeProfileStudio');

        const hero = readFileSync(
            resolve(root, 'src/app/components/lawyer/RoyalLawyerProfile/components/ProfileHeroSection.tsx'),
            'utf8',
        );
        expect(hero).toContain("from '@/app/utils/lazyComponentsIntent'");
        expect(/from '@\/app\/utils\/lazyComponents['"]/.test(hero)).toBe(false);
        expect(hero).toContain('onStudioWarm={prefetchProfileSettingsSheet}');
        expect(hero).toContain('prefetchProfileSettingsSheet()');

        const notepadWarm = readFileSync(resolve(root, 'src/app/utils/lazyComponents.tsx'), 'utf8');
        const warmFn = notepadWarm.slice(
            notepadWarm.indexOf('export function warmNotepadAndProfile'),
            notepadWarm.indexOf('function prefetchHamiSettings'),
        );
        expect(warmFn).not.toContain('prefetchProfileSettingsSheet');
    });
});
