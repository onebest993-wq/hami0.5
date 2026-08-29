import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('forum profile tile + opened profile mobile honesty', () => {
    it('ربع البلاطة: لمس 44 وإيماءة تمرير آمنة دون فتح أثناء السحب', () => {
        const quarter = read(
            'src/app/components/lawyer/dashboard/forumProfile/ForumTileProfileQuarter.tsx',
        );
        expect(quarter).toContain('min-h-[44px]');
        expect(quarter).toContain('min-w-[44px]');
        expect(quarter).toContain('touch-manipulation');
        expect(quarter).toContain('isForumTileProfilePointerScroll');
        expect(quarter).toContain('onPointerMove');
        expect(quarter).toContain('onPointerUp');
        expect(quarter).toContain('onPointerCancel');
        expect(quarter).not.toContain('revealProfileWarmShell');
        expect(quarter).toContain('beginProfileBackLock');
        expect(quarter).not.toContain('requestAnimationFrame');
        const fallback = read(
            'src/app/components/lawyer/dashboard/forumProfile/ForumTileProfileQuarterFallback.tsx',
        );
        expect(fallback).toContain('isForumTileProfilePointerScroll');
        expect(fallback).toContain('min-h-[44px]');
        const css = read('src/app/components/lawyer/dashboard/lawyerHomeFx-critical.css');
        expect(css).toContain('touch-action: manipulation');
        expect(css).toContain('-webkit-tap-highlight-color: transparent');
    });

    it('الملف المفتوح: كيبورد وreduceMotion وتعليق الرسم في الخلفية', () => {
        const indexSrc = read('src/app/components/lawyer/RoyalLawyerProfile/index.tsx');
        const surface = read(
            'src/app/components/lawyer/RoyalLawyerProfile/components/ProfilePageSurfaceFrame.tsx',
        );
        expect(indexSrc).toContain('useMobileKeyboardInset');
        expect(indexSrc).toContain('useReduceMotion');
        expect(indexSrc).toContain('useProfilePageHidden');
        expect(indexSrc).toContain('ProfilePageSurfaceFrame');
        expect(surface).toContain('data-profile-keyboard-open');
        expect(surface).toContain('data-profile-reduce-motion');
        expect(surface).toContain('env(safe-area-inset-bottom)');
        const hidden = read(
            'src/app/components/lawyer/RoyalLawyerProfile/hooks/useProfilePageHidden.ts',
        );
        expect(hidden).toContain('document.hidden');
        expect(hidden).toContain('HAMI_APP_STATE_EVENT');
        expect(hidden).not.toContain('!screenActive');
        const suspend = read('src/app/hooks/lawyerDashboard/useProfileTabMobileSuspend.ts');
        expect(suspend).toContain('HAMI_APP_STATE_EVENT');
        expect(suspend).toContain('pagehide');
        const focus = read(
            'src/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileHeroNameInputFocus.ts',
        );
        expect(focus).toContain('preventScroll: true');
        expect(focus).not.toContain('scrollIntoView');
        const sectionCss = read(
            'src/app/components/lawyer/RoyalLawyerProfile/profilePageSectionFx.css',
        );
        expect(sectionCss).toContain('.hami-profile-edit-channel-row input');
        expect(sectionCss).toContain('font-size: 16px');
        expect(sectionCss).toContain('min-height: 44px');
        expect(sectionCss).toMatch(/\.hami-profile-gallery-viewer__icon-btn[\s\S]*min-height:\s*44px/);
        const material = read(
            'src/app/components/lawyer/RoyalLawyerProfile/profilePageMaterialFx.css',
        );
        expect(material).toContain("data-profile-page-hidden='true'");
        expect(material).toContain('animation-play-state: paused');
    });
});
