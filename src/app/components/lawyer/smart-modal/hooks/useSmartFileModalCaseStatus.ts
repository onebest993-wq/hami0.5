import { useState } from 'react';
import { readFileString } from '../smartFile/smartFileModalTypes';

export function useSmartFileModalCaseStatus(file: Record<string, unknown>) {
    const [status, setStatus] = useState(() => readFileString(file, 'status', 'نشطة'));
    const [isPaused, setIsPaused] = useState(
        file?.status === 'paused'
        || file?.status === 'مستأخرة'
        || file?.status === 'موقوفة اتفاقياً'
        || false,
    );
    const [pauseReason, setPauseReason] = useState(() => readFileString(file, 'stayReason'));
    const [linkedCaseNo, setLinkedCaseNo] = useState(() => readFileString(file, 'linkedCaseNo'));
    const [isInterrupted, setIsInterrupted] = useState(
        file?.status === 'interrupted'
        || file?.status === 'منقطعة'
        || false,
    );
    const [interruptionData, setInterruptionData] = useState<Record<string, unknown> | null>(
        (file?.interruptionData as Record<string, unknown>) || null,
    );

    return {
        status,
        setStatus,
        isPaused,
        setIsPaused,
        pauseReason,
        setPauseReason,
        linkedCaseNo,
        setLinkedCaseNo,
        isInterrupted,
        setIsInterrupted,
        interruptionData,
        setInterruptionData,
    };
}
