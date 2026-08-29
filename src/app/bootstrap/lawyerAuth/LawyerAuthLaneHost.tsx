import React, { useEffect, type ReactElement } from 'react';
import { useAuthSafe } from '@/app/context/authHooks';
import { useLawyerDashboardAuth } from '@/app/hooks/lawyerDashboard/useLawyerDashboardAuth';

type LawyerAuthLaneHostProps = {
    onEnterBoard: () => void;
};

/** سطح الهوية فقط — يُحمَّل من Gate عندما لا تُسخَّن اللوحة. */
export function LawyerAuthLaneHost({ onEnterBoard }: LawyerAuthLaneHostProps): ReactElement | null {
    const { user: authUser, isLoading: authHydrating } = useAuthSafe();
    const { authGate } = useLawyerDashboardAuth({ authUser, authHydrating });

    useEffect(() => {
        if (!authGate) onEnterBoard();
    }, [authGate, onEnterBoard]);

    return authGate;
}
