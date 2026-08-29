import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '..');
const homeCss = readFileSync(
    resolve(process.cwd(), 'src/app/components/lawyer/dashboard/lawyerHomeFx-critical.css'),
    'utf8',
);
const material = readFileSync(resolve(root, 'profilePageMaterialFx.css'), 'utf8');
const hero = readFileSync(resolve(root, 'profilePageHeroFx.css'), 'utf8');
const chrome = readFileSync(resolve(root, 'profileChrome.css'), 'utf8');
const header = readFileSync(resolve(root, 'components/ProfileChromeHeader.tsx'), 'utf8');
const surfaceSrc = readFileSync(resolve(root, 'components/ProfilePageSurfaceFrame.tsx'), 'utf8');

describe('profile visual lite (explicit design permission)', () => {
    it('بلاطة المنزل: اسم بلا ظل + إطار صورة بحد ذهبي رفيع', () => {
        const nameBlock = homeCss.slice(homeCss.indexOf('.hami-forum-tile-name'));
        expect(nameBlock).toContain('text-shadow: none');
        expect(homeCss).not.toContain('0 0 0 1.5px color-mix(in srgb, #e6c673 72%');
        expect(homeCss).toContain('0 4px 10px rgba(0, 0, 0, 0.22)');
    });

    it('لا يضيف blur للوحات على اللمس الخشن', () => {
        const coarse = material.slice(material.indexOf('(pointer: coarse)'));
        expect(coarse).toContain('backdrop-filter: none');
        expect(coarse).not.toContain('backdrop-filter: blur(10px)');
    });

    it('زر الاستوديو والرجوع بلا وهج ذهبي / backdrop-blur-xl', () => {
        expect(hero).not.toContain('.hami-profile-studio-btn');
        expect(hero).not.toContain('hami-profile-hero-aurora');
        expect(hero).not.toContain('hami-profile-action-primary');
        expect(header).not.toContain('backdrop-blur-xl');
        expect(header).toContain('min-h-[44px]');
        expect(chrome).not.toContain('backdrop-filter: blur(18px)');
    });

    it('لا يُبقي طبقات وهج ميتة في خامة الصفحة', () => {
        expect(material).not.toContain('hami-profile-hero-aurora');
        expect(material).not.toContain('hami-profile-ambient-glow');
    });

    it('هامش أسفل الصفحة أخف مع بقاء safe-area والكيبورد', () => {
        expect(surfaceSrc).toContain('max(4.75rem, calc(env(safe-area-inset-bottom)');
        expect(surfaceSrc).not.toContain('max(8rem, calc(env(safe-area-inset-bottom)');
    });

    it('الهيرو صف هوية لا نصب متداخل', () => {
        const heroSrc = readFileSync(resolve(root, 'components/ProfileHeroSection.tsx'), 'utf8');
        const portrait = readFileSync(resolve(root, 'components/ProfileFloatingPortrait.tsx'), 'utf8');
        expect(heroSrc).toContain('hami-profile-hero-identity-row');
        expect(hero).not.toContain('padding-top: 3.65rem');
        expect(hero).not.toContain('padding: 3.7rem 1rem 1rem');
        expect(hero).not.toContain('transform: translateX(-50%)');
        expect(portrait).not.toContain('w-[108px]');
        expect(material).toContain('width: 5rem');
        const sheen = material.slice(material.indexOf('.hami-profile-panel-sheen'));
        expect(sheen).toContain('display: none');
        expect(heroSrc).not.toContain('MoroccanGlassFrame');
        expect(heroSrc).not.toContain('hami-profile-hero-card');
        expect(heroSrc).not.toContain('hami-profile-hero-tools');
        expect(hero).not.toContain('hami-profile-identity__rule');
        expect(hero).not.toContain('hami-profile-sigil-halo');
        expect(hero).not.toContain('.hami-profile-hero-tools::before');
        const constellation = hero.slice(
            hero.indexOf('.hami-profile-sigil-constellation {'),
            hero.indexOf('.hami-profile-sigil {'),
        );
        expect(constellation).not.toContain('background:');
        expect(constellation).not.toContain('border:');
        expect(constellation).not.toContain('padding:');
        expect(material).toContain('box-shadow: none');
    });

    it('قنوات التواصل قسم شعري بلا إطار زجاج مزدوج', () => {
        const contact = readFileSync(
            resolve(root, 'components/ProfileContactSection.tsx'),
            'utf8',
        );
        expect(contact).toContain('hami-profile-section');
        expect(contact).not.toContain('MoroccanGlassFrame');
    });
});
