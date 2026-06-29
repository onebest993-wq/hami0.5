import { createPortal } from 'react-dom';
import type { HTMLAttributes, ReactNode } from 'react';

/** طبقات z-index لنوافذ الإضبارة الجنائية — تُعرَض عبر portal على document.body */
export const CRIMINAL_MODAL_Z = {
    shell: 220,
    request: 221,
    procedural: 222,
    proceduralConfirm: 223,
    linkedTimeline: 224,
    trial: 235,
    trialPostpone: 236,
    severance: 230,
    default: 240,
    trash: 245,
    overlay: 250,
    toast: 260,
    nested: 280,
    stageCloser: 500,
    verdictCassation: 520,
} as const;

const BACKDROP_CLASS =
    'fixed inset-0 bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center print:hidden';

export type CriminalModalPortalProps = HTMLAttributes<HTMLDivElement> & {
    children: ReactNode;
    zIndex?: number;
};

/** غلاف modal جنائي — يُرفع إلى body لتجاوز overflow/stacking داخل الإضبارة */
export function CriminalModalPortal({
    children,
    zIndex = CRIMINAL_MODAL_Z.default,
    className = '',
    style,
    ...rest
}: CriminalModalPortalProps) {
    if (!children) return null;

    const layer = (
        <div
            className={`${BACKDROP_CLASS} ${className}`.trim()}
            style={{ zIndex, ...style }}
            dir="rtl"
            {...rest}
        >
            {children}
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(layer, document.body) : layer;
}

export function renderCriminalModalPortal(node: ReactNode): ReactNode {
    if (!node) return null;
    return typeof document !== 'undefined' ? createPortal(node, document.body) : node;
}
