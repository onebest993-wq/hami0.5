import { useMemo, useRef } from 'react';
import type { SettingsSectionId } from '@/app/services/settings';

/** أقسام زُرتها تبقى mounted (مخفية) — يمنع إعادة تحميل/chunk crash عند العودة للتبويب */
export function useSettingsSectionMountSet(activeSection: SettingsSectionId) {
    const visitedRef = useRef<Set<SettingsSectionId> | null>(null);
    if (!visitedRef.current) {
        visitedRef.current = new Set<SettingsSectionId>([activeSection]);
    } else {
        visitedRef.current.add(activeSection);
    }

    return useMemo(() => new Set(visitedRef.current), [activeSection]);
}
