import { useEffect, useState } from 'react';

/** mount-once عند أول تفعيل للوحة — يؤجّل Embla/قوائم ثقيلة */
export function useHomeHubPanelMount(active: boolean, eager = false): boolean {
    const [mounted, setMounted] = useState(active || eager);

    useEffect(() => {
        if (active || eager) setMounted(true);
    }, [active, eager]);

    return mounted;
}
