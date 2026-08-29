import { useCallback, useRef } from 'react';

export function useForumInflightGuard() {
    const actionInflightRef = useRef(new Set<string>());

    const runInflight = useCallback(async (key: string, action: () => Promise<void>) => {
        if (actionInflightRef.current.has(key)) return;
        actionInflightRef.current.add(key);
        try {
            await action();
        } finally {
            actionInflightRef.current.delete(key);
        }
    }, []);

    return { actionInflightRef, runInflight };
}
