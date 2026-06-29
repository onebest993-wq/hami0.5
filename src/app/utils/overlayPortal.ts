export type OverlayPortalOptions = {
    id: string;
    zIndex: number;
};

/** طبقة portal مستقلة عن #root — تتجنّب كسر position:fixed داخل شجرة الواجهة */
export function getHamiOverlayPortalRoot({ id, zIndex }: OverlayPortalOptions): HTMLElement {
    if (typeof document === 'undefined') {
        return null as unknown as HTMLElement;
    }

    let root = document.getElementById(id);
    if (!root) {
        root = document.createElement('div');
        root.id = id;
        root.setAttribute('data-hami-overlay-portal', '');
        Object.assign(root.style, {
            position: 'fixed',
            inset: '0',
            width: '100vw',
            height: '100dvh',
            pointerEvents: 'none',
            zIndex: String(zIndex),
        });
        document.body.appendChild(root);
    } else if (root.style.zIndex !== String(zIndex)) {
        root.style.zIndex = String(zIndex);
    }

    return root;
}
