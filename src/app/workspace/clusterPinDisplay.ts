import type { ClusterRelatedLink, WorkspacePinnedItem, WorkspacePinType } from './types';

export const CLUSTER_TYPE_LABEL: Record<WorkspacePinType, string> = {
    lawsuit: 'مدني',
    criminal: 'جزائي',
    execution: 'تنفيذ',
    transaction: 'معاملة ملف',
    threading: 'إداري',
    urgent: 'مستعجل',
    notepad: 'مفكرة',
    task: 'مهمة ميدان',
};

export const CLUSTER_MATCH_LABEL = {
    clientName: 'تطابق اسم الموكل',
    caseNumber: 'تطابق رقم القضية',
    both: 'موكل ورقم القضية',
} as const;

export type ClusterPinDisplayMeta = {
    sectionLabel: string;
    headline: string;
    clientLine: string;
    caseLine: string;
};

export function clusterPinDisplayMeta(
    pin: Pick<WorkspacePinnedItem, 'type' | 'title' | 'clientName' | 'caseNumber'>,
): ClusterPinDisplayMeta {
    const sectionLabel = CLUSTER_TYPE_LABEL[pin.type];
    const client = pin.clientName.trim();
    const caseNo = pin.caseNumber.trim();
    const headline = pin.title.trim() || sectionLabel;

    return {
        sectionLabel,
        headline,
        clientLine: client ? `الموكل: ${client}` : '',
        caseLine: caseNo ? `رقم القضية/الملف: ${caseNo}` : '',
    };
}

export function clusterLinkDisplayMeta(link: ClusterRelatedLink): {
    headline: string;
    detail: string;
    matchLabel: string;
} {
    const meta = clusterPinDisplayMeta(link);
    return {
        headline: meta.headline,
        detail: [meta.clientLine, meta.caseLine].filter(Boolean).join(' · '),
        matchLabel: CLUSTER_MATCH_LABEL[link.matchReason],
    };
}
