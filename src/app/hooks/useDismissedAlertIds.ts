import { useCallback, useEffect, useState } from 'react';
import { dismissAlertId, getDismissedAlertIds } from '@/app/services/appAlertDismiss';

export function useDismissedAlertIds() {
    const [dismissedIds, setDismissedIds] = useState<string[]>(() => getDismissedAlertIds());

    useEffect(() => {
        const sync = () => setDismissedIds(getDismissedAlertIds());
        window.addEventListener('hami:alerts-dismissed', sync);
        window.addEventListener('storage', sync);
        return () => {
            window.removeEventListener('hami:alerts-dismissed', sync);
            window.removeEventListener('storage', sync);
        };
    }, []);

    const dismiss = useCallback((id: string) => {
        dismissAlertId(id);
        setDismissedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    }, []);

    return { dismissedIds, dismiss };
}
