import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const forumRoot = path.join(process.cwd(), 'src/app/components/lawyer/CommunityScreen');

function read(rel: string): string {
    return fs.readFileSync(path.join(forumRoot, rel), 'utf8');
}

describe('كثافة سطح المنتدى — بسيط خفيف عصري', () => {
    it('الثيم مضغوط: بطاقات أنحف، FAB بلمس 44px، بلا نقش مسماري', () => {
        const theme = read('forumPlumTheme.ts');
        expect(theme).toContain("rounded-xl p-3");
        expect(theme).toContain('min-h-[44px]');
        expect(theme).toContain('export const FORUM_PUBLISH_FAB =');
        expect(theme).toContain("import './forumPlumChrome.css'");
        expect(theme).not.toContain('cuneiform');
        expect(theme).not.toContain('min-h-[48px]');
        expect(theme).not.toContain('rounded-t-[28px]');
        expect(theme).not.toContain('px-5 py-3.5');
        expect(theme).not.toContain('rounded-2xl p-4');
        expect(theme).not.toContain('shadow-2xl');
        expect(theme).not.toContain('backdrop-blur');
    });

    it('CSS بلا نقش مسماري وبلا ظلال ثقيلة', () => {
        const css = read('forumPlumChrome.css');
        expect(css).toContain('box-shadow: 0 4px 16px rgba(0, 0, 0, 0.22)');
        expect(css).not.toContain('cuneiform');
        expect(css).not.toContain('radial-gradient');
        expect(css).not.toContain('box-shadow: 0 12px 32px');
        expect(css).not.toContain('box-shadow: 0 20px 48px');
        expect(css).not.toContain('forum-instant-shell');
        expect(fs.existsSync(path.join(forumRoot, 'assets/forum-cuneiform-tile-dark.svg'))).toBe(false);
        expect(fs.existsSync(path.join(forumRoot, 'assets/forum-cuneiform-tile-gold.svg'))).toBe(false);
    });

    it('الشريط والخلاصة والFAB لا يستهلكان هامشاً زائداً', () => {
        const appBar = read('components/ForumAppBar.tsx');
        expect(appBar).toContain('px-3 pt-2 pb-1.5');
        expect(appBar).not.toContain('px-4 pt-3 pb-2');
        const body = read('components/CommunityScreenBody.tsx');
        expect(body).toContain('pb-24');
        expect(body).not.toContain('pb-36');
        const card = read('components/QuestionCard.tsx');
        expect(card).not.toContain('mb-3 h-px');
        expect(card).not.toContain('shadow-[0_0_24px');
        const fab = read('components/ForumPublishFab.tsx');
        expect(fab).toContain('FORUM_PUBLISH_FAB');
        expect(fab).not.toContain('cuneiform');
    });
});
