import { useEffect, useState } from 'react';

const ROOT_MARGIN = '12% 0px';

function isProfilePageHiddenFromDom(node: Element): boolean {
    const root = node.closest('[data-lawyer-profile-root]');
    return root?.getAttribute('data-profile-page-hidden') === 'true';
}

/** يُبلّغ عند دخول/خروج الكتلة من viewport — لإيقاف animations خارج الشاشة */
export function useProfileCanvasInView<T extends Element>(targetRef: React.RefObject<T | null>): boolean {
    const [inView, setInView] = useState(true);

    useEffect(() => {
        const node = targetRef.current;
        if (!node || typeof IntersectionObserver === 'undefined') {
            setInView(true);
            return;
        }

        let observer: IntersectionObserver | null = null;

        const startObserving = () => {
            observer?.disconnect();
            observer = null;
            if (isProfilePageHiddenFromDom(node)) {
                setInView(false);
                return;
            }
            observer = new IntersectionObserver(
                (entries) => {
                    const entry = entries[0];
                    if (entry) setInView(entry.isIntersecting);
                },
                { root: null, rootMargin: ROOT_MARGIN, threshold: 0.08 },
            );
            observer.observe(node);
        };

        startObserving();

        const root = node.closest('[data-lawyer-profile-root]');
        let attrObserver: MutationObserver | null = null;
        if (root && typeof MutationObserver !== 'undefined') {
            attrObserver = new MutationObserver(() => {
                startObserving();
            });
            attrObserver.observe(root, {
                attributes: true,
                attributeFilter: ['data-profile-page-hidden'],
            });
        }

        return () => {
            observer?.disconnect();
            attrObserver?.disconnect();
        };
    }, [targetRef]);

    return inView;
}
