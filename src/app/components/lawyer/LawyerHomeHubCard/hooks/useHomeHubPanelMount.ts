import { useEffect, useState } from 'react';

/** mount-once عند أول تفعيل للوحة — يؤجّل Embla/قوائم ثقيلة */
export function useHomeHubPanelMount(active: boolean): boolean {
    const [mounted, setMounted] = useState(active);

    useEffect(() => {
        if (active) setMounted(true);
    }, [active]);

    return mounted;
}
