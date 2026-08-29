import { useCallback, useState } from 'react';
import type { BusinessBackupSelection } from '@/app/services/settings/businessBackupTypes';

export function useBusinessBackupSelection() {
    const [backupIncludeLawsuits, setBackupIncludeLawsuits] = useState(true);
    const [backupIncludeExecution, setBackupIncludeExecution] = useState(true);
    const [backupIncludeNotes, setBackupIncludeNotes] = useState(true);
    const [backupIncludeVault, setBackupIncludeVault] = useState(false);
    const [backupIncludeUrgent, setBackupIncludeUrgent] = useState(true);
    const [backupIncludeUndated, setBackupIncludeUndated] = useState(true);
    const [backupFrom, setBackupFrom] = useState('');
    const [backupTo, setBackupTo] = useState('');

    const buildSelection = useCallback(
        (): BusinessBackupSelection => ({
            includeLawsuits: backupIncludeLawsuits,
            includeExecution: backupIncludeExecution,
            includeNotes: backupIncludeNotes,
            includeVault: backupIncludeVault,
            includeUrgent: backupIncludeUrgent,
            includeUndated: backupIncludeUndated,
            from: backupFrom,
            to: backupTo,
        }),
        [
            backupFrom,
            backupIncludeExecution,
            backupIncludeLawsuits,
            backupIncludeNotes,
            backupIncludeUndated,
            backupIncludeUrgent,
            backupIncludeVault,
            backupTo,
        ],
    );

    return {
        backupIncludeLawsuits,
        setBackupIncludeLawsuits,
        backupIncludeExecution,
        setBackupIncludeExecution,
        backupIncludeNotes,
        setBackupIncludeNotes,
        backupIncludeVault,
        setBackupIncludeVault,
        backupIncludeUrgent,
        setBackupIncludeUrgent,
        backupIncludeUndated,
        setBackupIncludeUndated,
        backupFrom,
        setBackupFrom,
        backupTo,
        setBackupTo,
        buildSelection,
    };
}
