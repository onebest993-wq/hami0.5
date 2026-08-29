import { useEffect, useRef, useState } from 'react';

/** ظهور مرة واحدة داخل الهامش — بطاقة السؤال وبطاقة المستودع بلا تكرار المراقب */
export function useInViewOnce(skipObserve: boolean, rootMargin: string) {
    const ref = useRef<HTMLDivElement | null>(null);
    const [inView, setInView] = useState(skipObserve);

    useEffect(() => {
        if (skipObserve) {
            setInView(true);
            return;
        }
        const node = ref.current;
        if (!node || typeof IntersectionObserver === 'undefined') {
            setInView(true);
            return;
        }
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    setInView(true);
                    observer.disconnect();
                }
            },
            { rootMargin },
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, [skipObserve, rootMargin]);

    return { ref, inView };
}
