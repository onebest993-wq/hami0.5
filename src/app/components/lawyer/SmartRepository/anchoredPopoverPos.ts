export type AnchoredPopoverPos = {
    top: number;
    left: number;
    width: number;
    maxHeight: number;
};

/** نافذة ظاهرة فعلياً — تتقلص مع لوحة المفاتيح على iOS/Android */
function readFixedViewport(): { width: number; height: number; top: number; left: number } {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (vv && vv.width > 0 && vv.height > 0) {
        return {
            width: vv.width,
            height: vv.height,
            top: vv.offsetTop,
            left: vv.offsetLeft,
        };
    }
    return {
        width: window.innerWidth,
        height: window.innerHeight,
        top: 0,
        left: 0,
    };
}

/** إعادة حساب موضع اللوحة عند تغيير الشاشة أو ارتفاع لوحة المفاتيح */
export function subscribeVisualViewportLayout(onLayout: () => void): () => void {
    window.addEventListener('resize', onLayout);
    window.addEventListener('scroll', onLayout, true);
    const vv = window.visualViewport;
    vv?.addEventListener('resize', onLayout);
    vv?.addEventListener('scroll', onLayout);
    return () => {
        window.removeEventListener('resize', onLayout);
        window.removeEventListener('scroll', onLayout, true);
        vv?.removeEventListener('resize', onLayout);
        vv?.removeEventListener('scroll', onLayout);
    };
}

type AnchoredPopoverOpts = {
    maxHeightCap: number;
    minPanel: number;
    preferBelowMin: number;
    gap?: number;
    viewportPad?: number;
    heightFraction?: number;
    width?: number;
    minWidthFromAnchor?: boolean;
};

/** موضع قائمة/لوحة تحت زر RTL — بدون تغيير بصري */
export function computeAnchoredPopoverPos(
    anchor: HTMLElement,
    opts: AnchoredPopoverOpts,
): AnchoredPopoverPos {
    const rect = anchor.getBoundingClientRect();
    const gap = opts.gap ?? 8;
    const pad = opts.viewportPad ?? 8;
    const vp = readFixedViewport();
    const vw = vp.width;
    const vh = vp.height;
    const visibleTop = vp.top;
    const visibleLeft = vp.left;
    const visibleBottom = visibleTop + vh;
    const visibleRight = visibleLeft + vw;
    const width = opts.minWidthFromAnchor
        ? Math.max(rect.width, opts.width ?? 240)
        : Math.min(opts.width ?? 272, vw - pad * 2);
    const spaceBelow = visibleBottom - rect.bottom - gap - pad;
    const spaceAbove = rect.top - visibleTop - gap - pad;
    const preferBelow = spaceBelow >= opts.preferBelowMin || spaceBelow >= spaceAbove;
    const maxHeight = Math.min(
        opts.maxHeightCap,
        Math.round(vh * (opts.heightFraction ?? 0.5)),
        preferBelow ? Math.max(opts.minPanel, spaceBelow) : Math.max(opts.minPanel, spaceAbove),
    );
    const top = preferBelow
        ? rect.bottom + gap
        : Math.max(visibleTop + pad, rect.top - gap - maxHeight);
    let left = rect.right - width;
    left = Math.max(visibleLeft + pad, Math.min(left, visibleRight - width - pad));
    return { top, left, width, maxHeight };
}

export function computeRepositoryFilterPopoverPos(anchor: HTMLElement): AnchoredPopoverPos {
    return computeAnchoredPopoverPos(anchor, {
        width: 272,
        maxHeightCap: 320,
        minPanel: 140,
        preferBelowMin: 180,
        gap: 8,
        viewportPad: 10,
        heightFraction: 0.48,
    });
}

export function computeRepositoryRoomMenuPos(anchor: HTMLElement): AnchoredPopoverPos {
    return computeAnchoredPopoverPos(anchor, {
        width: 240,
        minWidthFromAnchor: true,
        maxHeightCap: 352,
        minPanel: 160,
        preferBelowMin: Math.min(220, 352),
        gap: 6,
        viewportPad: 8,
        heightFraction: 0.52,
    });
}

/** قائمة نقل البطاقة — نفس عرض 280 السابق، مع إبقاء اللوحة داخل الشاشة على الموبايل */
export function computeRepositoryMoveMenuPos(anchor: HTMLElement): AnchoredPopoverPos {
    return computeAnchoredPopoverPos(anchor, {
        width: 280,
        maxHeightCap: 280,
        minPanel: 120,
        preferBelowMin: 140,
        gap: 6,
        viewportPad: 8,
        heightFraction: 0.5,
    });
}
