import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const headerDir = path.join(root, 'src/app/components/lawyer/LawyerDashboardParts/components');

function read(rel: string): string {
    return fs.readFileSync(path.join(root, rel), 'utf8');
}

function readHeader(name: string): string {
    return fs.readFileSync(path.join(headerDir, name), 'utf8');
}

describe('header toolbar close honesty', () => {
    it('الإغلاق: Escape + رجوع أصلي + لمسة خارج الشريط', () => {
        const dismiss = readHeader('useHeaderToolsDismiss.ts');
        expect(dismiss).toContain('registerNativeBackHandler');
        expect(dismiss).toContain("document.addEventListener('keydown'");
        expect(dismiss).toContain("event.key !== 'Escape'");
        expect(dismiss).toContain('isHamiFullOverlayOpen');
        expect(dismiss).not.toContain('HAMI_DISMISS_OVERLAYS_EVENT');
        expect(dismiss).toContain("document.addEventListener('pointerdown'");
        expect(readHeader('HeaderToolbarNav.tsx')).toContain('useHeaderToolsDismiss');
        expect(readHeader('useHeaderToolsReveal.ts')).toContain('const close = useCallback');
        expect(readHeader('useHeaderToolsReveal.ts')).toMatch(/useState\(false\)/);
    });

    it('الأدوات المطوية hidden + inert، واللمسة ≥44px', () => {
        const nav = readHeader('HeaderToolbarNav.tsx');
        expect(nav).toContain('hidden={!open}');
        expect(nav).toContain('inertProps(!open)');
        expect(readHeader('HeaderToolbarIcon.tsx')).toContain('min-w-[48px] min-h-[48px]');
        const css = read('src/app/components/lawyer/dashboard/lawyerHomeFx-critical.css');
        expect(css).toContain('min-width: 60px');
        expect(css).toContain('min-height: 60px');
        expect(css).toContain('.hami-header-tools-reveal');
        expect(css).toContain("[data-testid='header-toolbar-nav'] .hami-header-tool-btn");
        expect(css).toContain('.hami-lawyer-header > .hami-shell-container');
        expect(css).not.toMatch(
            /\[data-testid='header-toolbar-nav'\][^{]*\{[^}]*content-visibility:\s*hidden/s,
        );
    });

    it('طبقات keepAlive المغلقة لا تبقى dialog في شجرة الوصول', () => {
        const search = read(
            'src/app/components/lawyer/GlobalSearchOverlay/GlobalSearchOverlayLayerFrame.tsx',
        );
        expect(search).toContain('role={open ? \'dialog\' : undefined}');
        expect(search).toContain('aria-hidden={hidden || undefined}');
        const notif = read(
            'src/app/components/lawyer/NotificationPanel/components/NotificationPanelSheet.tsx',
        );
        expect(notif).toContain("role={isOpen ? 'dialog' : undefined}");
        expect(notif).toContain('aria-hidden={isOpen ? undefined : true}');
        expect(readHeader('HeaderToolbarIcon.tsx')).toContain('useEffect');
    });
});
