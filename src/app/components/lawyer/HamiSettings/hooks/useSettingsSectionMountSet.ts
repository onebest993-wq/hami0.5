import { useMemo, useRef } from 'react';
import type { SettingsSectionId } from '@/app/services/settings';

/**
 * أثناء الفتح: القسم النشط + ما زُر يبقى mounted حتى الإغلاق.
 * أثناء الإغلاق (keepAlive): يبقى القسم النشط فقط — لا تُفرَّغ اللوحة.
 * (تفريغ كامل كان يترك قشرة التبويبات ظاهرة عبر snap بلا محتوى.)
 */
export function useSettingsSectionMountSet(activeSection: SettingsSectionId, overlayOpen = true) {
    const visitedRef = useRef<Set<SettingsSectionId> | null>(null);

    if (!overlayOpen) {
        visitedRef.current = new Set<SettingsSectionId>([activeSection]);
    } else if (!visitedRef.current || visitedRef.current.size === 0) {
        visitedRef.current = new Set<SettingsSectionId>([activeSection]);
    } else {
        visitedRef.current.add(activeSection);
    }

    return useMemo(
        () => new Set(visitedRef.current ?? [activeSection]),
        // overlayOpen مقصود — يضيّق للأصل النشط عند الإغلاق ويوسّع عند الزيارة
        [activeSection, overlayOpen],
    );
}
