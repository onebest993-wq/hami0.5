import React from 'react';
import { TaskCard } from './TaskCard';
import type { TaskCardProps } from './taskCardUtils';
import { TASK_CARD_SLOT_CLASS } from './tasksBoucleTheme';

export function AgendaTaskCardPaintSlot({ taskId }: { taskId: string }) {
    return <li data-testid={`tasks-task-card-slot-${taskId}`} className={TASK_CARD_SLOT_CLASS} aria-hidden />;
}

/** بطاقة الأجندة مع مقطع Overlay — بلا كسل شبكة ثانٍ بعد أول طلاء */
export function AgendaTaskCard(props: TaskCardProps) {
    return <TaskCard {...props} />;
}
