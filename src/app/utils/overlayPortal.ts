export type OverlayPortalOptions = {
    id: string;
    zIndex: number;
};

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
    Object.assign(root.style, PORTAL_ANCHOR_STYLE, { zIndex: String(zIndex) });
    root.style.inset = '';
    root.style.right = '';
    root.style.bottom = '';
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
