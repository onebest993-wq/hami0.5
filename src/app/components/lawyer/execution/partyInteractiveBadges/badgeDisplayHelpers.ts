import type { ExecutionFile, SeizedAsset } from '@/app/types/execution';
import { buildSeizedAssetDetailLines } from '@/app/utils/seizedAssetDisplay';
import { isSeizureAssetEnforceableForBadge } from '@/app/components/lawyer/ExecutionDashboard/helpers/seizureUtils';
import type { TimelineLite } from './types';

export function formatDateAr(isoOrYmd: string | undefined | null): string {
    if (!isoOrYmd) return '—';
    const d = new Date(isoOrYmd);
    return Number.isNaN(d.getTime()) ? String(isoOrYmd) : d.toLocaleDateString('ar-IQ');
}

export function findTimelineDate(events: TimelineLite[] | undefined, needles: string[]): string {
    if (!events?.length) return '—';
    for (const e of events) {
        const t = `${e.title || ''} ${e.description || ''}`;
        if (needles.some((n) => t.includes(n))) {
            return formatDateAr(e.timestamp || e.date);
        }
    }
    return '—';
}

export function garnishmentOfficeAr(target: ExecutionFile['garnishment_target']): string {
    if (target === 'national_retirement_board') return 'الهيئة الوطنية للتقاعد';
    if (target === 'employer') return 'جهة عمل المدين';
    return '—';
}

export function isSeizedAssetActiveForBadge(a: SeizedAsset, decisionsExecutionId?: string): boolean {
    return isSeizureAssetEnforceableForBadge(a, decisionsExecutionId);
}

/** تفاصيل محجوز للشارة: تسميات عربية + تواريخ مقروءة */
export function linesForSeizedAssetPopover(a: SeizedAsset): { k: string; v: string }[] {
    const raw = buildSeizedAssetDetailLines(a);
    const prio = ['تاريخ الحجز', 'تاريخ المزايدة', 'سعر البيع', 'تاريخ فك الحجز', 'الوصف'];
    const sorted = [...raw].sort((x, y) => {
        const ix = prio.indexOf(x.k);
        const iy = prio.indexOf(y.k);
        return (ix === -1 ? 999 : ix) - (iy === -1 ? 999 : iy);
    });
    return sorted.map(({ k, v }) => ({
        k,
        v:
            k === 'تاريخ الحجز' || k === 'تاريخ المزايدة' || k === 'تاريخ فك الحجز'
                ? formatDateAr(v)
                : v,
    }));
}
