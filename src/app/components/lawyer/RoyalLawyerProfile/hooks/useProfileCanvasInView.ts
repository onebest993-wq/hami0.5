import { useEffect, useState } from 'react';

const ROOT_MARGIN = '12% 0px';

/** يُبلّغ عند دخول/خروج الكتلة من viewport — لإيقاف animations خارج الشاشة */
export function useProfileCanvasInView<T extends Element>(targetRef: React.RefObject<T | null>): boolean {
    const [inView, setInView] = useState(true);

    useEffect(() => {
        const node = targetRef.current;
        if (!node || typeof IntersectionObserver === 'undefined') {
            setInView(true);
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (entry) setInView(entry.isIntersecting);
            },
            { root: null, rootMargin: ROOT_MARGIN, threshold: 0.08 },
        );

        observer.observe(node);
        return () => observer.disconnect();
    }, [targetRef]);

    return inView;
}
