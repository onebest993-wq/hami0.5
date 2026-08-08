import React from 'react';

export type HamiWordmarkBootPhase = 'enter' | 'idle' | 'exit';

type HamiWordmarkBootProps = {
    phase?: HamiWordmarkBootPhase;
    className?: string;
};

/** إقلاع بلا شعار — اللوحة هي المحتوى الأول */
export function HamiWordmarkBoot(_props: HamiWordmarkBootProps): React.ReactElement | null {
    return null;
}
