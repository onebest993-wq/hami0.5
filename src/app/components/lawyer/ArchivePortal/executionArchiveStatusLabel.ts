import type { DossierLifecycleStatus } from '@/app/types/execution/core';

/** تسمية حالة صف المخزن — بلا دفتر مالي ولا SecureStore. */
export function formatArchiveExecutionStatusLabel(status: string | undefined): string {
    const s = String(status || '').trim();
    if (!s || s === 'active') return '';
    if (s === 'paused') return 'موقوف';
    if (s === 'archived' || s === 'archived_stage') return 'مؤرشف';
    if (s === 'deleted') return 'محذوف';
    if (s.includes('متلكئ')) return 'متلكئ';
    if (s.includes('بانتظار')) return 'بانتظار';
    if (s.includes('منتهية') || s.includes('منجز')) return 'منتهية';
    return s;
}

/** شارة دورة الحياة — نفس ألوان لوحة الإضبارة، بلا استيراد لوحة التنفيذ. */
export function executionArchiveLifecycleBadgeClass(status: DossierLifecycleStatus): string {
    switch (status) {
        case 'active':
            return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
        case 'paused':
            return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-200';
        case 'suspended':
            return 'border-orange-500/30 bg-orange-500/10 text-orange-200';
        case 'finished':
            return 'border-slate-500/30 bg-slate-500/10 text-slate-300';
        default:
            return 'border-slate-500/30 bg-slate-500/10 text-slate-300';
    }
}
