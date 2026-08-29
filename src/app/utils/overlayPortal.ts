export type OverlayPortalOptions = {
    id: string;
    zIndex: number;
};

/**
 * حجز شريط الحالة/الإيماءات — قاعدة CSS حقيقية (.hami-overlay-safe-insets)
 * لأن Tailwind لا يولّد غالباً arbitrary فيها فواصل var(..., env(...)).
 * المصدر: --hami-lawyer-header-safe-top في lawyerHomeFx-critical.css
 */
export const HAMI_OVERLAY_SAFE_INSETS_CLASS = 'hami-overlay-safe-insets';

/** عمود النوافذ بنفس `--hami-shell-max-width` للرئيسية — الخلفية تملأ الشاشة */
export const HAMI_SHELL_OVERLAY_COLUMN_CLASS = 'hami-shell-overlay-column';

const PORTAL_ANCHOR_STYLE: Partial<CSSStyleDeclaration> = {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '0',
    height: '0',
    overflow: 'visible',
    pointerEvents: 'none',
};

function applyPortalAnchorStyle(root: HTMLElement, zIndex: number) {
    const z = String(zIndex);
    if (
        root.dataset.hamiPortalZ === z &&
        root.style.position === 'fixed' &&
        root.style.width === '0px' &&
        root.style.pointerEvents === 'none'
    ) {
        return;
    }
    Object.assign(root.style, PORTAL_ANCHOR_STYLE, { zIndex: z });
    root.style.inset = '';
    root.style.right = '';
    root.style.bottom = '';
    root.dataset.hamiPortalZ = z;
}

/** طبقة portal مستقلة عن #root — anchor صفري بدون حجب pointer-events للشاشة كاملة */
export function getHamiOverlayPortalRoot({ id, zIndex }: OverlayPortalOptions): HTMLElement {
    if (typeof document === 'undefined') {
        return null as unknown as HTMLElement;
    }

    let root = document.getElementById(id);
    if (!root) {
        root = document.createElement('div');
        root.id = id;
        root.setAttribute('data-hami-overlay-portal', '');
        document.body.appendChild(root);
    }

    applyPortalAnchorStyle(root, zIndex);
    return root;
}
