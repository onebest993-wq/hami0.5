import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('profile Android touch honesty', () => {
    it('بؤرة الصورة تمنع التمرير من أول لمسة', () => {
        const css = read('src/app/components/lawyer/RoyalLawyerProfile/profileImageFx.css');
        const picker = css.slice(
            css.indexOf('.profile-image-focus-picker {'),
            css.indexOf('.profile-image-focus-picker[data-dragging='),
        );
        expect(picker).toContain('touch-action: none');
        expect(picker).not.toContain('touch-action: pan-y');
        expect(css).toContain('.profile-image-frame-wrap--tilt');
        expect(css).toMatch(/\.profile-image-frame-wrap--tilt\s*\{[\s\S]*touch-action:\s*none/);
    });

    it('إمالة الإطار لا تُلغى بـ data-profile-reduce-motion لأندرويد', () => {
        const tilt = read(
            'src/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileImageFrameTilt.ts',
        );
        expect(tilt).toContain("prefers-reduced-motion: reduce");
        expect(tilt).not.toContain('data-profile-reduce-motion');
        expect(tilt).toContain('preventDefaultIfCancelable');
        const math = read(
            'src/app/components/lawyer/RoyalLawyerProfile/utils/profileCustomBlocksDragMath.ts',
        );
        expect(math).toContain('capturePointerSafe');
        expect(math).not.toMatch(/unlockProfileScroll\(scrollParent,\s*scrollLock\);\s*return null/);
        const session = read(
            'src/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileCustomBlocksDragSession.ts',
        );
        expect(session).toContain('isPrimaryDragPointer');
        expect(session).toContain('isCoarsePointerEvent(event)');
        const armed = read(
            'src/app/components/lawyer/RoyalLawyerProfile/hooks/useArmedPointerAction.ts',
        );
        expect(armed).toContain('isPrimaryDragPointer');
        expect(armed).not.toContain('event.button !== 0');
        const bindings = read(
            'src/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileCustomBlocksPointerBindings.ts',
        );
        expect(bindings).toContain("addEventListener('touchstart'");
        expect(bindings).toContain('{ passive: false }');
        expect(bindings).toContain('if (dragRef.current?.pointerId === event.pointerId) return');
    });
});
