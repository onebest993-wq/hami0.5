import React, { useLayoutEffect } from 'react';
import { FieldTasksBottomSheet } from '@/app/components/lawyer/dashboard/FieldTasksBottomSheet';
import { warmQuantumTasksDiskRead } from '@/app/hooks/lawyerDashboard/fieldTasks/fieldTasksLazyImports';

type FieldTasksBottomSheetProps = React.ComponentProps<typeof FieldTasksBottomSheet>;

export type FieldTasksSheetHostProps = FieldTasksBottomSheetProps & {
    keepAlive?: boolean;
};

/**
 * ستارة الميدان — استيراد ثابت؛ keepAlive يبقي الطبقة مخفية للكشف اللحظي.
 */
export function FieldTasksSheetHost({
    keepAlive = false,
    ...props
}: FieldTasksSheetHostProps): React.ReactElement | null {
    const { open } = props;

    useLayoutEffect(() => {
        if (!open && !keepAlive) return;
        warmQuantumTasksDiskRead();
    }, [keepAlive, open]);

    if (!open && !keepAlive) {
        return null;
    }

    return <FieldTasksBottomSheet {...props} />;
}
