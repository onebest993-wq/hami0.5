type RequestFilterId = 'all' | 'pending' | 'accepted' | 'rejected';

export type RequestKind = 'fast_track' | 'attachment';

export interface UnifiedRequestItem {
    kind: RequestKind;
    id: string;
    title: string;
    detail?: string;
    status?: string;
    statusTone: 'pending' | 'accepted' | 'rejected' | 'grievance' | 'attachment' | 'neutral';
}

function classifyStatusTone(status?: string, kind?: RequestKind): UnifiedRequestItem['statusTone'] {
    if (kind === 'attachment') return 'attachment';
    const s = String(status ?? '');
    if (s.includes('قيد الانتظار')) return 'pending';
    if (s.includes('موافقة') || s.includes('بالقبول')) return 'accepted';
    if (s.includes('بالرفض')) return 'rejected';
    if (s.includes('التظلم')) return 'grievance';
    return 'neutral';
}

export function buildUnifiedRequests(input: {
    petitions: Array<{ id: string; requestType?: string; subject?: string; status?: string; type?: string; reason?: string }>;
    attachments: Array<{ id: string; attachedProperty?: string; status?: string; legalBasis?: string }>;
}): UnifiedRequestItem[] {
    const fast = input.petitions.map((p) => {
        const status = p.status;
        const kind = 'fast_track' as const;
        return {
            kind,
            id: p.id,
            title: String(p.requestType || p.type || 'طلب مستعجل').trim(),
            detail: String(p.subject || p.reason || '').trim() || undefined,
            status,
            statusTone: classifyStatusTone(status, kind),
        };
    });

    const attach = input.attachments.map((a) => ({
        kind: 'attachment' as const,
        id: a.id,
        title: String(a.attachedProperty || 'حجز احتياطي').trim(),
        detail: String(a.legalBasis || '').trim() || undefined,
        status: a.status,
        statusTone: classifyStatusTone(a.status, 'attachment'),
    }));

    return [...fast, ...attach];
}

export function resolveRequestResultLabel(item: UnifiedRequestItem): string {
    if (item.kind === 'attachment') {
        return String(item.status ?? '').trim() || 'مسجّل';
    }
    if (item.statusTone === 'pending' || item.statusTone === 'neutral' || item.statusTone === 'grievance') {
        return 'فيما بعد';
    }
    if (item.statusTone === 'accepted') return 'قبول';
    if (item.statusTone === 'rejected') return 'رفض';
    return 'فيما بعد';
}

export function resolveRequestStatusChip(item: UnifiedRequestItem): string {
    if (item.kind === 'attachment') return 'حجز';
    if (item.statusTone === 'accepted') return 'قبول';
    if (item.statusTone === 'rejected') return 'رفض';
    return 'انتظار';
}

export function computeRequestStats(items: UnifiedRequestItem[]) {
    const petitions = items.filter((i) => i.kind === 'fast_track');
    return {
        total: items.length,
        pending: petitions.filter(
            (i) => i.statusTone === 'pending' || i.statusTone === 'neutral' || i.statusTone === 'grievance',
        ).length,
        accepted: petitions.filter((i) => i.statusTone === 'accepted').length,
        rejected: petitions.filter((i) => i.statusTone === 'rejected').length,
    };
}

export function filterRequests(items: UnifiedRequestItem[], filter: RequestFilterId, query: string): UnifiedRequestItem[] {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
        if (filter === 'pending' && item.statusTone !== 'pending' && item.statusTone !== 'neutral' && item.statusTone !== 'grievance') {
            return false;
        }
        if (filter === 'accepted' && item.statusTone !== 'accepted') return false;
        if (filter === 'rejected' && item.statusTone !== 'rejected') return false;
        if (!q) return true;
        const hay = `${item.title} ${item.detail ?? ''} ${item.status ?? ''}`.toLowerCase();
        return hay.includes(q);
    });
}

export function statusToneClasses(
    tone: UnifiedRequestItem['statusTone'],
    variant: 'civil' | 'pearl' = 'civil',
): string {
    if (variant === 'pearl' && tone === 'pending') {
        return 'bg-[#F5C6D0]/[0.14] text-[#FFD4DC] border-[#F0A8B4]/28 backdrop-blur-sm';
    }
    switch (tone) {
        case 'pending':
            return 'bg-blue-500/10 text-blue-300 border-blue-500/25';
        case 'accepted':
            return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25';
        case 'rejected':
            return 'bg-rose-500/10 text-rose-300 border-rose-500/25';
        case 'grievance':
            return 'bg-amber-500/10 text-amber-300 border-amber-500/25';
        case 'attachment':
            return 'bg-violet-500/10 text-violet-300 border-violet-500/25';
        default:
            return 'bg-white/[0.04] text-white/50 border-white/10';
    }
}
