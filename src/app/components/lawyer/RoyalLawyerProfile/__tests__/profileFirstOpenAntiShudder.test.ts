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
        expect(indexSrc).toContain('بلا بوابة settle');
    });

    it('يستورد CSS الأقسام متزامناً', () => {
        expect(fxCss).toContain('profilePageSectionFx.css');
        expect(fxCss).toContain('profilePortraitFrameFx.css');
    });

    it('سطح preserve بلا translate — كشف بـ z-index تحت غطاء الرئيسية', () => {
        expect(enterCss).toContain('hami-dashboard-home-stack-cover');
        expect(enterCss).toContain("data-hami-profile-open");
        expect(enterCss).not.toContain('translate3d(110%');
        expect(enterCss).toContain('لا translate/opacity');
    });

    it('يطابق InstantShell 132px', () => {
        expect(chromeCss).toContain('8.25rem');
    });

    it('لا يخفي المحتوى بـ visibility/contentVisibility', () => {
        expect(contentSrc).not.toContain("visibility: 'hidden'");
        expect(contentSrc).not.toContain("contentVisibility: 'hidden'");
    });

    it('صورة بلا opacity 0→100 وبلا بوابة Image قبل الرسم', () => {
        expect(avatarSrc).toContain('بلا بوابة Image()/opacity');
        expect(avatarSrc).not.toContain('opacity-0');
        expect(avatarSrc).not.toContain('new Image()');
    });
});
