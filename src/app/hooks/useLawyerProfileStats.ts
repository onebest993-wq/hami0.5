import { useEffect, useState } from 'react';
import { loadLawsuitFilesRaw } from '@/app/utils/lawsuitFilesStorage';
import { loadExecutionFilesRaw } from '@/app/utils/executionFilesStorage';
import { notesVault } from '@/app/data/NotesVault';

export type LawyerLiveStats = {
    lawsuitFiles: number;
    executionFiles: number;
    notes: number;
    experienceYears: number;
};

function countArray(raw: unknown): number {
    return Array.isArray(raw) ? raw.length : 0;
}

function resolveExperienceYears(practiceSinceYear?: number, accountCreatedAt?: string): number {
    const now = new Date().getFullYear();
    if (practiceSinceYear && practiceSinceYear > 1950 && practiceSinceYear <= now) {
        return Math.max(0, now - practiceSinceYear);
    }
    if (accountCreatedAt) {
        const created = new Date(accountCreatedAt);
        if (!Number.isNaN(created.getTime())) {
            return Math.max(0, now - created.getFullYear());
        }
    }
    return 0;
}

export function useLawyerProfileStats(
    userId: string,
    practiceSinceYear?: number,
    accountCreatedAt?: string,
): LawyerLiveStats {
    const [stats, setStats] = useState<LawyerLiveStats>({
        lawsuitFiles: 0,
        executionFiles: 0,
        notes: 0,
        experienceYears: 0,
    });

    useEffect(() => {
        if (!userId) return;
        notesVault.setUserScope(userId);
        const noteCount = notesVault.getNotes().length;

        setStats({
            lawsuitFiles: countArray(loadLawsuitFilesRaw()),
            executionFiles: countArray(loadExecutionFilesRaw()),
            notes: noteCount,
            experienceYears: resolveExperienceYears(practiceSinceYear, accountCreatedAt),
        });
    }, [userId, practiceSinceYear, accountCreatedAt]);

    return stats;
}
