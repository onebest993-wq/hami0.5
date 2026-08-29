import { useEffect } from 'react';
import { registerRepositoryChromeDismiss } from './repositoryChromeDismiss';

/** يسجّل إغلاقاً في مكدس Escape طالما الطبقة ظاهرة */
export function useRepositoryChromeDismiss(active: boolean, dismiss: () => void): void {
    useEffect(() => {
        if (!active) return;
        return registerRepositoryChromeDismiss(() => {
            dismiss();
            return true;
        });
    }, [active, dismiss]);
}
