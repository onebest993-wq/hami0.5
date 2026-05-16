import { isUrgentCaseClosed } from '@/app/components/lawyer/Component_Urgent_Card';
import { hydrateCase } from './hydrateCase';
import { applyIqrarArchiveMigration } from './migrateIqrarArchive';
import type { UrgentCase } from './types';

/** تحميل قائمة خام + ترحيل إقرار + إغلاق الحالات المنتهية */
export function normalizeLoadedCases(rawCases: unknown[]): UrgentCase[] {
    const hydrated = rawCases.map(hydrateCase).filter(Boolean) as UrgentCase[];
    return hydrated.map((c) => {
        const migrated = applyIqrarArchiveMigration(c);
        if (migrated.archived) return migrated;
        const closed = isUrgentCaseClosed(migrated);
        return closed ? { ...migrated, phase: 'completed' as const, status: 'completed' as const } : migrated;
    });
}
