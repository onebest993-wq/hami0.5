import React from 'react';

/** يزامن لوحة المسار مع حفظ inline — مصدر واحد لـ inlineLiveTick */
export function useSeizureInlineLiveTick(
    entityId: string,
    eventNames: string[],
    focusEntityKey: string,
): number {
    const [inlineLiveTick, setInlineLiveTick] = React.useState(0);

    React.useEffect(() => {
        const onInline = (e: Event) => {
            const ce = e as CustomEvent<Record<string, string>>;
            if (String(ce.detail?.[focusEntityKey] || '').trim() !== entityId) return;
            setInlineLiveTick((t) => t + 1);
        };
        for (const name of eventNames) {
            window.addEventListener(name, onInline as EventListener);
        }
        return () => {
            for (const name of eventNames) {
                window.removeEventListener(name, onInline as EventListener);
            }
        };
    }, [entityId, eventNames, focusEntityKey]);

    return inlineLiveTick;
}
