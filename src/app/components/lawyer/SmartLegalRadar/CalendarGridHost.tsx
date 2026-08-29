import React, { useState } from 'react';
import { CalendarGrid } from '@/app/components/lawyer/SmartLegalRadar/CalendarGrid';
import { inertProps } from '@/app/utils/inertProps';

type CalendarGridProps = React.ComponentProps<typeof CalendarGrid>;

/**
 * شبكة التقويم تبقى مركّبة بعد أول فتح — الطيّ CSS فوري بلا انتظار chunk.
 */
export function CalendarGridHost(props: CalendarGridProps & { visible: boolean }): React.ReactElement | null {
    const { visible, ...gridProps } = props;
    const [held, setHeld] = useState(visible);

    if (visible && !held) {
        setHeld(true);
    }

    if (!held) return null;

    return (
        <div
            className="hami-radar-calendar-collapse"
            data-open={visible ? '1' : '0'}
            data-testid="radar-calendar-collapse"
            aria-hidden={!visible}
            {...inertProps(!visible)}
        >
            <div className="hami-radar-calendar-collapse__inner">
                <CalendarGrid {...gridProps} />
            </div>
        </div>
    );
}
