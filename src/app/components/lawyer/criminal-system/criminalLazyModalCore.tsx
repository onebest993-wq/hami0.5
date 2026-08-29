import React, { Suspense, type ComponentProps, type ReactNode } from 'react';
import { CriminalModalPortal, CRIMINAL_MODAL_Z, renderCriminalModalPortal } from './criminalModalPortal';

function ModalSuspense({ children }: { children: ReactNode }) {
    return <Suspense fallback={null}>{children}</Suspense>;
}

type LazyModalRenderable<P extends object> =
    | React.ComponentType<P>
    | React.LazyExoticComponent<React.ComponentType<P>>;

type LazyModalProps<P extends object> = P & {
    open?: boolean;
};

type LazyModalOptions = {
    zIndex?: number;
    /** المكوّن يستخدم CriminalModalPortal داخلياً — لا نُضيف غلافاً خارجياً */
    selfPortaled?: boolean;
    /** المكوّن ما زال يحمل fixed inset-0 — نرفعه بـ createPortal فقط دون غلاف مزدوج */
    legacyShell?: boolean;
};

export function lazyModal<P extends object>(
    Component: LazyModalRenderable<P>,
    options: LazyModalOptions = {},
) {
    const zIndex = options.zIndex ?? CRIMINAL_MODAL_Z.default;
    const ResolvedComponent = Component as React.ElementType;
    return function LazyModalWrapper(props: LazyModalProps<P>) {
        if (props.open === false) return null;
        const body = (
            <ModalSuspense>
                <ResolvedComponent {...(props as ComponentProps<React.ElementType>)} />
            </ModalSuspense>
        );
        if (options.selfPortaled) return body;
        if (options.legacyShell) return renderCriminalModalPortal(body);
        return <CriminalModalPortal zIndex={zIndex}>{body}</CriminalModalPortal>;
    };
}
