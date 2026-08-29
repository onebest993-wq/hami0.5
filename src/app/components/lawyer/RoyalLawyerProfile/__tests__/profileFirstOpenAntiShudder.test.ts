import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('profile open stability (simple path)', () => {
    const indexSrc = readFileSync(resolve(__dirname, '../index.tsx'), 'utf8');
    const chromeCss = readFileSync(resolve(__dirname, '../profileChrome.css'), 'utf8');
    const fxCss = readFileSync(resolve(__dirname, '../profilePageFx.css'), 'utf8');
    const enterCss = readFileSync(resolve(__dirname, '../profilePageEnterFx.css'), 'utf8');
    const contentSrc = readFileSync(
        resolve(__dirname, '../components/ProfileContent.tsx'),
        'utf8',
    );
    const avatarSrc = readFileSync(
        resolve(__dirname, '../components/ProfileAvatarImage.tsx'),
        'utf8',
    );

    it('لا يستخدم بوابة frame reveal / غطاء صلباً', () => {
        expect(indexSrc).not.toContain('useProfileFrameReveal');
        expect(indexSrc).not.toContain('profile-frame-cover');
        expect(indexSrc).not.toContain('revealFinal');
        expect(indexSrc).not.toContain('ProfileInstantShell');
        expect(indexSrc).not.toContain('profileShellReady');
    });

    it('برميل أول رسم: كروم/هيرو/أقسام — الكتل خارج الصفحة الفارغة', () => {
        expect(fxCss).toContain('profilePageHeroFx.css');
        expect(fxCss).toContain('profilePortraitFrameFx.css');
        expect(fxCss).toContain('profilePageSectionFx.css');
        expect(fxCss).not.toContain('profilePageBlockFx.css');
        expect(contentSrc).toContain('ProfileFirstPaintTree');
        expect(contentSrc).not.toContain('useProfileBelowFoldArmed');
        expect(contentSrc).not.toContain('lazy(() =>');
        const firstTreeSrc = readFileSync(
            resolve(__dirname, '../components/ProfileFirstPaintTree.tsx'),
            'utf8',
        );
        expect(firstTreeSrc).toContain('ProfileContentBodySections');
        const body = readFileSync(
            resolve(__dirname, '../components/ProfileContentBodySections.tsx'),
            'utf8',
        );
        expect(body).toContain('data-profile-page-body');
        expect(body).toContain('ProfileCustomBlocksLazy');
        expect(body).toContain('ProfileContactSection');
        expect(body).toContain('ProfileGallerySection');
        expect(body).not.toContain("lazy(() =>\n    import('./ProfileContactSection')");
        expect(body).not.toContain("lazy(() =>\n    import('./ProfileGallerySection')");
        expect(body).not.toContain('profilePageSectionFx.css');
        expect(body).not.toContain('profilePageBlockFx.css');
        const blocks = readFileSync(
            resolve(__dirname, '../components/ProfileCustomBlocks.tsx'),
            'utf8',
        );
        expect(blocks).toContain('profilePageBlockFx.css');
    });

    it('سطح preserve بلا translate — كشف بـ z-index تحت غطاء الرئيسية', () => {
        expect(enterCss).toContain('hami-dashboard-home-stack-cover');
        expect(enterCss).toContain("data-hami-profile-open");
        expect(enterCss).not.toContain('translate3d(110%');
        expect(enterCss).toContain('لا translate/opacity');
    });

    it('كروم الملف بارتفاع صف ثابت (لا هيكل InstantShell الميت)', () => {
        expect(chromeCss).toContain('--profile-chrome-header-height: 3.25rem');
        expect(chromeCss).not.toContain('8.25rem');
    });

    it('لا يخفي المحتوى بـ visibility/contentVisibility', () => {
        expect(contentSrc).not.toContain("visibility: 'hidden'");
        expect(contentSrc).not.toContain("contentVisibility: 'hidden'");
    });

    it('لا يربط زر الرجوع بـ screenActive — يمنع قفزة تركيب الكروم عند الفتح', () => {
        const indexSrc = readFileSync(resolve(__dirname, '../index.tsx'), 'utf8');
        expect(indexSrc).toContain('isScreenMode && onBack ?');
        expect(indexSrc).not.toContain('isScreenMode && onBack && screenActive');
    });
});
