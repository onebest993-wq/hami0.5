import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    PROFILE_SHEET_MAX_WIDTH_CSS,
    PROFILE_TABLET_MIN_WIDTH_PX,
} from '@/app/services/profile/profileTouchTargets';

const root = resolve(__dirname, '..');

describe('profile mobile/tablet layout floors', () => {
    it('ورقة الاستوديو محدودة العرض ومتمركزة للوحية + safe-area أفقي', () => {
        const sheet = readFileSync(resolve(root, 'components/ProfileSettingsSheet.tsx'), 'utf8');
        expect(sheet).toContain(`max-w-[${PROFILE_SHEET_MAX_WIDTH_CSS}]`);
        expect(sheet).toContain('mx-auto');
        expect(sheet).toContain('env(safe-area-inset-left)');
        expect(sheet).toContain('env(safe-area-inset-right)');
    });

    it('هيكل تحميل الاستوديو يطابق سقف العرض وsafe-area الأفقي', () => {
        const fallback = readFileSync(
            resolve(root, 'components/ProfileSettingsSheetLoadingFallback.tsx'),
            'utf8',
        );
        expect(fallback).toContain(`max-w-[${PROFILE_SHEET_MAX_WIDTH_CSS}]`);
        expect(fallback).toContain('mx-auto');
        expect(fallback).toContain('env(safe-area-inset-left)');
        expect(fallback).toContain('env(safe-area-inset-right)');
    });

    it('عارض المعرض يحترم safe-area الأربعة + مسرح أطول على لوحية أفقية', () => {
        const css = readFileSync(resolve(root, 'profilePageSectionFx.css'), 'utf8');
        expect(css).toContain('env(safe-area-inset-left');
        expect(css).toContain('env(safe-area-inset-right');
        expect(css).toContain(`min-width: ${PROFILE_TABLET_MIN_WIDTH_PX}px`);
        expect(css).toContain('orientation: landscape');
        expect(css).toContain('min(70dvh, 28rem)');
    });

    it('زر الملف في بلاطة المنتدى يحافظ على طابق لمس ≥٤٤ ودائرة ٥rem', () => {
        const trigger = readFileSync(
            resolve(
                process.cwd(),
                'src/app/components/lawyer/dashboard/commandHub/ForumTile.tsx',
            ),
            'utf8',
        );
        const quarter = readFileSync(
            resolve(
                process.cwd(),
                'src/app/components/lawyer/dashboard/forumProfile/ForumTileProfileQuarter.tsx',
            ),
            'utf8',
        );
        const chrome = readFileSync(
            resolve(
                process.cwd(),
                'src/app/components/lawyer/dashboard/forumProfile/ForumTileProfileQuarterChrome.tsx',
            ),
            'utf8',
        );
        const css = readFileSync(
            resolve(
                process.cwd(),
                'src/app/components/lawyer/dashboard/lawyerHomeFx-critical.css',
            ),
            'utf8',
        );
        expect(trigger).toContain('min-h-[44px]');
        expect(quarter).toContain('touch-manipulation');
        expect(quarter).toContain('FORUM_TILE_PROFILE_TAP_STYLE');
        expect(chrome).toContain('WebkitTapHighlightColor');
        expect(quarter).toContain('min-h-[44px]');
        expect(quarter).toContain('isForumTileProfilePointerScroll');
        expect(css).toContain('grid-template-columns: 1fr 1fr');
        expect(css).toContain('border-radius: 50%');
        expect(css).toContain('object-fit: cover');
        expect(css).toContain('circle at left center');
        expect(css).toContain('circle at right center');
        expect(css).toContain('left: 0');
        expect(css).toContain('hami-forum-tile-avatar-frame');
    });

    it('عمود الملف يبقى بسقف 32.5rem للوحية', () => {
        const chrome = readFileSync(resolve(root, 'profileChrome.css'), 'utf8');
        expect(chrome).toContain('--profile-page-max-width: min(100%, 32.5rem)');
        expect(chrome).toContain('--profile-safe-left');
        expect(chrome).toContain('--profile-safe-right');
    });
});
