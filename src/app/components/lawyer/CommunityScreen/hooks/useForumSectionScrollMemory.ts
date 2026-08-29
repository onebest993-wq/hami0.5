import { useLayoutEffect, useRef, type RefObject } from 'react';
import type { CommunitySection } from '@/app/components/lawyer/CommunityScreen/communitySectionState';

/** يحفظ موضع التمرير لكل قسم حتى فك التركيب لا يُسقط المستخدم أعلى القائمة */
export function useForumSectionScrollMemory(
    scrollRef: RefObject<HTMLDivElement | null>,
    activeSection: CommunitySection,
) {
    const positionsRef = useRef<Partial<Record<CommunitySection, number>>>({});
    const prevSectionRef = useRef(activeSection);

    useLayoutEffect(() => {
        const node = scrollRef.current;
        if (!node) return;
        const prev = prevSectionRef.current;
        if (prev === activeSection) return;
        positionsRef.current[prev] = node.scrollTop;
        prevSectionRef.current = activeSection;
        node.scrollTop = positionsRef.current[activeSection] ?? 0;
    }, [activeSection, scrollRef]);
}
