import type { JudicialDecision } from '@/app/types/criminal';
import type {
    CriminalCase,
    InvestigationLog,
    LawyerRequest,
    OtherEvidenceItem,
    Statement,
} from './criminalStore';
import type { ProceduralContainer, ProceduralSubItem } from './proceduralContainersEngine';

export type ProceduralSubItemTrashSnapshot = {
    parentContainerId: string;
    item: ProceduralSubItem;
};

export type CriminalTrashItemKind =
    | 'statement'
    | 'lawyer_request'
    | 'investigation_log'
    | 'other_evidence'
    | 'procedural_container'
    | 'procedural_sub_item'
    | 'judicial_decision';

type CriminalTrashSnapshot =
    | Statement
    | LawyerRequest
    | InvestigationLog
    | OtherEvidenceItem
    | ProceduralContainer
    | ProceduralSubItemTrashSnapshot
    | JudicialDecision;

export type CriminalTrashItem = {
    id: string;
    kind: CriminalTrashItemKind;
    deletedAt: string;
    label: string;
    snapshot: CriminalTrashSnapshot;
};

export function criminalTrashItemKindLabel(kind: CriminalTrashItemKind): string {
    switch (kind) {
        case 'statement':
            return 'إفادة';
        case 'lawyer_request':
            return 'طلب / قرار';
        case 'investigation_log':
            return 'سجل تتبع';
        case 'other_evidence':
            return 'دليل إثبات';
        case 'procedural_container':
            return 'مسار تتبع';
        case 'procedural_sub_item':
            return 'عنصر مسار';
        case 'judicial_decision':
            return 'قرار قضائي';
        default:
            return 'عنصر';
    }
}

export function buildTrashLabel(kind: CriminalTrashItemKind, snapshot: CriminalTrashSnapshot): string {
    if (kind === 'statement') {
        const st = snapshot as Statement;
        const who = String(st.giverName ?? st.witnessName ?? '').trim() || 'إفادة';
        const date = String(st.date ?? '').trim();
        return `${who}${date ? ` — ${date}` : ''}`;
    }
    if (kind === 'lawyer_request') {
        const req = snapshot as LawyerRequest;
        const type = String(req.type ?? '').trim() || 'طلب';
        const date = String(req.requestDate ?? '').trim();
        return `${type}${date ? ` — ${date}` : ''}`;
    }
    if (kind === 'other_evidence') {
        const ev = snapshot as OtherEvidenceItem;
        const type = String(ev.evidenceType ?? '').trim() || 'دليل';
        const date = String(ev.attachmentDate ?? ev.createdAt ?? '').trim();
        return `${type}${date ? ` — ${date}` : ''}`;
    }
    if (kind === 'procedural_container') {
        const container = snapshot as ProceduralContainer;
        const title = String(container.title ?? '').trim() || 'مسار تتبع';
        return title;
    }
    if (kind === 'procedural_sub_item') {
        const wrapped = snapshot as ProceduralSubItemTrashSnapshot;
        const item = wrapped.item;
        if (item.type === 'container') {
            return String(item.container.title ?? '').trim() || 'حاوية فرعية';
        }
        return String(item.title ?? '').trim() || 'عنصر مسار';
    }
    if (kind === 'judicial_decision') {
        const decision = snapshot as JudicialDecision;
        const title = String(decision.title ?? '').trim() || 'قرار قضائي';
        const date = String(decision.issuedAt ?? '').trim();
        return `${title}${date ? ` — ${date}` : ''}`;
    }
    const log = snapshot as InvestigationLog;
    const title = String(log.title ?? '').trim() || 'سجل تتبع';
    const date = String(log.date ?? '').trim();
    return `${title}${date ? ` — ${date}` : ''}`;
}

const TRASH_KINDS = new Set<CriminalTrashItemKind>([
    'statement',
    'lawyer_request',
    'investigation_log',
    'other_evidence',
    'procedural_container',
    'procedural_sub_item',
    'judicial_decision',
]);

export function normalizeTrashBin(raw: unknown): CriminalTrashItem[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((item) => {
            const kind = (item as CriminalTrashItem)?.kind;
            if (!kind || !TRASH_KINDS.has(kind)) return null;
            const snapshot = (item as CriminalTrashItem).snapshot;
            if (!snapshot || typeof snapshot !== 'object') return null;
            const id = String((item as CriminalTrashItem).id ?? '').trim();
            if (!id) return null;
            const deletedAt =
                String((item as CriminalTrashItem).deletedAt ?? '').trim() ||
                new Date().toISOString().slice(0, 10);
            const label =
                String((item as CriminalTrashItem).label ?? '').trim() ||
                buildTrashLabel(kind, snapshot as CriminalTrashSnapshot);
            return { id, kind, deletedAt, label, snapshot: snapshot as CriminalTrashSnapshot } as CriminalTrashItem;
        })
        .filter(Boolean) as CriminalTrashItem[];
}
