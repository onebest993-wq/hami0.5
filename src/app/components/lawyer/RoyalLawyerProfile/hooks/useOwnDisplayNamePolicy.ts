import { useEffect, useState } from 'react';
import type { DisplayNamePolicy } from '@/app/domain/profile/displayNameCorrection';
import { fetchOwnDisplayNamePolicy } from '@/app/services/profile/displayNameCorrectionClient';

export function useOwnDisplayNamePolicy(enabled: boolean, refreshKey = 0): DisplayNamePolicy | null {
    const [policy, setPolicy] = useState<DisplayNamePolicy | null>(null);
    useEffect(() => {
        if (!enabled) {
            setPolicy(null);
            return;
        }
        let cancelled = false;
        void fetchOwnDisplayNamePolicy().then((next) => {
            if (!cancelled) setPolicy(next);
        });
        return () => {
            cancelled = true;
        };
    }, [enabled, refreshKey]);
    return policy;
}
